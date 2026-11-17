// Edge-safe session verification. Imported by middleware.ts, which runs on the edge runtime
// where Node's `crypto` and `jsonwebtoken` are not available, and by lib/auth-guard.ts, so
// there is exactly ONE verifier in the codebase and the two enforcement layers cannot drift.
//
// Do not import `crypto`, `jsonwebtoken`, Prisma or Supabase from here (a test enforces it).
import { jwtVerify } from 'jose';

export const SESSION_COOKIE = 'auth-token';

export interface JWTPayload {
  email: string;
  role: 'admin';
  iat: number;
  exp: number;
}

/**
 * The signing secret, or null when it is not configured. There is deliberately no development
 * fallback: a secret compiled into the source is readable by anyone with the repository and
 * would let them forge an admin session on any deploy that forgot to set JWT_SECRET.
 */
export function readJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET;
  return secret ? secret : null;
}

/**
 * Verify a session token. Resolves to the payload, or null for ANY failure (missing secret,
 * malformed, wrong signature, wrong algorithm, expired, no expiry, not an admin). Never throws,
 * so callers fail closed and cannot distinguish (or leak) why a token was refused.
 */
export async function verifySessionToken(
  token: string | null | undefined
): Promise<JWTPayload | null> {
  if (!token) return null;
  const secret = readJwtSecret();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      // Only HS256 is ever issued (jsonwebtoken's default). Pinning it rejects `alg: none` and
      // algorithm-confusion variants.
      algorithms: ['HS256'],
      requiredClaims: ['exp'],
    });
    if (payload.role !== 'admin' || typeof payload.email !== 'string') return null;
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/** Read one cookie from a raw `Cookie` header, matching the name exactly. */
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      const value = part.slice(eq + 1).trim();
      return value || null;
    }
  }
  return null;
}
