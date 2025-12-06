import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'crypto';

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

export interface JWTPayload {
  email: string;
  role: 'admin';
  iat: number;
  exp: number;
}

// Get JWT secret from environment or use development fallback
function getJWTSecret(): string {
  return process.env.JWT_SECRET || 'divyafal-development-secret-2024';
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

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJWTSecret()) as JWTPayload;
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
