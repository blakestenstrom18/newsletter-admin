import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import type { NextRequestWithAuth } from 'next-auth/middleware';

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute buckets
const RATE_LIMIT_MAX_REQUESTS = 15; // per bucket

type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

const requestStore = new Map<string, RateLimitEntry>();

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  const realIp =
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('fastly-client-ip');

  if (realIp) {
    return realIp;
  }

  return request.nextUrl.hostname || 'unknown';
}

function isRateLimited(key: string) {
  const now = Date.now();
  const existing = requestStore.get(key);

  if (!existing || existing.expiresAt < now) {
    requestStore.set(key, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  existing.count += 1;
  return existing.count > RATE_LIMIT_MAX_REQUESTS;
}

const middleware = withAuth(
  function middleware(request: NextRequestWithAuth) {
    if (request.nextUrl.pathname.startsWith('/api/auth')) {
      const key = getClientKey(request);

      if (isRateLimited(key)) {
        return NextResponse.json(
          { message: 'Too many authentication attempts. Please wait a minute.' },
          { status: 429 },
        );
      }

      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: '/auth/signin',
    },
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname.startsWith('/api/auth')) {
          return true;
        }
        return !!token;
      },
    },
  },
);

export default middleware;

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/((?!api/auth|auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};

