// @vitest-environment node
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { generateToken } from '@/lib/auth';
import { middleware, config } from '@/middleware';

// Next's matcher helper imports server internals that expect the runtime to have installed
// AsyncLocalStorage globally (Next does this at boot). Hoisted so it is in place before any
// `next/*` module is evaluated.
await vi.hoisted(async () => {
  const { AsyncLocalStorage } = await import('node:async_hooks');
  (globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage ??= AsyncLocalStorage;
});

const SECRET = 'test-secret-not-a-real-one';
const admin = { email: 'owner@example.test', role: 'admin' as const };

function request(path: string, token?: string, method = 'GET') {
  const headers: Record<string, string> = {};
  if (token !== undefined) headers.cookie = `auth-token=${token}`;
  return new NextRequest(`http://localhost:3000${path}`, { method, headers });
}

/** NextResponse.next() is signalled to the runtime by this header. */
function passedThrough(res: Response) {
  return res.headers.get('x-middleware-next') === '1';
}

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('middleware: /api/admin/*', () => {
  // Review Focus #3
  it('returns 401 for an admin route with no session cookie', async () => {
    const res = await middleware(request('/api/admin/media', undefined, 'POST'));
    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(passedThrough(res)).toBe(false);
  });

  it.each([
    ['malformed', 'garbage'],
    ['wrong secret', jwt.sign(admin, 'another-secret', { expiresIn: '1h' })],
    ['expired', jwt.sign(admin, SECRET, { expiresIn: -60 })],
    ['alg none', 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJyb2xlIjoiYWRtaW4ifQ.'],
  ])('returns 401 for a %s token', async (_label, token) => {
    const res = await middleware(request('/api/admin/media', token));
    expect(res.status).toBe(401);
    expect(passedThrough(res)).toBe(false);
  });

  it('returns 401 for a tampered payload that keeps the original signature', async () => {
    const [h, , s] = generateToken('owner@example.test').split('.');
    const body = Buffer.from(JSON.stringify({ ...admin, exp: 9999999999 })).toString('base64url');
    const res = await middleware(request('/api/admin/media', `${h}.${body}.${s}`));
    expect(res.status).toBe(401);
  });

  it('allows a valid token through', async () => {
    const res = await middleware(request('/api/admin/media', generateToken('owner@example.test')));
    expect(passedThrough(res)).toBe(true);
    expect(res.status).toBe(200);
  });

  it('gives every failure the same body, leaking no detail, token or stack', async () => {
    const badToken = 'leaky-looking-token-value';
    const failures = [
      request('/api/admin/media'),
      request('/api/admin/media', badToken),
      request('/api/admin/media', jwt.sign(admin, 'another-secret', { expiresIn: '1h' })),
      request('/api/admin/media', jwt.sign(admin, SECRET, { expiresIn: -60 })),
    ];
    const bodies = new Set<string>();
    for (const req of failures) {
      const res = await middleware(req);
      const text = await res.text();
      bodies.add(text);
      expect(res.status).toBe(401);
      expect(res.headers.get('cache-control')).toContain('no-store');
      expect(res.headers.get('set-cookie')).toBeNull();
      expect(text).not.toContain(badToken);
      expect(text).not.toMatch(/stack|at \w+|expired|signature|malformed|secret|user|password/i);
    }
    expect(bodies.size).toBe(1);
    expect(JSON.parse([...bodies][0])).toEqual({ error: 'Unauthorized' });
  });

  it('fails closed (401, not a 500) when JWT_SECRET is not configured', async () => {
    vi.stubEnv('JWT_SECRET', '');
    const token = jwt.sign(admin, 'divyafal-development-secret-2024', { expiresIn: '1h' });
    const res = await middleware(request('/api/admin/media', token));
    expect(res.status).toBe(401);
  });
});

describe('middleware: /api/admin/login stays reachable', () => {
  it('lets an unauthenticated POST to /api/admin/login through', async () => {
    const res = await middleware(request('/api/admin/login', undefined, 'POST'));
    expect(passedThrough(res)).toBe(true);
  });

  it('lets an unauthenticated POST to /api/admin/logout through', async () => {
    const res = await middleware(request('/api/admin/logout', undefined, 'POST'));
    expect(passedThrough(res)).toBe(true);
  });

  it('lets login through even with a stale, garbage cookie', async () => {
    const res = await middleware(request('/api/admin/login', 'garbage', 'POST'));
    expect(passedThrough(res)).toBe(true);
  });

  it('exempts login exactly, not by prefix', async () => {
    for (const path of [
      '/api/admin/login/extra',
      '/api/admin/loginx',
      '/api/admin/login-help',
      '/api/admin/media/login',
      '/api/admin/logout/everything',
    ]) {
      const res = await middleware(request(path));
      expect(res.status, path).toBe(401);
    }
  });
});

describe('middleware: /dashboard', () => {
  it('redirects an unauthenticated browser request for /dashboard to the login screen', async () => {
    const res = await middleware(request('/dashboard'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/dashboard/login');
    expect(passedThrough(res)).toBe(false);
  });

  it('redirects nested dashboard pages the same way', async () => {
    const res = await middleware(request('/dashboard/products/abc'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/dashboard/login');
  });

  it('redirects a tampered or expired token to the login screen too', async () => {
    for (const token of [
      'garbage',
      jwt.sign(admin, 'another-secret', { expiresIn: '1h' }),
      jwt.sign(admin, SECRET, { expiresIn: -60 }),
    ]) {
      const res = await middleware(request('/dashboard', token));
      expect(res.status).toBe(307);
    }
  });

  it('does not redirect the login screen to itself', async () => {
    const res = await middleware(request('/dashboard/login'));
    expect(passedThrough(res)).toBe(true);
  });

  it('allows a valid token through', async () => {
    const res = await middleware(request('/dashboard', generateToken('owner@example.test')));
    expect(passedThrough(res)).toBe(true);
  });

  it('keeps the redirect on the request origin and drops the query string', async () => {
    const res = await middleware(request('/dashboard?next=https://evil.example'));
    const location = new URL(res.headers.get('location')!);
    expect(location.origin).toBe('http://localhost:3000');
    expect(location.search).toBe('');
  });
});

describe('middleware matcher', () => {
  let matches: (url: string) => boolean;
  beforeAll(async () => {
    const { unstable_doesMiddlewareMatch } = await import('next/experimental/testing/server');
    matches = url => unstable_doesMiddlewareMatch({ config, url });
  });

  it.each([
    '/dashboard',
    '/dashboard/',
    '/dashboard/login',
    '/dashboard/products/abc',
    '/api/admin/login',
    '/api/admin/media',
    '/api/admin/media/abc',
  ])('runs on %s', url => {
    expect(matches(url)).toBe(true);
  });

  it.each([
    '/',
    '/products',
    '/product/abc',
    '/sale',
    '/contact-us',
    '/virasat-academy',
    '/api/products',
    '/api/products/abc',
    '/api/homepage-sections',
    '/api/slideshow',
    '/api/health',
    '/api/upload', // guarded in-handler by requireAdmin, not by middleware
    '/dashboardx',
    '/api/administrator',
    '/_next/static/chunks/app.js',
    '/favicon.ico',
  ])('does not run on %s', url => {
    expect(matches(url)).toBe(false);
  });

  it('declares exactly the two protected path groups', () => {
    expect(config.matcher).toEqual(['/dashboard/:path*', '/api/admin/:path*']);
  });
});

describe('middleware cost', () => {
  it('imports nothing that needs Node built-ins (edge-safe)', async () => {
    const { readFileSync } = await import('node:fs');
    for (const file of ['middleware.ts', 'lib/auth-verify.ts']) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(/from\s+['"](node:)?(crypto|fs|path|buffer|stream)['"]/);
      expect(src, file).not.toMatch(/from\s+['"]jsonwebtoken['"]/);
      expect(src, file).not.toMatch(/from\s+['"]@\/lib\/(auth|db|supabase)(\/|['"])/);
    }
  });
});
