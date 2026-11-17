import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { isMissingTable, notSetUpResponse } from '@/lib/admin/not-set-up';
import { getDraft, saveDraft, UnknownContentKeyError } from '@/lib/repositories/content';

/** GET /api/admin/content/[key] -> the whole block, draft and published. */
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  const { key } = await params;
  try {
    const block = await getDraft(decodeURIComponent(key));
    if (!block) return NextResponse.json({ error: 'Unknown content key' }, { status: 404 });
    return NextResponse.json(block);
  } catch (error) {
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] GET /api/admin/content/[key] failed', error);
    return NextResponse.json({ error: 'Failed to load block' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/content/[key] with `{ value }` -> saves the draft only.
 *
 * The live site is untouched until POST /api/admin/content/publish.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  const { key } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || !('value' in body)) {
    return NextResponse.json({ error: 'A value field is required' }, { status: 400 });
  }

  try {
    const block = await saveDraft(decodeURIComponent(key), (body as { value: unknown }).value);
    return NextResponse.json(block);
  } catch (error) {
    if (error instanceof UnknownContentKeyError) {
      return NextResponse.json({ error: 'Unknown content key' }, { status: 400 });
    }
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] PUT /api/admin/content/[key] failed', error);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}
