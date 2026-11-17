import { NextResponse, type NextRequest } from 'next/server';
import { readCookie, SESSION_COOKIE, verifySessionToken } from '@/lib/auth-verify';

// First enforcement layer for the admin portal. It runs on the edge runtime, so it uses the
// jose-based verifier (lib/auth-verify.ts) rather than `jsonwebtoken`.
//
// The matcher is deliberately narrow: every public page and API (`/api/products`,
// `/api/homepage-sections`, `/api/slideshow`, ...) never executes this code, so the storefront
// pays no latency and receives no cookies. `/api/upload` is not matched either; it is guarded
// inside its handler with requireAdmin.
export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*'],
};

const LOGIN_PAGE = '/dashboard/login';

// Reachable without a session, matched EXACTLY (never by prefix): the login screen itself, and
// the two endpoints that create and clear a session. Locking the login endpoint behind the
// session it issues would make the portal impossible to enter.
const PUBLIC_PATHS = new Set([LOGIN_PAGE, '/api/admin/login', '/api/admin/logout']);

function normalise(pathname: string) {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(normalise(pathname))) return NextResponse.next();

  const session = await verifySessionToken(
    readCookie(request.headers.get('cookie'), SESSION_COOKIE)
  );
  if (session) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const login = request.nextUrl.clone();
  login.pathname = LOGIN_PAGE;
  login.search = '';
  return NextResponse.redirect(login);
}
