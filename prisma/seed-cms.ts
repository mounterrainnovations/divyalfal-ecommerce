/**
 * Idempotent CMS seed.
 *
 * Fills the six Phase 2 tables from what the storefront already has, so that when the public
 * site flips from `siteCopy` constants to published content (Phase 2 Task 14) it renders
 * identically and loses nothing:
 *
 *   - one `ContentBlock` per `siteCopy` leaf, keyed exactly as the committed snapshot keys it,
 *     `draft` and `published` both set to the same value;
 *   - seven `HomepageSection` rows in movement order;
 *   - a `MediaAsset` for every file `/api/slideshow` serves, plus every licensed sample under
 *     `public/samples/` (tagged `sample`), and a `Slide` per gallery file in served order;
 *   - `SiteSetting` rows for the contact details, the WhatsApp number and the SEO metadata.
 *
 * **Re-running is a no-op, and cannot clobber the client's edits.** Every write is an upsert on
 * the natural key with an EMPTY `update`, so an existing row is never touched. Rows that
 * already exist are not even sent to the database: the seed reads the keys that are there,
 * writes only the missing ones, and reports the rest as `skipped`. A second run therefore
 * performs reads only.
 *
 * Two models have no unique column to upsert on, so the seed gives its rows deterministic ids
 * (a UUID derived from the file path): `MediaAsset`, and `Slide`. The slides are also guarded as a
 * set by a `seed.gallery` marker written in the same transaction as the slides, so the gallery is
 * seeded all-or-nothing, and once seeded it is the client's to curate: a deleted or emptied
 * gallery is not recreated.
 *
 * Counts: 383 blocks (370 string leaves + 13 numeric leaves), 7 sections, 37 assets, 10 slides,
 * 9 settings (8 + the gallery marker).
 *
 * Image URLs are root-relative (`/samples/...`, `/slideshow/...`), which `next.config.ts` accepts
 * without a `remotePatterns` entry. Nothing is uploaded to storage: replacing a `sample`
 * asset in the admin media library is what puts a real photograph there later.
 *
 * Run it with `npm run seed:cms`, against the database `DATABASE_URL` names. It must only be
 * run under the cutover runbook, after the CMS migration has been deployed.
 */
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient, type BlockKind, type Prisma } from '@prisma/client';
import { flattenLeaves } from '../lib/content/flatten';
import { siteCopy } from '../lib/content/site-copy';

export interface SeedResult {
  created: number;
  skipped: number;
}

// ---------------------------------------------------------------------------------------------
// siteCopy -> ContentBlock
// ---------------------------------------------------------------------------------------------
// Keys come from `flattenLeaves` (lib/content/flatten.ts), the one flatten shared with the
// snapshot test, the rendered-coverage sweep and the storefront.

const IMAGE_VALUE = /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i;
const VIDEO_VALUE = /\.(webm|mp4|mov)(\?.*)?$/i;

function blockKind(key: string, value: string | number): BlockKind {
  if (typeof value === 'number') return 'NUMBER';
  const isUrl = value.startsWith('/') || /^https?:\/\//i.test(value);
  if (isUrl && VIDEO_VALUE.test(value)) return 'VIDEO';
  if (isUrl && IMAGE_VALUE.test(value)) return 'IMAGE';
  const field = key.split('.').pop()!.replace(/\[\d+\]$/, '');
  // `href`, and `ctaHref`-style fields.
  if (field === 'href' || /Href$/.test(field)) return 'LINK';
  return 'TEXT';
}

const stripIndex = (segment: string) => segment.replace(/\[\d+\]$/, '');

/** `home.testimonials[1].quote` -> page `home`, section `testimonials`. */
function pageAndSection(key: string): { page: string; section: string } {
  const parts = key.split('.');
  const page = stripIndex(parts[0]);
  if (parts.length >= 3) return { page, section: stripIndex(parts[1]) };
  // `page.field` leaves sit at page level; an indexed `page.list[0]` still belongs to its list.
  if (parts.length === 2 && /\[\d+\]$/.test(parts[1])) return { page, section: stripIndex(parts[1]) };
  return { page, section: 'general' };
}

function humanise(segment: string): string {
  const spaced = segment
    .replace(/\[(\d+)\]/g, (_, n: string) => ` ${Number(n) + 1}`)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const blockLabel = (key: string) => key.split('.').map(humanise).join(' / ');

// ---------------------------------------------------------------------------------------------
// Homepage sections, settings
// ---------------------------------------------------------------------------------------------

/** The seven movements of the homepage, top to bottom. */
const HOMEPAGE_SECTIONS = [
  { key: 'hero', label: 'Hero' },
  { key: 'categories', label: 'Categories' },
  { key: 'collection', label: 'Collection' },
  { key: 'shopByStyle', label: 'Shop by style' },
  { key: 'atelier', label: 'Atelier' },
  { key: 'inHerWords', label: 'In her words' },
  { key: 'close', label: 'Close' },
] as const;

/**
 * The root `<meta name="description">` is a literal in `app/layout.tsx` ("siteCopy holds no
 * site-level description"), so it is copied from there rather than invented. The seed test
 * reads layout.tsx and fails if the two drift.
 */
const ROOT_DESCRIPTION = 'Landing Page of Divyafal Boutique';

function settingsToSeed(): { key: string; value: Prisma.InputJsonValue }[] {
  const { contact } = siteCopy.footer;
  return [
    // wa.me wants digits only: the same derivation components/features/forms/whatsapp-enquiry.ts uses.
    { key: 'whatsapp', value: contact.phone.replace(/\D/g, '') },
    { key: 'contact.phone', value: contact.phone },
    { key: 'contact.phoneDisplay', value: contact.phoneDisplay },
    { key: 'contact.email', value: contact.email },
    { key: 'contact.address', value: contact.address },
    { key: 'contact.hours', value: [...siteCopy.contact.info.hours] },
    { key: 'seo.title', value: siteCopy.home.hero.wordmark },
    { key: 'seo.description', value: ROOT_DESCRIPTION },
  ];
}

// ---------------------------------------------------------------------------------------------
// Media: the gallery and the samples
// ---------------------------------------------------------------------------------------------

/** Written in the same transaction as the slides: "the gallery has been seeded". */
const GALLERY_MARKER = 'seed.gallery';

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

/** In the order `/api/slideshow` reads them: the real photographs, then the interim frames. */
const GALLERY_FOLDERS = ['slideshow', 'samples/atelier'] as const;
const GALLERY_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const SAMPLES_DIR = 'samples';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

interface AssetPlan {
  id: string;
  path: string; // relative to public/, e.g. "samples/hero/x.webp"
  url: string; // root-relative
  tags: string[];
  alt: string;
}

/** A UUID derived from a name (v5 layout, SHA-1), so the same file always gets the same id. */
function deterministicId(name: string): string {
  const bytes = createHash('sha1').update(`divyafal-cms-seed:${name}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function imageFilesIn(folder: string, required: boolean): Promise<string[]> {
  let names: string[];
  try {
    names = (await readdir(path.join(PUBLIC_DIR, folder), { withFileTypes: true }))
      .filter(entry => entry.isFile())
      .map(entry => entry.name);
  } catch (error) {
    // Same rule as the route: the real gallery folder is a hard failure, the samples are optional.
    if (required) throw error;
    return [];
  }
  return names
    .filter(name => GALLERY_EXTENSIONS.includes(path.extname(name).toLowerCase()))
    .sort();
}

/** "atelier-1-cloth-block-and-chalk" in `atelier/` -> "Cloth block and chalk". */
function sampleAlt(folder: string, file: string): string {
  const stem = path.basename(file, path.extname(file));
  const words = stem.replace(new RegExp(`^${folder}-(\\d+-)?`), '').replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function plan(relativePath: string, tags: string[], alt: string): AssetPlan {
  return { id: deterministicId(`media:${relativePath}`), path: relativePath, url: `/${relativePath}`, tags, alt };
}

async function planMedia(): Promise<{ assets: AssetPlan[]; slides: { id: string; asset: AssetPlan }[] }> {
  const byPath = new Map<string, AssetPlan>();

  // The sample imagery: every image one folder deep under public/samples, tagged `sample`.
  const sampleFolders = (await readdir(path.join(PUBLIC_DIR, SAMPLES_DIR), { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
  for (const folder of sampleFolders) {
    for (const file of await imageFilesIn(`${SAMPLES_DIR}/${folder}`, true)) {
      const relativePath = `${SAMPLES_DIR}/${folder}/${file}`;
      byPath.set(relativePath, plan(relativePath, ['sample', folder], sampleAlt(folder, file)));
    }
  }

  // The gallery, in served order. `public/slideshow` holds the owner's own photographs:
  // registered as they are (no alt text is invented for them), and not tagged `sample`.
  const slides: { id: string; asset: AssetPlan }[] = [];
  for (const folder of GALLERY_FOLDERS) {
    for (const file of await imageFilesIn(folder, folder === 'slideshow')) {
      const relativePath = `${folder}/${file}`;
      let asset = byPath.get(relativePath); // the atelier frames are samples already
      if (!asset) {
        asset = plan(relativePath, ['gallery'], '');
        byPath.set(relativePath, asset);
      }
      slides.push({ id: deterministicId(`slide:${relativePath}`), asset });
    }
  }

  return { assets: [...byPath.values()], slides };
}

// Width and height from the file header, so there is no image-library dependency.
export function imageSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length > 24 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === 'VP8L') {
      const bits = buf.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') {
      return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    }
    return null;
  }
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 10 && buf.toString('ascii', 0, 3) === 'GIF') {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xff) {
        i += 1; // fill byte
      } else if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
        i += 2; // standalone marker, no length
      } else if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      } else {
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  }
  return null;
}

async function assetData(asset: AssetPlan): Promise<Prisma.MediaAssetCreateInput> {
  const file = path.join(PUBLIC_DIR, asset.path);
  const [info, bytes] = await Promise.all([stat(file), readFile(file)]);
  const size = imageSize(bytes);
  return {
    id: asset.id,
    url: asset.url,
    path: asset.path,
    kind: 'IMAGE',
    alt: asset.alt,
    width: size?.width ?? null,
    height: size?.height ?? null,
    mimeType: MIME[path.extname(asset.path).toLowerCase()] ?? 'application/octet-stream',
    bytes: info.size,
    tags: asset.tags,
  };
}

// ---------------------------------------------------------------------------------------------
// The seed
// ---------------------------------------------------------------------------------------------

/** Run `task` over `items` a few at a time: the database is across a network, one round trip each. */
async function inChunks<T>(items: T[], task: (item: T) => Promise<unknown>, size = 8): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(task));
  }
}

/**
 * Seed the CMS tables. Safe to run repeatedly: a second run creates nothing and writes nothing.
 * Never touches the product catalogue.
 */
export async function seedCms(prisma: PrismaClient): Promise<SeedResult> {
  let created = 0;
  let skipped = 0;
  const tally = (planned: number, missing: number) => {
    created += missing;
    skipped += planned - missing;
  };

  // --- Site settings ---------------------------------------------------------------------
  const settings = settingsToSeed();
  const haveSettings = new Set((await prisma.siteSetting.findMany({ select: { key: true } })).map(r => r.key));
  const newSettings = settings.filter(s => !haveSettings.has(s.key));
  await inChunks(newSettings, s =>
    prisma.siteSetting.upsert({ where: { key: s.key }, create: s, update: {} })
  );
  tally(settings.length, newSettings.length);

  // --- Homepage sections -----------------------------------------------------------------
  const haveSections = new Set((await prisma.homepageSection.findMany({ select: { key: true } })).map(r => r.key));
  const sections = HOMEPAGE_SECTIONS.map((s, order) => ({ ...s, order }));
  const newSections = sections.filter(s => !haveSections.has(s.key));
  await inChunks(newSections, s =>
    prisma.homepageSection.upsert({
      where: { key: s.key },
      create: { key: s.key, label: s.label, order: s.order, visible: true, productIds: [] },
      update: {},
    })
  );
  tally(sections.length, newSections.length);

  // --- Content blocks: one per siteCopy leaf ---------------------------------------------
  // The shared flatten (lib/content/flatten.ts): the same keys as the snapshot, plus the 13
  // numeric leaves (prices, ratings) it cannot hold. 370 strings + 13 numbers = 383 blocks.
  const flat = flattenLeaves(siteCopy);
  const keys = Object.keys(flat);
  const haveBlocks = new Set((await prisma.contentBlock.findMany({ select: { key: true } })).map(r => r.key));
  const newKeys = keys.filter(key => !haveBlocks.has(key));
  await inChunks(newKeys, key =>
    prisma.contentBlock.upsert({
      where: { key },
      create: {
        key,
        ...pageAndSection(key),
        label: blockLabel(key),
        kind: blockKind(key, flat[key]),
        draft: flat[key],
        published: flat[key], // same value: the public site must not change when reads flip
      },
      update: {},
    })
  );
  tally(keys.length, newKeys.length);

  // --- Media assets (before slides: Slide.asset is onDelete Restrict) --------------------
  const { assets, slides } = await planMedia();
  const haveAssets = new Set(
    (await prisma.mediaAsset.findMany({ where: { id: { in: assets.map(a => a.id) } }, select: { id: true } })).map(
      r => r.id
    )
  );
  const newAssets = assets.filter(a => !haveAssets.has(a.id));
  await inChunks(newAssets, async asset => {
    const data = await assetData(asset);
    await prisma.mediaAsset.upsert({ where: { id: asset.id }, create: data, update: {} });
  });
  tally(assets.length, newAssets.length);

  // --- Slides ----------------------------------------------------------------------------
  // The gallery is seeded at most once. The slides and a completion marker are written in ONE
  // transaction, so either all of it exists or none of it does: a failure part-way rolls back
  // and the next run starts clean (no half-gallery to mistake for a finished one). Once the marker
  // exists the gallery is the client's to curate: a slide they delete, or a gallery they empty
  // on purpose, is never recreated. Slides already present without a marker (made by hand
  // before the seed ran) are treated the same way.
  const planned = slides.length + 1; // the slides and the marker
  const galleryDone = await prisma.siteSetting.findUnique({ where: { key: GALLERY_MARKER } });
  if (galleryDone || (await prisma.slide.count()) > 0) {
    tally(planned, 0);
  } else {
    await prisma.$transaction([
      ...slides.map(({ id, asset }, order) =>
        prisma.slide.upsert({
          where: { id },
          create: { id, assetId: asset.id, order, visible: true },
          update: {},
        })
      ),
      prisma.siteSetting.upsert({
        where: { key: GALLERY_MARKER },
        create: { key: GALLERY_MARKER, value: { seededAt: new Date().toISOString() } },
        update: {},
      }),
    ]);
    tally(planned, planned);
  }

  return { created, skipped };
}

// ---------------------------------------------------------------------------------------------
// CLI: `npm run seed:cms`
// ---------------------------------------------------------------------------------------------

async function main() {
  const prisma = new PrismaClient();
  try {
    const target = new URL(process.env.DATABASE_URL ?? '');
    console.log(`Seeding CMS content into ${target.hostname} (schema ${target.searchParams.get('schema') ?? 'public'})`);
    const result = await seedCms(prisma);
    console.log(`Done: ${result.created} created, ${result.skipped} already present.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && /[\\/]seed-cms\.(ts|js)$/.test(process.argv[1])) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
