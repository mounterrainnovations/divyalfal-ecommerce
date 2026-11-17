// @vitest-environment node
//
// Product WRITES (create, edit, delete) are admin-only. Reads stay public: the storefront
// depends on them. Prisma is mocked, so this is hermetic.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateToken } from '@/lib/auth';

const SECRET = 'test-secret-not-a-real-one';

const prismaSpies = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: { product: prismaSpies } }));

import { POST } from '@/app/api/products/route';
import { GET as getOne, PATCH, DELETE } from '@/app/api/products/[id]/route';

const ctx = { params: Promise.resolve({ id: 'p1' }) };

function req(method: string, token?: string, body?: unknown) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (token !== undefined) headers.set('cookie', `auth-token=${token}`);
  return new Request('http://x/api/products', {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function expectDatabaseUntouched() {
  for (const spy of Object.values(prismaSpies)) expect(spy).not.toHaveBeenCalled();
}

const bad = [
  ['no cookie', undefined],
  ['a malformed token', 'garbage'],
  ['a wrong-secret token', jwt.sign({ email: 'a@b.test', role: 'admin' }, 'nope')],
  ['an expired token', jwt.sign({ email: 'a@b.test', role: 'admin' }, SECRET, { expiresIn: -60 })],
] as const;

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe.each(bad)('product writes with %s', (_label, token) => {
  it('POST /api/products is refused with 401 and never reaches the database', async () => {
    const res = await POST(req('POST', token, { name: 'x', price: 1 }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
    expectDatabaseUntouched();
  });

  it('PATCH /api/products/[id] is refused with 401 and never reaches the database', async () => {
    const res = await PATCH(req('PATCH', token, { name: 'hijacked' }), ctx);
    expect(res.status).toBe(401);
    expectDatabaseUntouched();
  });

  it('DELETE /api/products/[id] is refused with 401 and never reaches the database', async () => {
    const res = await DELETE(req('DELETE', token), ctx);
    expect(res.status).toBe(401);
    expectDatabaseUntouched();
  });
});

describe('product writes with a valid admin session', () => {
  const token = () => generateToken('owner@example.test');

  it('PATCH reaches the database', async () => {
    prismaSpies.update.mockResolvedValue({ id: 'p1' });
    const res = await PATCH(req('PATCH', token(), { name: 'renamed' }), ctx);
    expect(res.status).toBe(200);
    expect(prismaSpies.update).toHaveBeenCalledTimes(1);
  });

  it('DELETE reaches the database', async () => {
    prismaSpies.delete.mockResolvedValue({});
    const res = await DELETE(req('DELETE', token()), ctx);
    expect(res.status).toBe(200);
    expect(prismaSpies.delete).toHaveBeenCalledTimes(1);
  });

  it('POST keeps its own validation (missing fields is a 400, not a 401)', async () => {
    const res = await POST(req('POST', token(), {}));
    expect(res.status).toBe(400);
  });
});

describe('product reads stay public', () => {
  it('GET /api/products/[id] needs no cookie', async () => {
    prismaSpies.findUnique.mockResolvedValue(null);
    const res = await getOne(req('GET'), ctx);
    expect(res.status).toBe(404); // reached the handler; not a 401
    expect(prismaSpies.findUnique).toHaveBeenCalledTimes(1);
  });
});
