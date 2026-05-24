import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'partime_session';

function secret() {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) return null;
  return new TextEncoder().encode(s);
}

type SessionRole = 'ADMIN' | 'EMPLOYER' | 'WORKER';

interface ProxySession {
  role: SessionRole;
  tenantId: string | null;
  phoneE164: string | null;
}

async function getSession(req: NextRequest): Promise<ProxySession | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const key = secret();
  if (!token || !key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { issuer: 'partime', audience: 'partime-admin' });
    return {
      role: normalizeSessionRole(payload.role),
      tenantId: typeof payload.tenantId === 'string' ? payload.tenantId : null,
      phoneE164: typeof payload.phoneE164 === 'string' ? payload.phoneE164 : null,
    };
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/scan') ||
    pathname.startsWith('/jobs') ||
    pathname.startsWith('/part-timer') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/account/blocked') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/scan') ||
    pathname.startsWith('/api/webhooks/baileys/inbound') ||
    pathname.startsWith('/api/public/register') ||
    pathname.startsWith('/api/public/otp') ||
    pathname.startsWith('/api/auth/password-reset') ||
    pathname === '/login' ||
    pathname === '/' ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/select-role' ||
    pathname === '/api/auth/logout'
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin') || pathname.startsWith('/employer') || pathname.startsWith('/worker') || pathname.startsWith('/account/switch')) {
    const session = await getSession(req);
    if (!session) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
      const url = new URL('/login', req.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }

    if ((pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) && session.role !== 'ADMIN') {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL(resolveHomePath(session), req.url));
    }

    if (pathname.startsWith('/employer') && session.role !== 'EMPLOYER') {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL(resolveHomePath(session), req.url));
    }

    if (pathname.startsWith('/worker') && session.role !== 'WORKER') {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL(resolveHomePath(session), req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};

function normalizeSessionRole(value: unknown): SessionRole {
  if (value === 'EMPLOYER' || value === 'WORKER' || value === 'ADMIN') return value;
  if (value === 'PART_TIMER') return 'WORKER';
  return 'ADMIN';
}

function resolveHomePath(session: ProxySession): string {
  if (session.role === 'ADMIN') return '/admin/dashboard';
  if (session.role === 'EMPLOYER') return session.tenantId ? '/employer/dashboard' : '/register/employer';
  if (session.role === 'WORKER') return '/worker/dashboard';
  return '/register';
}