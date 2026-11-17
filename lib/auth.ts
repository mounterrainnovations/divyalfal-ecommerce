import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'crypto';
import { readJwtSecret, type JWTPayload } from '@/lib/auth-verify';

export type { JWTPayload };

// Get admin credentials from environment variables with validation
function getAdminCredentials() {
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Admin credentials not configured. Please set EMAIL and PASSWORD environment variables.'
    );
  }

  return { email, password };
}

// The signing secret comes from the environment ONLY. There is no development fallback: a
// secret compiled into the source is readable by anyone with the repository and would let them
// forge an admin session on any deploy that forgot to set JWT_SECRET.
function getJWTSecret(): string {
  const secret = readJwtSecret();
  if (!secret) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return secret;
}

// Generate JWT token for admin
export function generateToken(email: string): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    email,
    role: 'admin',
  };

  return jwt.sign(payload, getJWTSecret(), {
    expiresIn: '24h',
  });
}

// Verify JWT token (Node runtime only). Request enforcement does NOT use this: middleware.ts and
// requireAdmin share the edge-safe verifier in lib/auth-verify.ts. Kept for the existing API.
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJWTSecret(), { algorithms: ['HS256'] }) as JWTPayload;
  } catch {
    return null;
  }
}

// Authenticate admin credentials with secure comparison
export function authenticateAdmin(email: string, password: string): boolean {
  try {
    const credentials = getAdminCredentials();

    // Case-insensitive email comparison
    if (email.toLowerCase() !== credentials.email.toLowerCase()) {
      return false;
    }

    // Timing-safe password comparison to prevent timing attacks
    const providedPassword = Buffer.from(password, 'utf8');
    const storedPassword = Buffer.from(credentials.password, 'utf8');

    // Check lengths first (timing-safe)
    if (providedPassword.length !== storedPassword.length) {
      return false;
    }

    // Use timing-safe comparison
    return timingSafeEqual(providedPassword, storedPassword);
  } catch (error) {
    // If credentials are not configured, authentication fails
    console.error(
      'Authentication error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return false;
  }
}

// Extract token from Authorization header
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}
