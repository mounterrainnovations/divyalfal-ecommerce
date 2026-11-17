/**
 * A fixed-window rate limit held in process memory.
 *
 * **It is per-instance.** On serverless each cold start gets its own empty map, and two
 * concurrent instances count separately, so a determined flooder can exceed the limit by a
 * factor of however many instances are warm. That is accepted deliberately: this site takes
 * roughly twenty enquiries a month, the thing being prevented is an accidental double-submit
 * and a bored visitor with a Submit button, and the alternative is a hosted store the project
 * has ruled out. If enquiry spam ever becomes real, this is the seam to replace.
 *
 * The window is fixed rather than sliding: the simplest thing that cannot leak memory, since an
 * expired entry is overwritten on the next hit and swept periodically.
 */

export interface RateLimitResult {
  ok: boolean;
  /** Requests left in this window. */
  remaining: number;
  /** When the current window ends, epoch ms. */
  resetAt: number;
}

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

/** Entries are swept when the map grows, so a long-lived instance cannot accumulate IPs. */
const SWEEP_THRESHOLD = 1000;

function sweep(now: number) {
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (buckets.size > SWEEP_THRESHOLD) sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const window = { count: 1, resetAt: now + windowMs };
    buckets.set(key, window);
    return { ok: true, remaining: limit - 1, resetAt: window.resetAt };
  }

  existing.count += 1;
  const remaining = Math.max(limit - existing.count, 0);
  return { ok: existing.count <= limit, remaining, resetAt: existing.resetAt };
}

/** Test seam. Never called in production. */
export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * The client IP, as far as it can be known behind a proxy. `x-forwarded-for` is a list the edge
 * appends to, so the first entry is the client; it is spoofable, which is another reason this
 * limit is a courtesy and not a security control.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}
