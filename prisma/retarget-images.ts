/**
 * Re-points CMS image blocks that still name a retired placeholder.
 *
 * `seed-cms.ts` copied `siteCopy` into `ContentBlock` rows once, and every write it makes is an
 * upsert with an empty `update` — deliberately, so re-running the seed can never clobber an
 * edit the client has made. The consequence is that when an image path changes in
 * `site-copy.ts`, the already-seeded row keeps the old value. The storefront does not notice,
 * because it still renders from the `siteCopy` constants; but the admin's Content screen reads
 * the rows, so the client would be shown — and would be editing — the retired photograph.
 *
 * This is the one-off that fixes that, for the swap from the interim `public/samples/` imagery
 * to the house's own garment photography.
 *
 * **It only touches rows that still hold a `/samples/...` value**, and only when the current
 * `siteCopy` value for the same key is a different local path. A block the client has already
 * re-pointed at an uploaded photograph is left exactly as it is, because such a value does not
 * start with `/samples/`. Draft and published are moved together, so nothing lands half-changed
 * and no unintended draft is created for the client to publish.
 *
 *     npx tsx prisma/retarget-images.ts --dry   # list what would move
 *     npx tsx prisma/retarget-images.ts         # move it
 */
import { PrismaClient } from '@prisma/client';
import { flattenLeaves } from '../lib/content/flatten';
import { siteCopy } from '../lib/content/site-copy';

const RETIRED = '/samples/';

export interface Retarget {
  key: string;
  from: string;
  to: string;
}

/** Every block key whose stored value is a retired sample and whose copy value has moved on. */
export async function planRetargets(prisma: PrismaClient): Promise<Retarget[]> {
  const current = new Map<string, string>();
  for (const [key, value] of Object.entries(flattenLeaves(siteCopy))) {
    if (typeof value === 'string') current.set(key, value);
  }

  const blocks = await prisma.contentBlock.findMany({ where: { kind: 'IMAGE' } });
  const plans: Retarget[] = [];
  for (const block of blocks) {
    const stored = String(block.published ?? '');
    if (!stored.startsWith(RETIRED)) continue;
    const wanted = current.get(block.key);
    if (!wanted || !wanted.startsWith('/') || wanted === stored) continue;
    plans.push({ key: block.key, from: stored, to: wanted });
  }
  return plans;
}

export async function retargetImages(
  prisma: PrismaClient,
  options: { dryRun?: boolean } = {}
): Promise<Retarget[]> {
  const plans = await planRetargets(prisma);
  if (options.dryRun || plans.length === 0) return plans;

  await prisma.$transaction(
    plans.map(plan =>
      prisma.contentBlock.update({
        where: { key: plan.key },
        data: { draft: plan.to, published: plan.to },
      })
    )
  );
  return plans;
}

async function main() {
  const dryRun = process.argv.includes('--dry') || process.argv.includes('--dry-run');
  const prisma = new PrismaClient();
  try {
    const plans = await retargetImages(prisma, { dryRun });
    for (const plan of plans) console.log(`${plan.key}\n  ${plan.from}\n  -> ${plan.to}`);
    console.log(
      plans.length === 0
        ? 'Nothing to re-point: no image block still names a retired sample.'
        : `${plans.length} block(s) ${dryRun ? 'would be' : 'were'} re-pointed.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && process.argv[1].includes('retarget-images')) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
