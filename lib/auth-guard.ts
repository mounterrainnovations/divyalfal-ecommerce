import { readCookie, SESSION_COOKIE, verifySessionToken, type JWTPayload } from '@/lib/auth-verify';

export type { JWTPayload };

/** Thrown for every refusal. The message is fixed so no failure mode is distinguishable. */
export class UnauthorizedError extends Error {
  readonly status = 401;

  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

/**
 * Require a valid admin session. Call it as the FIRST statement of every admin route handler:
 * middleware is the first layer, this is the second, and a handler must not depend on the
 * matcher being right.
 *
 * Resolves to the verified payload; throws UnauthorizedError (and nothing else) when the
 * session cookie is absent, malformed, tampered with, expired or not an admin's.
 */
export async function requireAdmin(request: Request): Promise<JWTPayload> {
  const token = readCookie(request.headers.get('cookie'), SESSION_COOKIE);
  const payload = await verifySessionToken(token);
  if (!payload) throw new UnauthorizedError();
  return payload;
}

/** The one 401 every admin surface returns: bare, cacheless, nothing to learn from it. */
export function unauthorizedResponse(): Response {
  return Response.json(
    { error: 'Unauthorized' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } }
  );
}
