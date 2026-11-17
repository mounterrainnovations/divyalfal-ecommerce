import { NextResponse } from 'next/server';
import { getPublishedContent } from '@/lib/repositories/content';

/**
 * GET /api/content?page=home
 *
 * Public. Published content for one page, keyed by `ContentBlock.key`. Blocks that have never
 * been published are absent, so a consumer falls back to its Phase 1 `siteCopy` value.
 *
 * The read itself is cached under `content:${page}` and dropped by a publish.
 */
export async function GET(request: Request) {
  const page = new URL(request.url).searchParams.get('page');
  if (!page) {
    return NextResponse.json({ error: 'A page parameter is required' }, { status: 400 });
  }

  try {
    const content = await getPublishedContent(page);
    return NextResponse.json({ page, content });
  } catch (error) {
    // No content reads as "nothing published", which lands every consumer on its Phase 1
    // `siteCopy` fallback -- a page in the words it shipped with. A 500 here would instead take
    // the page down over a database that is merely unreachable (and, until the CMS migration is
    // applied to production, simply has no `ContentBlock` table). `degraded` says which it was,
    // so nothing has to guess from an empty object.
    console.error('[API] GET /api/content failed; serving no content', error);
    return NextResponse.json({ page, content: {}, degraded: true });
  }
}
