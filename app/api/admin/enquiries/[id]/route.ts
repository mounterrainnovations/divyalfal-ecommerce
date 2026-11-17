import { NextResponse } from 'next/server';
import type { EnquiryStatus } from '@prisma/client';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { EnquiryNotFoundError, setEnquiryStatus } from '@/lib/repositories/enquiries';

const STATUSES: EnquiryStatus[] = ['UNREAD', 'READ', 'ARCHIVED'];

/**
 * PATCH /api/admin/enquiries/[id] with `{ status: 'UNREAD' | 'READ' | 'ARCHIVED' }`
 *   -> the updated record.
 *
 * Status is the only mutable field: an enquiry is what a visitor wrote, so nothing here edits
 * it. There is no DELETE — archiving is how one leaves the list.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;
  let body: { status?: unknown } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const status = typeof body?.status === 'string' ? body.status.toUpperCase() : '';
  if (!STATUSES.includes(status as EnquiryStatus)) {
    return NextResponse.json(
      { error: `status must be one of ${STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(await setEnquiryStatus(id, status as EnquiryStatus));
  } catch (error) {
    if (error instanceof EnquiryNotFoundError) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 });
    }
    console.error('[API] PATCH /api/admin/enquiries/[id] failed', error);
    return NextResponse.json({ error: 'Failed to update enquiry' }, { status: 500 });
  }
}
