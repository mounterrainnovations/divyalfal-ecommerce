import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  CHART_CATEGORIES,
  DEFAULT_SIZE_CHARTS,
  SIZE_CHARTS_KEY,
  chartForCategory,
  chartHasRows,
  parseSizeCharts,
  type SizeChart,
} from '@/lib/content/size-charts';

/**
 * The database half of the shop's size charts.
 *
 * WHY THE SPLIT. The types, the parser and the resolution rule are pure and are imported by
 * client code on the public site (`lib/hooks/useSizeCharts.ts`, the "Size guide" dialog), so
 * they live in `lib/content/size-charts.ts` — a module with no `@prisma/client` import.
 * Everything that talks to the database lives here. Without the split, importing the parser
 * into a `'use client'` component would pull the Prisma client into the browser bundle.
 *
 * One row, one key: `showcase.sizeCharts` in `SiteSetting`. No `SizeChart` table, and not
 * because one would be wrong in the abstract — because adding it means a migration against a
 * live shop's database for an ordered list of short documents nothing joins to.
 */

export type { SizeChart };
export {
  CHART_CATEGORIES,
  DEFAULT_SIZE_CHARTS,
  SIZE_CHARTS_KEY,
  chartForCategory,
  chartHasRows,
  parseSizeCharts,
};

/** Every size chart the shop has written, in the owner's order. Empty until they write one. */
export async function readSizeCharts(): Promise<SizeChart[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: SIZE_CHARTS_KEY } });
  const parsed = parseSizeCharts(row ? row.value : null);
  return parsed ?? DEFAULT_SIZE_CHARTS;
}

/**
 * Replace the chart list wholesale.
 *
 * Wholesale rather than per-chart because the list is ordered and short — the screen sends what
 * the owner is looking at and there is no merge to get wrong. The value is re-parsed before it
 * is stored, so the column can only ever hold charts that satisfy the parser: rows are already
 * the width of their columns, slugs are already unique, and no unknown category has survived.
 * A later read therefore cannot discover something the writer let through.
 */
export async function saveSizeCharts(value: unknown): Promise<SizeChart[]> {
  const charts = parseSizeCharts(value);
  if (!charts) throw new TypeError('Expected an array of size charts');

  await prisma.siteSetting.upsert({
    where: { key: SIZE_CHARTS_KEY },
    create: { key: SIZE_CHARTS_KEY, value: charts as unknown as Prisma.InputJsonValue },
    update: { value: charts as unknown as Prisma.InputJsonValue },
  });
  return charts;
}
