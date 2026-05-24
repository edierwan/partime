import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { GENERIC_LOGIN_ERROR, normalizeLoginIdentifier, type LoginIdentifierType } from './auth-identifiers';

const COOKIE_NAME = 'partime_session';
const ISSUER = 'partime';
const AUDIENCE = 'partime-admin';
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;
const RESET_REQUIRED_HASH = 'PASSWORD_RESET_REQUIRED';
const DUMMY_PASSWORD_HASH = '$2a$10$7EqJtq98hPqEX7fNZaFWoOHIYl3W4heC3EswVczkUhAh4E6NoNrSi';

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

export type SessionRole = 'ADMIN' | 'EMPLOYER' | 'WORKER';

export type AuthenticateResult =
  | { ok: true; session: SessionPayload; redirectTo: string }
  | { ok: false; message: string; redirectTo?: string };

export interface UserAccessOption {
  role: SessionRole;
  label: string;
  href: string;
  tenantId?: string | null;
  tenantName?: string | null;
}

type UserWithAccess = Prisma.UserAccountGetPayload<{
  include: {
    identities: true;
    credential: true;
    platformRoles: true;
    tenantMemberships: { include: { tenant: true } };
    staffProfiles: true;
  };
}>;

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
  const allowed = await hasPlatformAccess(session.sub);
  if (!allowed) throw new Error('FORBIDDEN');
  return session;
}

export async function authenticate(identifierInput: string, password: string): Promise<AuthenticateResult> {
  const identifier = normalizeLoginIdentifier(identifierInput);
  if (!identifier) {
    await compareWithDummyPassword(password);
    return { ok: false, message: GENERIC_LOGIN_ERROR };
  }

  const bcrypt = await import('bcryptjs');

  try {
    const identity = await prisma.userIdentity.findUnique({
      where: {
        type_valueNormalized: {
          type: identifier.type,
          valueNormalized: identifier.valueNormalized,
        },
      },
      include: { user: { include: userAccessInclude() } },
    });

    if (!identity?.user?.credential) {
      await compareWithDummyPassword(password);
      return { ok: false, message: GENERIC_LOGIN_ERROR };
    }

    const credential = identity.user.credential;
    if (credential.lockedUntil && credential.lockedUntil > new Date()) {
      await compareWithDummyPassword(password);
      return { ok: false, message: GENERIC_LOGIN_ERROR };
    }

    if (credential.forcePasswordReset || credential.passwordHash === RESET_REQUIRED_HASH) {
      await compareWithDummyPassword(password);
      return { ok: false, message: GENERIC_LOGIN_ERROR, redirectTo: `/forgot-password?identifier=${encodeURIComponent(identifier.valueDisplay)}` };
    }

    const ok = await bcrypt.compare(password, credential.passwordHash);
    if (!ok) {
      await recordFailedLogin(credential.id, credential.failedLoginCount);
      return { ok: false, message: GENERIC_LOGIN_ERROR };
    }

    await prisma.userCredential.update({
      where: { id: credential.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
    await prisma.userAccount.update({
      where: { id: identity.userId },
      data: { lastLoginAt: new Date() },
    });

    if (identity.user.status === 'SUSPENDED' || identity.user.status === 'DEACTIVATED') {
      return { ok: false, message: GENERIC_LOGIN_ERROR, redirectTo: `/account/blocked?status=${identity.user.status.toLowerCase()}` };
    }

    const session = sessionFromUser(identity.user);
    return { ok: true, session, redirectTo: resolvePostLoginPath(identity.user, session) };
  } catch (error) {
    if (isMissingNewAuthTable(error)) {
      return authenticateLegacyAdmin(identifier.type, identifier.valueNormalized, password);
    }
    throw error;
  }
}

export async function getUserAccessOptions(userId: string): Promise<UserAccessOption[]> {
  try {
    const user = await prisma.userAccount.findUnique({ where: { id: userId }, include: userAccessInclude() });
    return user ? accessOptionsForUser(user) : [];
  } catch (error) {
    if (isMissingNewAuthTable(error)) return [];
    throw error;
  }
}

export async function createSessionForAccess(userId: string, role: SessionRole, tenantId?: string | null): Promise<{ session: SessionPayload; redirectTo: string } | null> {
  const user = await prisma.userAccount.findUnique({ where: { id: userId }, include: userAccessInclude() });
  if (!user || user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') return null;
  const option = accessOptionsForUser(user).find((item) => item.role === role && (role !== 'EMPLOYER' || item.tenantId === tenantId));
  if (!option) return null;
  return { session: sessionFromUser(user, option), redirectTo: option.href };
}

export function resolveAuthenticatedHomePath(session: SessionPayload): string {
  if (session.role === 'ADMIN') return '/admin/dashboard';
  if (session.role === 'EMPLOYER') return session.tenantId ? '/employer/dashboard' : '/register/employer';
  if (session.role === 'WORKER') return '/worker/dashboard';
  return '/register';
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

function normalizeSessionRole(value: unknown): SessionRole {
  if (value === 'EMPLOYER' || value === 'WORKER' || value === 'ADMIN') return value;
  if (value === 'PART_TIMER') return 'WORKER';
  return 'ADMIN';
}

function userAccessInclude() {
  return {
    identities: true,
    credential: true,
    platformRoles: true,
    tenantMemberships: { where: { status: 'ACTIVE' as const }, include: { tenant: true }, orderBy: { createdAt: 'asc' as const } },
    staffProfiles: { orderBy: { createdAt: 'desc' as const } },
  };
}

function sessionFromUser(user: UserWithAccess, selected?: UserAccessOption): SessionPayload {
  const options = accessOptionsForUser(user);
  const option = selected ?? options[0];
  const primaryEmail = user.identities.find((identity) => identity.type === 'EMAIL' && identity.isPrimary) ?? user.identities.find((identity) => identity.type === 'EMAIL');
  const primaryPhone = user.identities.find((identity) => identity.type === 'PHONE' && identity.isPrimary) ?? user.identities.find((identity) => identity.type === 'PHONE');

  return {
    sub: user.id,
    email: primaryEmail?.valueNormalized ?? '',
    name: user.displayName,
    role: option?.role ?? 'WORKER',
    tenantId: option?.role === 'EMPLOYER' ? option.tenantId ?? null : null,
    phoneE164: primaryPhone?.valueNormalized ?? null,
  };
}

function resolvePostLoginPath(user: UserWithAccess, session: SessionPayload): string {
  const options = accessOptionsForUser(user);
  if (options.length === 0) return '/register';
  const tenantCount = options.filter((option) => option.role === 'EMPLOYER').length;
  const roleCount = new Set(options.map((option) => option.role)).size;
  if (roleCount > 1 || tenantCount > 1) return '/account/switch';
  return resolveAuthenticatedHomePath(session);
}

function accessOptionsForUser(user: UserWithAccess): UserAccessOption[] {
  const options: UserAccessOption[] = [];
  if (user.platformRoles.length > 0) {
    options.push({ role: 'ADMIN', label: 'Platform Admin', href: '/admin/dashboard' });
  }

  for (const membership of user.tenantMemberships) {
    options.push({
      role: 'EMPLOYER',
      label: membership.tenant.name,
      href: '/employer/dashboard',
      tenantId: membership.tenantId,
      tenantName: membership.tenant.name,
    });
  }

  const workerProfile = user.staffProfiles.find((staff) => staff.status !== 'SUSPENDED' && staff.status !== 'REJECTED');
  if (workerProfile) {
    options.push({ role: 'WORKER', label: workerProfile.fullName || 'Worker Profile', href: '/worker/dashboard' });
  }

  return options;
}

async function hasPlatformAccess(userId: string): Promise<boolean> {
  try {
    const role = await prisma.platformUserRole.findFirst({ where: { userId }, select: { id: true } });
    if (role) return true;
  } catch (error) {
    if (!isMissingNewAuthTable(error)) throw error;
  }

  const legacyAdmin = await prisma.adminUser.findUnique({ where: { id: userId }, select: { id: true, platformRole: true } });
  return Boolean(legacyAdmin && ['PLATFORM_ADMIN', 'SUPPORT', 'FINANCE', 'OPERATIONS'].includes(legacyAdmin.platformRole));
}

async function authenticateLegacyAdmin(type: LoginIdentifierType, normalizedIdentifier: string, password: string): Promise<AuthenticateResult> {
  if (type !== 'EMAIL') {
    await compareWithDummyPassword(password);
    return { ok: false, message: GENERIC_LOGIN_ERROR };
  }

  const user = await prisma.adminUser.findUnique({ where: { email: normalizedIdentifier } });
  if (!user || !['PLATFORM_ADMIN', 'SUPPORT', 'FINANCE', 'OPERATIONS'].includes(user.platformRole)) {
    await compareWithDummyPassword(password);
    return { ok: false, message: GENERIC_LOGIN_ERROR };
  }

  const bcrypt = await import('bcryptjs');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { ok: false, message: GENERIC_LOGIN_ERROR };

  const session: SessionPayload = {
    sub: user.id,
    email: user.email,
    name: user.name ?? undefined,
    role: 'ADMIN',
    tenantId: null,
    phoneE164: null,
  };
  return { ok: true, session, redirectTo: resolveAuthenticatedHomePath(session) };
}

async function recordFailedLogin(credentialId: string, currentFailedLoginCount: number): Promise<void> {
  const nextFailedLoginCount = currentFailedLoginCount + 1;
  await prisma.userCredential.update({
    where: { id: credentialId },
    data: {
      failedLoginCount: nextFailedLoginCount,
      lockedUntil: nextFailedLoginCount >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
    },
  });
}

async function compareWithDummyPassword(password: string): Promise<void> {
  const bcrypt = await import('bcryptjs');
  await bcrypt.compare(password || '', DUMMY_PASSWORD_HASH).catch(() => false);
}

function isMissingNewAuthTable(error: unknown): boolean {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : '';
  if (code === 'P2021' || code === 'P2022') return true;
  const message = error instanceof Error ? error.message : '';
  return /UserAccount|UserIdentity|UserCredential|PlatformUserRole/.test(message) && /does not exist|not exist|no such table/i.test(message);
}
