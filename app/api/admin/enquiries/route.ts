import { NextResponse } from 'next/server';
import type { EnquiryStatus } from '@prisma/client';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { listEnquiries } from '@/lib/repositories/enquiries';

const STATUSES: EnquiryStatus[] = ['UNREAD', 'READ', 'ARCHIVED'];

/**
 * GET /api/admin/enquiries?status=&cursor=&limit=
 *   -> `{ enquiries: EnquiryRecord[], nextCursor: string | null, unread: number }`
 *
 * Newest first. Each record carries a parsed `source` (`contact` | `academy` | null) and a
 * message with the source tag stripped back off.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  const params = new URL(request.url).searchParams;
  const statusParam = params.get('status')?.toUpperCase();
  const limitParam = Number(params.get('limit'));

  if (statusParam && !STATUSES.includes(statusParam as EnquiryStatus)) {
    return NextResponse.json(
      { error: `status must be one of ${STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const result = await listEnquiries({
      status: statusParam as EnquiryStatus | undefined,
      cursor: params.get('cursor') ?? undefined,
      limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] GET /api/admin/enquiries failed', error);
    return NextResponse.json({ error: 'Failed to load enquiries' }, { status: 500 });
  }
}
