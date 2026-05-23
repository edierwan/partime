import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'partime_session';

function secret() {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) return null;
  return new TextEncoder().encode(s);
}

async function isAuthed(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const key = secret();
  if (!token || !key) return false;
  try {
    await jwtVerify(token, key, { issuer: 'partime', audience: 'partime-admin' });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/scan') ||
    pathname.startsWith('/jobs') ||
    pathname.startsWith('/part-timer') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/scan') ||
    pathname.startsWith('/api/webhooks/baileys/inbound') ||
    pathname.startsWith('/api/public/register') ||
    pathname.startsWith('/api/public/otp') ||
    pathname === '/login' ||
    pathname === '/' ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout'
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin') || pathname.startsWith('/employer')) {
    const authed = await isAuthed(req);
    if (!authed) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
      const url = new URL('/login', req.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};