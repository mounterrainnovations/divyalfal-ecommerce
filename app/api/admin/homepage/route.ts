import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { getSections, saveSections, type SectionInput } from '@/lib/repositories/homepage';

/** GET /api/admin/homepage -> `{ sections: HomepageSection[] }`, in display order. */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  try {
    return NextResponse.json({ sections: await getSections() });
  } catch (error) {
    console.error('[API] GET /api/admin/homepage failed', error);
    return NextResponse.json({ error: 'Failed to load sections' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/homepage with `{ sections: [{ key, order, visible, productIds }] }`
 *   -> `{ saved: string[], unknown: string[], revalidated: boolean }`
 *
 * `unknown` lists keys that name no section; they are not created. `revalidated: false` means
 * the rows are saved but a cached homepage may lag briefly.
 */
export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  let body: { sections?: unknown } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body?.sections)) {
    return NextResponse.json({ error: 'sections must be an array' }, { status: 400 });
  }

  const sections: SectionInput[] = [];
  for (const raw of body.sections as unknown[]) {
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Each section must be an object' }, { status: 400 });
    }
    const record = raw as Record<string, unknown>;
    if (typeof record.key !== 'string' || record.key.trim() === '') {
      return NextResponse.json({ error: 'Each section needs a key' }, { status: 400 });
    }
    if (typeof record.order !== 'number' || !Number.isFinite(record.order)) {
      return NextResponse.json(
        { error: `Section ${record.key} needs a numeric order` },
        { status: 400 }
      );
    }
    const productIds = Array.isArray(record.productIds)
      ? (record.productIds as unknown[]).filter((id): id is string => typeof id === 'string')
      : [];

    sections.push({
      key: record.key,
      order: Math.trunc(record.order),
      visible: record.visible !== false,
      productIds,
    });
  }

  try {
    return NextResponse.json(await saveSections(sections));
  } catch (error) {
    console.error('[API] PUT /api/admin/homepage failed', error);
    return NextResponse.json({ error: 'Failed to save sections' }, { status: 500 });
  }
}
