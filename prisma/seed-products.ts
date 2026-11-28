/**
 * Product catalogue seed.
 *
 * The live `Product` table held two rows: one with no photographs at all, and one named
 * `Test - Silk Saree 1` whose specification read "Great / for / testing" and whose photograph
 * was a neon cityscape. A storefront built for a couture house cannot be judged on that, and
 * neither can the client judge the design through it — every rail fell back to placeholder
 * tiles, so the whole site read as empty.
 *
 * This seed adds a full catalogue drawn from the photography the repository already carries:
 * `public/mostrec`, `public/collection`, `public/shop-by-style` and `public/categories`.
 * Garments on models, front and back where a back view exists, across all six categories, so
 * every rail, filter and grid on the site has something real to render.
 *
 * **Nothing is deleted.** The first version of this seed emptied the table and was stopped by
 * `OrderItem_productId_fkey`: the same database still carries the previous application's
 * commerce tables, and it holds 8 `Order` rows, 11 `OrderItem` rows, 5 `Payment` rows and 3
 * `Profile` rows. All eleven order items point at the product named `Test - Silk Saree 1`.
 * Dropping that row would orphan real payment history, so the two rows already in the table
 * are repaired in place instead — same ids, same prices, so every foreign key and every
 * recorded order survives. Only the name, category, photographs and specification change.
 *
 * **The catalogue entries are demonstration products, not the client's inventory.** Names,
 * prices and specifications are written to be plausible for the house's range; they are not a
 * price list. They exist so the site can be reviewed at a realistic fill level and so the
 * client has something to edit in the admin rather than a blank table. Removing them again is
 * one command, and it only ever touches rows this seed created and nothing references:
 *
 *     npm run seed:products -- --clear
 *
 * Every run takes a JSON backup of the whole table first, into `prisma/backups/`.
 *
 *     npm run seed:products            # back up, repair the two rows, add the catalogue
 *     npm run seed:products -- --dry   # print what would happen, touch nothing
 *     npm run seed:products -- --clear # back up, then remove only the catalogue rows
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient, type ProductType } from '@prisma/client';

export interface SeedProduct {
  name: string;
  category: ProductType;
  price: number;
  salePrice?: number;
  photos: string[];
  specifications: string;
}

/** Paragraph helper, so the stored HTML matches what the admin's rich-text editor emits. */
function spec(...paragraphs: string[]): string {
  return paragraphs.map(p => `<p>${p}</p>`).join('');
}

const CARE =
  '<strong>Care</strong> — dry clean only. Store folded in muslin, away from direct sunlight.';

const MADE = '<strong>Made in Bhopal</strong> · Divyafal atelier · Alpa Rawal';

export const CATALOGUE: SeedProduct[] = [
  // --- public/mostrec ---------------------------------------------------------------------
  // `/mostrec/1.png` is not here: it is the photograph given to the existing `Midnight Silk
  // Saree` row by REPAIRS below, which had no photographs at all.
  {
    name: 'Midnight Navy and Gold Tiered Lehenga',
    category: 'LEHENGA',
    price: 62000,
    salePrice: 49500,
    photos: ['/mostrec/2.png'],
    specifications: spec(
      '<strong>Sequinned navy choli with a tiered gold skirt</strong>',
      'A hand-embellished navy choli in matte sequin, paired with a layered skirt in antique gold. The tiers are cut on the bias so the skirt holds its volume without weight.',
      'Includes choli, skirt and a sheer organza dupatta. A reception and sangeet piece.',
      CARE,
      MADE
    ),
  },
  {
    name: 'Ivory Chanderi Kurta Set',
    category: 'KURTA_PANT',
    price: 12500,
    photos: ['/mostrec/3.png'],
    specifications: spec(
      '<strong>Hand-woven Chanderi with a gold tissue border</strong>',
      'An ivory straight-cut kurta in Chanderi cotton-silk, finished with a fine gold tissue border at the hem and sleeve. Light enough for daytime wear, formal enough for a ceremony.',
      'Three-piece set: kurta, straight pants and dupatta.',
      CARE,
      MADE
    ),
  },
  {
    name: 'Rajwadi Printed Lehenga Set',
    category: 'LEHENGA',
    price: 48000,
    photos: ['/mostrec/4.png'],
    specifications: spec(
      '<strong>Hand block print on silk, in the Rajwadi palette</strong>',
      'Deep red and forest green block print across a full-flare silk skirt, with a coordinated printed choli. The border is woven rather than attached, so the pattern runs unbroken around the hem.',
      'Includes choli, skirt and dupatta.',
      CARE,
      MADE
    ),
  },

  // --- public/collection (front and back) -------------------------------------------------
  {
    name: 'Haldi and Kumkum Panelled Lehenga',
    category: 'INDO_WESTERN',
    price: 32000,
    photos: ['/collection/1.png', '/collection/1b.png'],
    specifications: spec(
      '<strong>Auspicious elegance in every thread</strong>',
      'Draped in the sacred hues of haldi and kumkum — a panelled skirt that alternates turmeric gold and deep vermilion, worn with a mirror-and-thread embroidered crop choli.',
      'The panels are cut individually and joined by hand, so no two skirts fall identically.',
      CARE,
      MADE
    ),
  },
  {
    name: 'The Rajwadi Brocade Lehenga',
    category: 'LEHENGA',
    price: 54000,
    photos: ['/collection/2.png', '/collection/2b.png'],
    specifications: spec(
      '<strong>Rajwadi — royal — in a magnificent woven brocade</strong>',
      'An aubergine brocade skirt woven with gold medallions, paired with a textured choli in the same family. The weave is dense enough to hold a sculptural flare without crinoline.',
      'Includes choli, skirt and dupatta.',
      CARE,
      MADE
    ),
  },
  {
    name: 'Neelam Frill Lehenga',
    category: 'LEHENGA',
    price: 58000,
    photos: ['/collection/3.png', '/collection/3b.png'],
    specifications: spec(
      '<strong>Sapphire above, cascade below</strong>',
      'Neelam for the rich sapphire choli, hand-worked in sequin and bead; frill for the modern layered skirt in champagne tissue that falls in soft, deliberate tiers.',
      'Includes choli, skirt and a matching dupatta.',
      CARE,
      MADE
    ),
  },
  {
    name: 'Emerald Floral Anarkali',
    category: 'SUIT',
    price: 26500,
    salePrice: 21000,
    photos: ['/collection/4.png', '/collection/4b.png'],
    specifications: spec(
      '<strong>Full-flare anarkali in emerald georgette</strong>',
      'A floor-length anarkali in deep emerald, scattered with fine resham floral embroidery. The flare is built from twenty-four panels, which is what gives it the even fall.',
      'Includes the anarkali, inner lining and churidar.',
      CARE,
      MADE
    ),
  },

  // --- public/shop-by-style (front and back) ----------------------------------------------
  {
    name: 'Raw Silk Off White Printed with Sequence Detailing',
    category: 'KURTA_PANT',
    price: 9800,
    photos: ['/shop-by-style/f1.png', '/shop-by-style/b1.png'],
    specifications: spec(
      '<strong>Raw silk, printed, with sequin detailing</strong>',
      'An off-white raw silk kurta carrying a fine all-over print, lifted with scattered sequin work at the yoke and hem. A side slit keeps it easy to move in.',
      'Sold as kurta and pants.',
      CARE,
      MADE
    ),
  },
  {
    name: 'Pure Cotton Block Print Ajragh Bagh',
    category: 'SUIT',
    price: 11200,
    photos: ['/shop-by-style/f2.png', '/shop-by-style/b2.png'],
    specifications: spec(
      '<strong>Ajrakh block print on pure cotton</strong>',
      'Traditional Ajrakh resist-printing in indigo and madder, with contrast printed sleeves and placket. Every length is printed by hand, washed and sun-dried, so the colour settles slightly differently each time.',
      'Three-piece set: kurta, pants and dupatta.',
      CARE,
      MADE
    ),
  },
  {
    name: 'Banarasi Anarkali Suit',
    category: 'SUIT',
    price: 22000,
    photos: ['/shop-by-style/f3.png', '/shop-by-style/b3.png'],
    specifications: spec(
      '<strong>Coral Banarasi with a woven gold hem</strong>',
      'A coral anarkali in Banarasi silk, finished with a broad woven gold border at the hem and cuff. The colour is dyed in small lots, which is what keeps it from reading flat.',
      'Includes the anarkali, churidar and dupatta.',
      CARE,
      MADE
    ),
  },
  {
    name: 'Peach and Off White Banarasi Angrakha Anarkali',
    category: 'SUIT',
    price: 24500,
    photos: ['/shop-by-style/f4.png', '/shop-by-style/b4.png'],
    specifications: spec(
      '<strong>Angrakha silhouette in peach and off white</strong>',
      'A side-tie angrakha in soft peach, printed with an off-white boota and bordered in woven gold. The overlap is cut so it sits flat rather than bunching at the tie.',
      'Includes the anarkali, churidar and dupatta.',
      CARE,
      MADE
    ),
  },

  // --- public/categories ------------------------------------------------------------------
  {
    name: 'Ivory Crop Top with Red Sharara',
    category: 'WESTERN',
    price: 14500,
    photos: ['/categories/western.png'],
    specifications: spec(
      '<strong>Knotted ivory top with a flared red sharara</strong>',
      'A clean ivory crop with a front knot, worn with a deep rose sharara that flares from the knee and is finished with a fine gold piping.',
      'Sold as a two-piece set.',
      CARE,
      MADE
    ),
  },
  {
    name: 'Ochre Indo-Western Pleated Set',
    category: 'INDO_WESTERN',
    price: 19500,
    photos: ['/categories/indo_western.jpg'],
    specifications: spec(
      '<strong>Ochre jacket-blouse over a pleated multicoloured skirt</strong>',
      'A structured ochre top with bell sleeves worn over a knife-pleated skirt that carries a banded multicoloured border. Indo-western in the proper sense — the cut is contemporary, the textile is not.',
      'Sold as a two-piece set.',
      CARE,
      MADE
    ),
  },
];

// -------------------------------------------------------------------------------------------

/**
 * The two rows already in the live table, repaired rather than replaced.
 *
 * `match` is the name as it stands in the database today — including the trailing space on
 * `Midnight Silk Saree `, which is part of the stored value and is the reason the row is
 * matched on the exact string rather than trimmed.
 *
 * Price and sale price are deliberately absent from every patch. `Test - Silk Saree 1` is the
 * product all eleven `OrderItem` rows were placed against; changing what it costs would make
 * the recorded orders disagree with the catalogue they were bought from.
 */
export interface ProductRepair {
  match: string;
  name: string;
  category: ProductType;
  photos: string[];
  specifications?: string;
}

export const REPAIRS: ProductRepair[] = [
  {
    // The test record: real order and payment history hangs off this id, so it is dressed
    // rather than dropped. Its neon-cityscape photograph is what the client was looking at.
    match: 'Test - Silk Saree 1',
    name: 'Banarasi Red Silk Saree',
    category: 'SAREE',
    photos: ['/categories/saree.jpg'],
    specifications: spec(
      '<strong>Pure Banarasi silk with a woven zari border</strong>',
      'A deep madder red handloom saree, woven on pit looms with a traditional zari border and a contrasting pallu. The body carries fine buti work throughout — texture at a distance, detail up close.',
      'Comes with an unstitched blouse piece in matching silk. Suited to weddings, receptions and festive evenings.',
      CARE,
      MADE
    ),
  },
  {
    // Had a real specification already and no photograph at all, so only the stray trailing
    // space in the name and the missing image are corrected. The description is left alone.
    match: 'Midnight Silk Saree ',
    name: 'Midnight Silk Saree',
    category: 'SAREE',
    photos: ['/mostrec/1.png'],
  },
];

export interface ProductSeedResult {
  backedUp: number;
  repaired: number;
  created: number;
  skipped: number;
  removed: number;
  backupPath: string | null;
}

/**
 * Backs the table up, then repairs the rows named in REPAIRS and creates any CATALOGUE entry
 * that is not already there, all inside one transaction. The backup is written before the
 * transaction opens, because a file write cannot be rolled back with the rows.
 *
 * Re-running is safe: a catalogue entry whose name already exists is skipped untouched, and a
 * repair whose `match` name is gone — because it has already been applied — matches nothing.
 * So a second run writes nothing, and a product the client has since edited is never reverted.
 *
 * With `clear`, the catalogue rows are removed again, and only those: a row that an
 * `OrderItem` points at is left alone rather than deleted, which is the constraint that forced
 * this whole design.
 */
export async function seedProducts(
  prisma: PrismaClient,
  options: { clear?: boolean; dryRun?: boolean; backupDir?: string } = {}
): Promise<ProductSeedResult> {
  const { clear = false, dryRun = false } = options;
  const backupDir = options.backupDir ?? path.join(process.cwd(), 'prisma', 'backups');

  const existing = await prisma.product.findMany({ orderBy: { createdAt: 'asc' } });
  const names = new Set(existing.map(p => p.name));
  const catalogueNames = new Set(CATALOGUE.map(c => c.name));

  const toRepair = REPAIRS.filter(r => names.has(r.match));
  const toCreate = clear ? [] : CATALOGUE.filter(c => !names.has(c.name));
  const clearable = clear ? existing.filter(p => catalogueNames.has(p.name)) : [];

  if (dryRun) {
    return {
      backedUp: existing.length,
      repaired: toRepair.length,
      created: toCreate.length,
      skipped: CATALOGUE.length - toCreate.length - clearable.length,
      removed: clearable.length,
      backupPath: null,
    };
  }

  let backupPath: string | null = null;
  if (existing.length > 0) {
    await mkdir(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    backupPath = path.join(backupDir, `products-${stamp}.json`);
    await writeFile(
      backupPath,
      JSON.stringify(existing, (_key, value) => (typeof value === 'bigint' ? String(value) : value), 2),
      'utf8'
    );
  }

  return prisma.$transaction(async tx => {
    let repaired = 0;
    for (const patch of toRepair) {
      const result = await tx.product.updateMany({
        where: { name: patch.match },
        data: {
          name: patch.name,
          category: patch.category,
          photos: patch.photos,
          ...(patch.specifications ? { specifications: patch.specifications } : {}),
        },
      });
      repaired += result.count;
    }

    let created = 0;
    for (const item of toCreate) {
      await tx.product.create({
        data: {
          name: item.name,
          category: item.category,
          price: item.price,
          sale: item.salePrice !== undefined,
          salePrice: item.salePrice ?? null,
          photos: item.photos,
          specifications: item.specifications,
        },
      });
      created += 1;
    }

    let removed = 0;
    for (const row of clearable) {
      removed += (await tx.product.deleteMany({ where: { id: row.id } })).count;
    }

    return {
      backedUp: existing.length,
      repaired,
      created,
      skipped: CATALOGUE.length - toCreate.length - clearable.length,
      removed,
      backupPath,
    };
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const clear = argv.includes('--clear');
  const dryRun = argv.includes('--dry') || argv.includes('--dry-run');

  const prisma = new PrismaClient();
  try {
    const result = await seedProducts(prisma, { clear, dryRun });
    if (dryRun) {
      console.log(
        `[dry run] back up ${result.backedUp} · repair ${result.repaired} · create ${result.created} · ` +
          `skip ${result.skipped} · remove ${result.removed}. Nothing was written.`
      );
    } else {
      console.log(
        `Backed up ${result.backedUp} row(s) -> ${result.backupPath ?? '(table was empty)'}\n` +
          `Repaired ${result.repaired} · created ${result.created} · skipped ${result.skipped} · removed ${result.removed}.`
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Only run when invoked directly, so the tests can import CATALOGUE without hitting a database.
if (process.argv[1] && process.argv[1].includes('seed-products')) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
