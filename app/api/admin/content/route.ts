import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { isMissingTable, notSetUpResponse } from '@/lib/admin/not-set-up';
import { listBlocks } from '@/lib/repositories/content';

/**
 * GET /api/admin/content?page= -> `{ blocks: ContentBlockRecord[], pages: string[] }`
 *
 * Every block, draft and published, ordered page -> section -> key. `page` narrows it to one
 * page; `pages` is always the full list, so the Content screen can offer every page while
 * loading one page's blocks.
 *
 * The repository has had `listBlocks` since Task 4 and nothing could call it: the editor
 * cannot ask for 383 blocks one key at a time, and it has to group them by page and section
 * before it can draw a single heading. Writes stay per-key (`PUT /api/admin/content/[key]`)
 * and publishing stays explicit.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  const page = new URL(request.url).searchParams.get('page') ?? undefined;

  try {
    const all = await listBlocks();
    const pages = [...new Set(all.map(block => block.page))];
    return NextResponse.json({
      blocks: page ? all.filter(block => block.page === page) : all,
      pages,
    });
  } catch (error) {
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] GET /api/admin/content failed', error);
    return NextResponse.json({ error: 'Failed to load content blocks' }, { status: 500 });
  }
}
