import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './db';

const COOKIE_NAME = 'partime_session';
const ISSUER = 'partime';
const AUDIENCE = 'partime-admin';

function secret() {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET (or NEXTAUTH_SECRET) is not set');
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  sub: string;
  email: string;
  name?: string;
  role: SessionRole;
  tenantId?: string | null;
  phoneE164?: string | null;
}

export type SessionRole = 'ADMIN' | 'EMPLOYER' | 'PART_TIMER';

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
    tenantId: payload.tenantId || null,
    phoneE164: payload.phoneE164 || null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience: AUDIENCE });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email),
      name: payload.name as string | undefined,
      role: normalizeSessionRole(payload.role),
      tenantId: typeof payload.tenantId === 'string' ? payload.tenantId : null,
      phoneE164: typeof payload.phoneE164 === 'string' ? payload.phoneE164 : null,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const c = (await cookies()).get(COOKIE_NAME);
  if (!c?.value) return null;
  return verifySessionToken(c.value);
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new Error('UNAUTHORIZED');
  return s;
}

export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== 'ADMIN') throw new Error('FORBIDDEN');
  return session;
}

export async function authenticate(email: string, password: string): Promise<SessionPayload | null> {
  const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return null;
  const bcrypt = await import('bcryptjs');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return { sub: user.id, email: user.email, name: user.name ?? undefined, role: 'ADMIN', tenantId: null, phoneE164: null };
}

export async function authenticateEmployerByPhone(phoneE164: string): Promise<SessionPayload | null> {
  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenant: {
        OR: [
          { phoneE164 },
          { employerRegistrations: { some: { contactPhoneE164: phoneE164 } } },
        ],
      },
    },
    include: {
      adminUser: true,
      tenant: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  if (!membership) return null;

  return {
    sub: membership.adminUserId,
    email: membership.adminUser.email,
    name: membership.adminUser.name ?? membership.tenant.name,
    role: 'EMPLOYER',
    tenantId: membership.tenantId,
    phoneE164,
  };
}

export function resolveAuthenticatedHomePath(session: SessionPayload): string {
  if (session.role === 'ADMIN') return '/admin';
  if (session.role === 'EMPLOYER') return session.tenantId ? '/employer/dashboard' : '/register/employer';
  if (session.role === 'PART_TIMER') return session.phoneE164 ? `/part-timer/profile?phone=${encodeURIComponent(session.phoneE164)}` : '/register';
  return '/register';
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

function normalizeSessionRole(value: unknown): SessionRole {
  if (value === 'EMPLOYER' || value === 'PART_TIMER' || value === 'ADMIN') return value;
  return 'ADMIN';
}
