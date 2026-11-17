// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateToken } from '@/lib/auth';

const SECRET = 'test-secret-not-a-real-one';

// A stand-in for the service-role Supabase client. Reading `.storage` at all is recorded, so
// "storage was never touched" is proven by property access, not only by a call count. A client
// that is merely constructed at import time (as the real one is) is not a request touching it.
const spies = vi.hoisted(() => ({
  storageRead: vi.fn(),
  from: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    get storage() {
      spies.storageRead();
      return { from: spies.from };
    },
  },
}));

import { POST } from '@/app/api/upload/route';

function imageForm() {
  const form = new FormData();
  form.set('file', new File([new Uint8Array([1, 2, 3])], 'look.png', { type: 'image/png' }));
  return form;
}

function upload(opts: { token?: string; body?: FormData } = {}) {
  const headers = new Headers();
  if (opts.token !== undefined) headers.set('cookie', `auth-token=${opts.token}`);
  return new Request('http://x/api/upload', {
    method: 'POST',
    headers,
    body: opts.body ?? new FormData(),
  });
}

function expectStorageUntouched() {
  expect(spies.storageRead).not.toHaveBeenCalled();
  expect(spies.from).not.toHaveBeenCalled();
  expect(spies.upload).not.toHaveBeenCalled();
  expect(spies.getPublicUrl).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', SECRET);
  spies.upload.mockResolvedValue({ error: null });
  spies.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.test/p.png' } });
  spies.from.mockReturnValue({ upload: spies.upload, getPublicUrl: spies.getPublicUrl });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('POST /api/upload', () => {
  it('rejects an unauthenticated upload before touching storage', async () => {
    const res = await POST(upload({ body: imageForm() }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
    expectStorageUntouched();
  });

  it('rejects an unauthenticated empty upload with 401, not 400', async () => {
    // Before this change an unauthenticated empty POST reached the handler and got 400.
    const res = await POST(upload());
    expect(res.status).toBe(401);
    expectStorageUntouched();
  });

  it.each([
    ['malformed', 'garbage'],
    ['wrong secret', jwt.sign({ email: 'a@b.test', role: 'admin' }, 'nope', { expiresIn: '1h' })],
    [
      'expired',
      jwt.sign({ email: 'a@b.test', role: 'admin' }, SECRET, { expiresIn: -60 }),
    ],
  ])('rejects a %s token before touching storage', async (_label, token) => {
    const res = await POST(upload({ token, body: imageForm() }));
    expect(res.status).toBe(401);
    expectStorageUntouched();
  });

  it('does not read the request body for an unauthenticated caller', async () => {
    const request = upload({ body: imageForm() });
    const formData = vi.spyOn(request, 'formData');
    const res = await POST(request);
    expect(res.status).toBe(401);
    expect(formData).not.toHaveBeenCalled();
  });

  it('does not echo the token or any detail in the 401', async () => {
    const res = await POST(upload({ token: 'leaky-looking-token-value', body: imageForm() }));
    const text = await res.text();
    expect(text).toBe(JSON.stringify({ error: 'Unauthorized' }));
  });

  it('still uploads for a valid admin session (and returns the same shape)', async () => {
    const token = generateToken('owner@example.test');
    const res = await POST(upload({ token, body: imageForm() }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://cdn.test/p.png' });
    expect(spies.from).toHaveBeenCalledWith('product-images');
    expect(spies.upload).toHaveBeenCalledTimes(1);
  });

  it('keeps its own validation for an authenticated caller (no file is a 400)', async () => {
    const token = generateToken('owner@example.test');
    const res = await POST(upload({ token }));
    expect(res.status).toBe(400);
    expectStorageUntouched();
  });
});
