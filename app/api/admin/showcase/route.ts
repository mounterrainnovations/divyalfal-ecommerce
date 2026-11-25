import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { isMissingTable, notSetUpResponse } from '@/lib/admin/not-set-up';
import {
  readCategoryTiles,
  readTestimonials,
  saveCategoryTiles,
  saveTestimonials,
} from '@/lib/repositories/showcase';
import type { ProductType } from '@/types';

/**
 * The portal's end of the two homepage lists that used to live in source.
 *
 * GET  /api/admin/showcase -> `{ testimonials, categories, counts }`
 * PUT  /api/admin/showcase with `{ testimonials }` and/or `{ categories }` -> the saved lists
 *
 * `counts` is how many products each category actually holds, which is the number that tells
 * an owner whether a tile is worth showing. It is grouped in one query rather than counted per
 * tile, and a failure there is not fatal: the screen can still edit pictures without it.
 *
 * A PUT may carry either list or both. Each is validated and written independently, so a bad
 * testimonial cannot stop a category edit from landing — the response says what was saved.
 */

async function countByCategory(): Promise<Record<string, number>> {
  const rows = await prisma.product.groupBy({ by: ['category'], _count: { _all: true } });
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.category as ProductType] = row._count._all;
  return counts;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  try {
    const [testimonials, categories] = await Promise.all([
      readTestimonials(),
      readCategoryTiles(),
    ]);

    // Not in the Promise.all above: the catalogue is a different table with a different
    // failure mode, and losing the counts should not lose the lists.
    let counts: Record<string, number> = {};
    try {
      counts = await countByCategory();
    } catch (error) {
      console.error('[API] GET /api/admin/showcase could not count products:', error);
    }

    return NextResponse.json({ testimonials, categories, counts });
  } catch (error) {
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] GET /api/admin/showcase failed', error);
    return NextResponse.json({ error: 'Failed to load the homepage lists' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected an object' }, { status: 400 });
  }

  const patch = body as { testimonials?: unknown; categories?: unknown };
  if (patch.testimonials === undefined && patch.categories === undefined) {
    return NextResponse.json(
      { error: 'Nothing to save: expected `testimonials`, `categories`, or both' },
      { status: 400 }
    );
  }

  try {
    const saved: Record<string, unknown> = {};
    if (patch.testimonials !== undefined) {
      saved.testimonials = await saveTestimonials(patch.testimonials);
    }
    if (patch.categories !== undefined) {
      saved.categories = await saveCategoryTiles(patch.categories);
    }
    return NextResponse.json(saved);
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] PUT /api/admin/showcase failed', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
