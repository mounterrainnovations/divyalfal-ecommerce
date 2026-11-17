import { NextResponse } from 'next/server';
import {
  createEnquiry,
  EnquiryValidationError,
  MESSAGE_MAX_LENGTH,
  type EnquirySource,
} from '@/lib/repositories/enquiries';
import { clientIp, rateLimit } from '@/lib/utils/rate-limit';

/**
 * POST /api/enquiries — public.
 *
 * Body: `{ name, email?, phone?, message, source? }` where `source` is `contact` | `academy`.
 * -> 201 `{ id, received: true }`, 400 `{ error, field }`, 413, or 429.
 *
 * Five submissions per ten minutes per IP. The window is in process memory, so it is
 * per-instance — see `lib/utils/rate-limit.ts` for why that is the right trade here.
 */
export const RATE_LIMIT = 5;
export const RATE_WINDOW_MS = 10 * 60 * 1000;

/**
 * The largest body worth reading. `MESSAGE_MAX_LENGTH` plus generous room for the other fields
 * and JSON punctuation: anything bigger cannot be a valid enquiry, so it is refused on its
 * declared length and, failing that, on its actual length — before it is parsed and long before
 * anything reaches the database.
 */
const BODY_MAX_BYTES = MESSAGE_MAX_LENGTH + 4096;

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = rateLimit(`enquiry:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > BODY_MAX_BYTES) {
    return NextResponse.json({ error: 'That enquiry is too large.' }, { status: 413 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: 'Could not read the request body.' }, { status: 400 });
  }

  // A body with no (or a lying) content-length is caught here, still before parsing.
  if (raw.length > BODY_MAX_BYTES) {
    return NextResponse.json({ error: 'That enquiry is too large.' }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const asString = (value: unknown) => (typeof value === 'string' ? value : '');

  try {
    const enquiry = await createEnquiry({
      name: asString(body.name),
      email: asString(body.email),
      phone: asString(body.phone),
      message: asString(body.message),
      source: asString(body.source) as EnquirySource,
    });
    return NextResponse.json({ id: enquiry.id, received: true }, { status: 201 });
  } catch (error) {
    if (error instanceof EnquiryValidationError) {
      return NextResponse.json({ error: error.message, field: error.field }, { status: 400 });
    }
    console.error('[API] POST /api/enquiries failed', error);
    return NextResponse.json({ error: 'Could not save that enquiry.' }, { status: 500 });
  }
}
