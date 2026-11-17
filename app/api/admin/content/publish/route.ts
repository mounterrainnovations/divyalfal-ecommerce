import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { publish } from '@/lib/repositories/content';

/**
 * POST /api/admin/content/publish with `{ keys: string[] }`.
 *
 * -> `{ published: string[], revalidated: boolean }`. `revalidated: false` means the rows are
 * live in the database but a cached page may still serve the old value for a short while; it is
 * not a failure and the keys in `published` were written either way.
 */
export async function POST(request: Request) {
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

  const keys = (body as { keys?: unknown } | null)?.keys;
  if (!Array.isArray(keys) || keys.some(key => typeof key !== 'string')) {
    return NextResponse.json({ error: 'keys must be an array of strings' }, { status: 400 });
  }

  try {
    const result = await publish(keys as string[]);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] POST /api/admin/content/publish failed', error);
    return NextResponse.json({ error: 'Publish failed' }, { status: 500 });
  }
}
