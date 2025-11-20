import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import nextAuthMiddleware from 'next-auth/middleware';

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
  return request.ip ?? 'unknown';
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

export default function middleware(request: NextRequest) {
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

  return nextAuthMiddleware(request);
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/((?!api/auth|auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};

