// @vitest-environment node
//
// jose and the Web Crypto API need a real Uint8Array / crypto realm; jsdom's differs.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateToken } from '@/lib/auth';
import { requireAdmin, UnauthorizedError, unauthorizedResponse } from '@/lib/auth-guard';
import { POST as login } from '@/app/api/admin/login/route';

const SECRET = 'test-secret-not-a-real-one';
const OTHER_SECRET = 'a-different-test-secret';
// The value that used to be compiled into lib/auth.ts as a fallback. It is public in git
// history, so a token signed with it must never be accepted again.
const OLD_FALLBACK = 'divyafal-development-secret-2024';

function b64url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function reqWithCookie(cookie?: string) {
  const headers = new Headers();
  if (cookie !== undefined) headers.set('cookie', cookie);
  return new Request('http://x/api/admin/anything', { headers });
}

function reqWithToken(token: string) {
  return reqWithCookie(`auth-token=${token}`);
}

const admin = { email: 'owner@example.test', role: 'admin' as const };

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('requireAdmin', () => {
  it('returns the payload for a valid token minted by the existing generateToken', async () => {
    const token = generateToken('owner@example.test');
    const payload = await requireAdmin(reqWithToken(token));
    expect(payload.email).toBe('owner@example.test');
    expect(payload.role).toBe('admin');
    expect(typeof payload.exp).toBe('number');
    expect(typeof payload.iat).toBe('number');
  });

  it('finds the session cookie among other cookies', async () => {
    const token = generateToken('owner@example.test');
    const payload = await requireAdmin(reqWithCookie(`theme=dark; auth-token=${token}; a=b`));
    expect(payload.role).toBe('admin');
  });

  it('rejects a request with no cookie header', async () => {
    await expect(requireAdmin(reqWithCookie())).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a request whose cookies do not include the session cookie', async () => {
    await expect(requireAdmin(reqWithCookie('theme=dark; other=1'))).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });

  it('does not mistake a similarly named cookie for the session cookie', async () => {
    const token = generateToken('owner@example.test');
    await expect(requireAdmin(reqWithCookie(`x-auth-token=${token}`))).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });

  it('rejects an empty session cookie', async () => {
    await expect(requireAdmin(reqWithCookie('auth-token='))).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });

  it.each([
    ['not a jwt at all', 'garbage'],
    ['two segments', 'aaa.bbb'],
    ['four segments', 'a.b.c.d'],
    ['non-base64 segments', '!!!.@@@.###'],
  ])('rejects a malformed token (%s)', async (_label, token) => {
    await expect(requireAdmin(reqWithToken(token))).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const token = jwt.sign(admin, OTHER_SECRET, { expiresIn: '1h' });
    await expect(requireAdmin(reqWithToken(token))).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects an expired token', async () => {
    const token = jwt.sign(admin, SECRET, { expiresIn: -60 });
    await expect(requireAdmin(reqWithToken(token))).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a valid token whose payload has been tampered with', async () => {
    const token = generateToken('owner@example.test');
    const [h, , s] = token.split('.');
    const forged = b64url({ ...admin, email: 'attacker@example.test', exp: 9999999999 });
    await expect(requireAdmin(reqWithToken(`${h}.${forged}.${s}`))).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });

  it('rejects an unsigned alg:none token', async () => {
    const token = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
      ...admin,
      exp: 9999999999,
    })}.`;
    await expect(requireAdmin(reqWithToken(token))).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a token using a different HMAC algorithm even with the right secret', async () => {
    // Only HS256 is ever issued; pinning it closes algorithm-confusion variants.
    const token = jwt.sign(admin, SECRET, { algorithm: 'HS512', expiresIn: '1h' });
    await expect(requireAdmin(reqWithToken(token))).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a correctly signed token that does not carry the admin role', async () => {
    const token = jwt.sign({ email: 'someone@example.test', role: 'customer' }, SECRET, {
      expiresIn: '1h',
    });
    await expect(requireAdmin(reqWithToken(token))).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a correctly signed token with no expiry', async () => {
    const token = jwt.sign(admin, SECRET); // no expiresIn
    await expect(requireAdmin(reqWithToken(token))).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe('no development fallback secret', () => {
  it('rejects a token signed with the old hard-coded fallback secret', async () => {
    vi.stubEnv('JWT_SECRET', SECRET);
    const token = jwt.sign(admin, OLD_FALLBACK, { expiresIn: '1h' });
    await expect(requireAdmin(reqWithToken(token))).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('fails closed when JWT_SECRET is unset, even for a token signed with the old fallback', async () => {
    vi.stubEnv('JWT_SECRET', '');
    const token = jwt.sign(admin, OLD_FALLBACK, { expiresIn: '1h' });
    await expect(requireAdmin(reqWithToken(token))).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('refuses to mint a token when JWT_SECRET is unset', () => {
    vi.stubEnv('JWT_SECRET', '');
    expect(() => generateToken('owner@example.test')).toThrow();
  });
});

describe('the 401 does not leak', () => {
  it('uses one generic error for every failure mode, with no token or detail in it', async () => {
    const secretLooking = 'super-secret-token-value';
    const cases = [
      reqWithCookie(),
      reqWithToken(secretLooking),
      reqWithToken(jwt.sign(admin, OTHER_SECRET, { expiresIn: '1h' })),
      reqWithToken(jwt.sign(admin, SECRET, { expiresIn: -60 })),
    ];

    const messages = new Set<string>();
    for (const request of cases) {
      const error = await requireAdmin(request).then(
        () => null,
        e => e as Error
      );
      expect(error).toBeInstanceOf(UnauthorizedError);
      messages.add(error!.message);
      expect(error!.message).not.toContain(secretLooking);
      expect(error!.message).not.toContain(SECRET);
    }
    expect(messages.size).toBe(1);
  });

  it('unauthorizedResponse is a bare 401 JSON with no stack, no detail, and no-store', async () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });
});

describe('login contract is unchanged', () => {
  it('the cookie /api/admin/login issues is accepted by requireAdmin', async () => {
    vi.stubEnv('EMAIL', 'owner@example.test');
    vi.stubEnv('PASSWORD', 'a-test-password');
    const res = await login(
      new Request('http://x/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'owner@example.test', password: 'a-test-password' }),
      })
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie')!;
    expect(setCookie).toMatch(/^auth-token=/);
    expect(setCookie.toLowerCase()).toContain('httponly');
    const value = /^auth-token=([^;]+)/.exec(setCookie)![1];
    const payload = await requireAdmin(reqWithToken(value));
    expect(payload.email).toBe('owner@example.test');
  });
});
