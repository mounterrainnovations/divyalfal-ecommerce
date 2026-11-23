// @vitest-environment node
//
// The CMS seed runs once against the client's live database, under a runbook, and may be run
// twice. These tests pin the three things that make that safe: a first run creates, a second
// run is a provable no-op, and nothing the client has edited since can be overwritten.
//
// RUN WITH `npm run test:seed` (excluded from the default `npm test`; see vitest.seed.config.ts).
// Needs DIRECT_URL and network access; writes to the cms_scratch schema only.
//
// SAFETY: this file talks to a real Postgres. The repo's `.env` points at the client's
// PRODUCTION project, so every statement here is confined to the `cms_scratch` schema:
//
//   1. `scratchUrl()` takes DIRECT_URL (process.env, else `.env`), forces `?schema=cms_scratch`
//      and drops every other query parameter. Prisma turns `schema=` into the connection's
//      search_path, so unqualified table names resolve there and nowhere else.
//   2. The URL is passed to `new PrismaClient({ datasourceUrl })` AND written over
//      process.env.DATABASE_URL / DIRECT_URL, so even a client built elsewhere in this process
//      lands in scratch.
//   3. `beforeAll` asks the server `SELECT current_schema()` and throws unless it answers
//      `cms_scratch`. Nothing is written before that check passes; if the schema is missing
//      the suite fails rather than falling back to anything else.
//
// The scratch schema holds the six CMS tables only (Task 1). `public` does not contain them
// until the Task 15 cutover, so a stray write to `public` would fail with "relation does not exist".
import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { GET as slideshowGET } from '@/app/api/slideshow/route';
import { siteCopy } from '@/lib/content/site-copy';
import { flattenLeaves } from '@/lib/content/flatten';
import { seedCms, type SeedResult } from './seed-cms';

// Every test crosses the network to a hosted Postgres; the default 5s is for unit tests.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const ROOT = path.resolve(__dirname, '..');
const SCRATCH_SCHEMA = 'cms_scratch';
const SUPABASE_HOST = 'duwwgyobnpuqsqdromzj.supabase.co';
// 370 string leaves (what site-copy.test.ts asserts) + 13 numeric leaves (prices, ratings) = 383.
// Task 14 must assert 383 blocks against the database, not 370.
const LEAF_COUNT = 383;
const SEVEN_SECTIONS = ['hero', 'categories', 'collection', 'shopByStyle', 'atelier', 'inHerWords', 'close'];

function readEnvFile(name: string): string | undefined {
  try {
    const text = readFileSync(path.join(ROOT, '.env'), 'utf8');
    const match = text.match(new RegExp(`^${name}\\s*=\\s*(.*)$`, 'm'));
    return match?.[1].trim().replace(/^["']|["']$/g, '');
  } catch {
    return undefined;
  }
}

function scratchUrl(): string {
  const base = process.env.DIRECT_URL ?? readEnvFile('DIRECT_URL');
  if (!base) throw new Error('DIRECT_URL is not set: cannot reach the cms_scratch schema.');
  const url = new URL(base);
  url.search = ''; // drop pgbouncer / connection_limit etc.; only the schema matters here
  url.searchParams.set('schema', SCRATCH_SCHEMA);
  return url.toString();
}

const url = scratchUrl();
process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;
const prisma = new PrismaClient({ datasourceUrl: url });

async function assertScratch(): Promise<void> {
  const rows = await prisma.$queryRaw<{ s: string | null }[]>`SELECT current_schema() AS s`;
  if (rows[0]?.s !== SCRATCH_SCHEMA) {
    throw new Error(`Refusing to run: connected schema is ${String(rows[0]?.s)}, not ${SCRATCH_SCHEMA}.`);
  }
}

async function wipe(): Promise<void> {
  await assertScratch();
  await prisma.slide.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.contentBlock.deleteMany();
  await prisma.homepageSection.deleteMany();
  await prisma.siteSetting.deleteMany();
}

async function filesIn(folder: string): Promise<string[]> {
  const entries = await readdir(path.join(ROOT, 'public', folder), { withFileTypes: true });
  return entries.filter(e => e.isFile()).map(e => e.name);
}

async function sampleFilesOnDisk(): Promise<string[]> {
  const out: string[] = [];
  const dirs = await readdir(path.join(ROOT, 'public', 'samples'), { withFileTypes: true });
  for (const dir of dirs.filter(d => d.isDirectory())) {
    for (const file of await filesIn(`samples/${dir.name}`)) out.push(`/samples/${dir.name}/${file}`);
  }
  return out.sort();
}

beforeAll(async () => {
  await assertScratch();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('seed target safety', () => {
  it('is connected to the scratch schema, not public', async () => {
    await assertScratch();
    expect(new URL(url).searchParams.get('schema')).toBe(SCRATCH_SCHEMA);
    expect(process.env.DATABASE_URL).toBe(url);
  });
});

// One real first run, from empty tables, shared by the read-only tests below: every seed is
// ~400 round trips to a hosted database, so seeding per test would make this file take minutes.
// The tests that change rows put them back (see `reseedFromEmpty`) so they stay order-independent.
describe('seedCms against the scratch schema', () => {
  const productAccess: string[] = [];
  const spy = new Proxy(prisma, {
    get(target, prop) {
      if (typeof prop === 'string' && /^product$/i.test(prop)) productAccess.push(prop);
      return Reflect.get(target, prop, target);
    },
  });
  let first: SeedResult;
  let productAccessDuringFirstRun: string[];

  beforeAll(async () => {
    await wipe();
    first = await seedCms(spy);
    productAccessDuringFirstRun = [...productAccess];
  });

  // Leave the scratch schema empty, as Task 1 left it.
  afterAll(async () => {
    await wipe();
  });

  // Put the gallery back as the seed would have it (slides and marker), touching nothing else.
  async function reseedGallery() {
    await prisma.slide.deleteMany();
    await prisma.siteSetting.deleteMany({ where: { key: 'seed.gallery' } });
    await seedCms(prisma);
  }

  // Review Focus #1
  it('creates a block per site-copy leaf on first run', async () => {
    expect(await prisma.contentBlock.count()).toBe(LEAF_COUNT);
    const total =
      (await prisma.contentBlock.count()) +
      (await prisma.homepageSection.count()) +
      (await prisma.mediaAsset.count()) +
      (await prisma.slide.count()) +
      (await prisma.siteSetting.count());
    expect(first.created).toBe(total);
    expect(first.skipped).toBe(0);
  });

  it('stores every leaf verbatim, with draft and published the same value', async () => {
    const flat = flattenLeaves(siteCopy);
    const blocks = await prisma.contentBlock.findMany();
    expect(blocks).toHaveLength(LEAF_COUNT);
    for (const block of blocks) {
      expect(block.draft, block.key).toBe(flat[block.key]);
      expect(block.published, block.key).toBe(flat[block.key]);
      expect(block.label.length, block.key).toBeGreaterThan(0);
      expect(block.page.length, block.key).toBeGreaterThan(0);
      expect(block.section.length, block.key).toBeGreaterThan(0);
    }
    // The deliberate bidi marks and no-break spaces survive the round trip: U+202A, U+00A0, U+202C.
    const LRE = String.fromCharCode(0x202a);
    const PDF = String.fromCharCode(0x202c);
    const NBSP = String.fromCharCode(0x00a0);
    const phone = blocks.find(b => b.key === 'footer.contact.phoneDisplay');
    expect(phone!.published).toBe(`${LRE}+91${NBSP}99770${NBSP}57045${PDF}`);
    const apostrophe = blocks.find(b => b.key === 'home.testimonials[1].quote');
    expect(apostrophe!.published).toBe(siteCopy.home.testimonials[1].quote);
    // Numbers stay numbers (a price is not the string "10999").
    const price = blocks.find(b => b.key === 'home.recommended.bestSellers[0].price');
    expect(price!.published).toBe(10999);
  });

  it('files media, links and numbers under their own kinds', async () => {
    const kind = async (key: string) => (await prisma.contentBlock.findUnique({ where: { key } }))!.kind;
    expect(await kind('home.hero.desktopImage')).toBe('IMAGE');
    expect(await kind('home.hero.mobileVideo')).toBe('VIDEO');
    expect(await kind('home.hero.wordmark')).toBe('TEXT');
    expect(await kind('nav.items[0].href')).toBe('LINK');
    expect(await kind('home.explore.ctaHref')).toBe('LINK');
    expect(await kind('home.about.body')).toBe('TEXT');
    expect(await kind('home.recommended.bestSellers[0].price')).toBe('NUMBER');
  });

  it('seeds the seven homepage sections in movement order', async () => {
    const sections = await prisma.homepageSection.findMany({ orderBy: { order: 'asc' } });
    expect(sections.map(s => s.key)).toEqual(SEVEN_SECTIONS);
    expect(sections.every(s => s.visible && s.productIds.length === 0)).toBe(true);
  });

  it('orders the gallery slides as /api/slideshow serves them today', async () => {
    const slides = await prisma.slide.findMany({ orderBy: { order: 'asc' }, include: { asset: true } });
    const served: string[] = (await (await slideshowGET()).json()).images;

    const slideUrls = slides.map(s => s.asset.url);
    expect(slideUrls).toHaveLength(10);
    // Same set as the route. (Within a folder the route's order is whatever readdir returns;
    // the seed fixes it to sorted, which is what readdir returns on this platform.)
    expect([...slideUrls].sort()).toEqual([...served].sort());
    // The real photographs first, then the interim frames, each folder in name order.
    const folderOf = (u: string) => (u.startsWith('/slideshow/') ? 0 : 1);
    expect(slideUrls.map(folderOf)).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 1, 1]);
    expect(slideUrls.slice(0, 7)).toEqual([...slideUrls.slice(0, 7)].sort());
    expect(slideUrls.slice(7)).toEqual([...slideUrls.slice(7)].sort());
    expect(slideUrls).toEqual(served);
    expect(slides.every(s => s.visible)).toBe(true);
    expect(new Set(slides.map(s => s.order)).size).toBe(10);
  });

  it('registers every sample file as a root-relative asset tagged sample', async () => {
    const onDisk = await sampleFilesOnDisk();
    expect(onDisk).toHaveLength(30);

    const samples = await prisma.mediaAsset.findMany({ where: { tags: { has: 'sample' } } });
    expect(samples.map(a => a.url).sort()).toEqual(onDisk);
    for (const asset of samples) {
      expect(asset.url, asset.url).toMatch(/^\/samples\//);
      expect(asset.path).toBe(asset.url.slice(1));
      expect(asset.kind).toBe('IMAGE');
      expect(asset.mimeType).toBe('image/webp');
      expect(asset.bytes).toBeGreaterThan(0);
      expect(asset.width).toBeGreaterThan(0);
      expect(asset.height).toBeGreaterThan(0);
    }
  });

  it('keeps every stored URL root-relative or on the whitelisted storage host', async () => {
    const assets = await prisma.mediaAsset.findMany();
    expect(assets).toHaveLength(37);
    for (const asset of assets) {
      const ok = asset.url.startsWith('/') || new URL(asset.url).hostname === SUPABASE_HOST;
      expect(ok, asset.url).toBe(true);
    }
    // The owner's own photographs are registered as they are, and are not marked as samples.
    const owner = assets.filter(a => a.url.startsWith('/slideshow/'));
    expect(owner).toHaveLength(7);
    expect(owner.every(a => !a.tags.includes('sample'))).toBe(true);
  });

  it('records the real dimensions of the registered files', async () => {
    // The header reader was checked against sharp's metadata for all 37 files when this was
    // written; the JPEG and WebP paths are pinned here without taking sharp as a dependency.
    const size = async (rel: string) => {
      const asset = await prisma.mediaAsset.findFirst({ where: { path: rel } });
      return { width: asset!.width, height: asset!.height };
    };
    expect(await size('slideshow/dmw-17.jpg')).toEqual({ width: 5000, height: 4000 });
    expect(await size('slideshow/fallback.jpg')).toEqual({ width: 5704, height: 3803 });
    expect(await size('samples/hero/hero-golden-warp-on-the-loom.webp')).toEqual({ width: 3200, height: 1900 });
  });

  it('registers every local image that a content block points at', async () => {
    // Not just the samples: the storefront points at public/categories, public/collection,
    // public/shop-by-style and public/testimonials too, and an image the library does not
    // know about is an image the client cannot replace from the portal.
    const urls = new Set((await prisma.mediaAsset.findMany()).map(a => a.url));
    const imageBlocks = await prisma.contentBlock.findMany({ where: { kind: 'IMAGE' } });
    const localPointers = imageBlocks.filter(b => String(b.published).startsWith('/'));
    expect(localPointers.length).toBeGreaterThan(0);
    for (const block of localPointers) expect(urls.has(String(block.published)), block.key).toBe(true);
  });

  it('seeds contact, WhatsApp and SEO settings from the values siteCopy already holds', async () => {
    const settings = Object.fromEntries((await prisma.siteSetting.findMany()).map(s => [s.key, s.value]));
    expect(settings.whatsapp).toBe(siteCopy.footer.contact.phone.replace(/\D/g, ''));
    expect(settings['contact.phone']).toBe(siteCopy.footer.contact.phone);
    expect(settings['contact.phoneDisplay']).toBe(siteCopy.footer.contact.phoneDisplay);
    expect(settings['contact.email']).toBe(siteCopy.footer.contact.email);
    expect(settings['contact.address']).toBe(siteCopy.footer.contact.address);
    expect(settings['contact.hours']).toEqual(siteCopy.contact.info.hours);
    expect(settings['seo.title']).toBe(siteCopy.home.hero.wordmark);

    // The root description is a literal in app/layout.tsx, not in siteCopy; if it moves or
    // changes, the seed's copy of it must follow.
    const layout = readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8');
    expect(layout).toContain(`description: '${String(settings['seo.description'])}'`);
  });

  it('never reads or writes the Product table', async () => {
    // The whole first run went through the spy.
    expect(productAccessDuringFirstRun).toEqual([]);

    // Positive control: the spy does see an access, so an empty list means something.
    void spy.product;
    expect(productAccess).toEqual(['product']);
    productAccess.length = 0;

    await seedCms(spy);
    expect(productAccess).toEqual([]);

    // And the source never names it, outside comments.
    const source = readFileSync(path.join(__dirname, 'seed-cms.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(source).not.toMatch(/\bproduct\b/i);
  });

  it('is a no-op on a second run', async () => {
    const snapshot = async () => ({
      blocks: await prisma.contentBlock.findMany({ orderBy: { key: 'asc' } }),
      sections: await prisma.homepageSection.findMany({ orderBy: { key: 'asc' } }),
      settings: await prisma.siteSetting.findMany({ orderBy: { key: 'asc' } }),
      assets: await prisma.mediaAsset.findMany({ orderBy: { id: 'asc' } }),
      slides: await prisma.slide.findMany({ orderBy: { id: 'asc' } }),
    });
    const before = await snapshot();

    const second = await seedCms(prisma);
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(first.created);

    // Not just the counters: no row was written (so no @updatedAt moved) and nothing duplicated.
    expect(await snapshot()).toEqual(before);
    expect(before.blocks).toHaveLength(LEAF_COUNT);
    expect(before.sections).toHaveLength(7);
    expect(before.assets).toHaveLength(37);
    expect(before.slides).toHaveLength(10);
  });

  it('never overwrites a published value the client has edited', async () => {
    await prisma.contentBlock.update({
      where: { key: 'home.about.body' },
      data: { published: 'edited by client', draft: 'a newer draft' },
    });
    const result = await seedCms(prisma);
    expect(result.created).toBe(0);
    const block = await prisma.contentBlock.findUnique({ where: { key: 'home.about.body' } });
    expect(block!.published).toBe('edited by client');
    expect(block!.draft).toBe('a newer draft');

    // Restore the seeded value for the tests that follow.
    const body = siteCopy.home.about.body;
    await prisma.contentBlock.update({ where: { key: 'home.about.body' }, data: { published: body, draft: body } });
  });

  it('never overwrites a section, setting or slide the client has changed, nor revives a deleted slide', async () => {
    await prisma.homepageSection.update({
      where: { key: 'collection' },
      data: { visible: false, productIds: ['p1', 'p2'], label: 'Our Edit' },
    });
    await prisma.siteSetting.update({ where: { key: 'whatsapp' }, data: { value: '910000000000' } });
    const slides = await prisma.slide.findMany({ orderBy: { order: 'asc' } });
    await prisma.slide.update({ where: { id: slides[0].id }, data: { visible: false, order: 99 } });
    await prisma.slide.delete({ where: { id: slides[1].id } });

    try {
      const result = await seedCms(prisma);
      expect(result.created).toBe(0);

      const section = await prisma.homepageSection.findUnique({ where: { key: 'collection' } });
      expect(section).toMatchObject({ visible: false, productIds: ['p1', 'p2'], label: 'Our Edit' });
      expect((await prisma.siteSetting.findUnique({ where: { key: 'whatsapp' } }))!.value).toBe('910000000000');
      expect(await prisma.slide.count()).toBe(9);
      expect(await prisma.slide.findUnique({ where: { id: slides[0].id } })).toMatchObject({
        visible: false,
        order: 99,
      });
    } finally {
      await prisma.homepageSection.update({
        where: { key: 'collection' },
        data: { visible: true, productIds: [], label: 'Collection' },
      });
      await prisma.siteSetting.update({
        where: { key: 'whatsapp' },
        data: { value: siteCopy.footer.contact.phone.replace(/\D/g, '') },
      });
      await reseedGallery();
    }
  });

  it('does not revive a gallery the client emptied on purpose', async () => {
    await prisma.slide.deleteMany();
    try {
      const result = await seedCms(prisma);
      expect(result.created).toBe(0);
      expect(await prisma.slide.count()).toBe(0);
    } finally {
      await reseedGallery();
    }
  });

  it('rolls the gallery back as a unit when a slide fails part-way, then recovers on the next run', async () => {
    await prisma.slide.deleteMany();
    await prisma.siteSetting.deleteMany({ where: { key: 'seed.gallery' } });

    // The tenth slide points at an asset that does not exist: a real foreign-key failure
    // inside the real transaction.
    let calls = 0;
    const failing = new Proxy(prisma, {
      get(target, prop) {
        const value = Reflect.get(target, prop, target);
        if (prop === 'slide') {
          return {
            ...value,
            upsert: (args: {
              where: { id: string };
              create: { id: string; assetId: string; order: number; visible: boolean };
              update: Record<string, never>;
            }) => {
              calls += 1;
              const create = calls === 10 ? { ...args.create, assetId: 'missing-asset' } : args.create;
              return prisma.slide.upsert({ where: args.where, create, update: args.update });
            },
          };
        }
        return typeof value === 'function' && String(prop).startsWith('$') ? value.bind(target) : value;
      },
    });

    try {
      await expect(seedCms(failing)).rejects.toThrow();
      expect(calls).toBe(10);
      // Nothing of the gallery survived: not nine slides, not the marker.
      expect(await prisma.slide.count()).toBe(0);
      expect(await prisma.siteSetting.findUnique({ where: { key: 'seed.gallery' } })).toBeNull();

      // So the next run is not mistaken for a finished one, and completes the gallery.
      const retry = await seedCms(prisma);
      expect(retry.created).toBe(11);
      expect(await prisma.slide.count()).toBe(10);
      expect(await prisma.siteSetting.findUnique({ where: { key: 'seed.gallery' } })).not.toBeNull();
    } finally {
      await reseedGallery();
    }
  });
});
