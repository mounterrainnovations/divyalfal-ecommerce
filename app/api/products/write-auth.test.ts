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
  // DELETE now counts the orders that reference the product before removing it, so that a
  // product an order depends on is refused in words rather than by a foreign-key 500. The spy
  // is part of this record so `expectDatabaseUntouched` covers that read too: a 401 must not
  // reach the orders table either.
  orderItemFindMany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: { product: prismaSpies, orderItem: { findMany: prismaSpies.orderItemFindMany } },
}));

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
    prismaSpies.orderItemFindMany.mockResolvedValue([]);
    prismaSpies.delete.mockResolvedValue({});
    const res = await DELETE(req('DELETE', token()), ctx);
    expect(res.status).toBe(200);
    expect(prismaSpies.delete).toHaveBeenCalledTimes(1);
  });

  it('DELETE refuses a product an order references, and names the orders', async () => {
    // The database would refuse this anyway, with a foreign-key error the portal used to
    // report as "Failed to delete product". An admin needs to read how many orders are
    // involved and what to do instead, which is archive it.
    prismaSpies.orderItemFindMany.mockResolvedValue([{ orderId: 'o1' }, { orderId: 'o2' }]);
    const res = await DELETE(req('DELETE', token()), ctx);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.orders).toBe(2);
    expect(body.error).toContain('appears on 2 orders');
    expect(body.error).toContain('Archive it instead');
    expect(prismaSpies.delete).not.toHaveBeenCalled();
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
