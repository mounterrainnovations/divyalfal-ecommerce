import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { isMissingTable, notSetUpResponse } from '@/lib/admin/not-set-up';
import { readCollections, saveCollections } from '@/lib/repositories/collections';

/**
 * The portal's end of the collections list.
 *
 * GET /api/admin/collections -> `{ collections, products }`
 * PUT /api/admin/collections with `{ collections }` -> `{ collections }`, as stored
 *
 * WHY THE CATALOGUE COMES WITH THE GET. The screen cannot do its two jobs without it. The
 * product picker needs a name and a thumbnail per garment to be pickable at all, and the count
 * beside each collection has to be the number of garments that *still exist* — `productIds` is
 * a JSON array, not a foreign key, so a collection can name a garment that has since been
 * deleted and nothing in the database would say so. Both facts come from the same list, and
 * sending it here saves the screen a second round trip before it can render anything useful.
 *
 * THE CATALOGUE IS NOT PAGED, DELIBERATELY. A picker that can only see the first hundred
 * garments cannot curate a collection out of the hundred and first, and a count computed from
 * a truncated list would quietly under-report every collection. Five scalar columns for a
 * boutique's whole catalogue is a cheap query; a wrong count on a screen whose entire purpose
 * is curation is not.
 */

interface PickerProduct {
  id: string;
  name: string;
  /** The first photograph, or '' where the garment has none. The picker draws an empty frame. */
  image: string;
  price: number;
  category: string;
}

async function readCatalogue(): Promise<PickerProduct[]> {
  const rows = await prisma.product.findMany({
    select: { id: true, name: true, photos: true, price: true, category: true },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    image: row.photos[0] ?? '',
    // `Decimal` does not survive JSON, and the picker only ever shows the number.
    price: Number(row.price),
    category: row.category,
  }));
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  try {
    const collections = await readCollections();

    /*
     * Read after the collections and not in parallel with them: the catalogue is a different
     * table with a different failure mode, and losing it should not lose the list the screen
     * is actually for. Without a catalogue the screen can still rename, reorder, re-photograph
     * and hide collections — it simply cannot pick garments, and it says so.
     */
    let products: PickerProduct[] = [];
    try {
      products = await readCatalogue();
    } catch (error) {
      console.error('[API] GET /api/admin/collections could not read the catalogue:', error);
    }

    return NextResponse.json({ collections, products });
  } catch (error) {
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] GET /api/admin/collections failed', error);
    return NextResponse.json({ error: 'Failed to load the collections' }, { status: 500 });
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

  const patch = body as { collections?: unknown };
  if (patch.collections === undefined) {
    return NextResponse.json({ error: 'Nothing to save: expected `collections`' }, { status: 400 });
  }

  try {
    // The response is what was *stored*, not what was sent: the parser allocates slugs and
    // de-duplicates them, so the screen has to adopt the saved list to show the owner the URL
    // their collection actually has.
    const collections = await saveCollections(patch.collections);
    return NextResponse.json({ collections });
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] PUT /api/admin/collections failed', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
