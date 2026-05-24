import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { generateOtpCode } from '@/lib/otp';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { GENERIC_PASSWORD_RESET_MESSAGE, normalizeLoginIdentifier } from './auth-identifiers';
import { passwordsMatch } from './password-policy';

const PASSWORD_RESET_TTL_MINUTES = 15;

export async function requestPasswordReset({ identifierInput, requestIp, userAgent }: { identifierInput: string; requestIp: string | null; userAgent: string | null }) {
  const identifier = normalizeLoginIdentifier(identifierInput);
  if (!identifier) return { ok: true, message: GENERIC_PASSWORD_RESET_MESSAGE };

  const identity = await prisma.userIdentity.findUnique({
    where: { type_valueNormalized: { type: identifier.type, valueNormalized: identifier.valueNormalized } },
    select: { id: true, userId: true, type: true, valueNormalized: true },
  }).catch(() => null);

  if (!identity) return { ok: true, message: GENERIC_PASSWORD_RESET_MESSAGE };

  const code = generateOtpCode();
  const now = new Date();
  const token = await prisma.authVerificationToken.create({
    data: {
      userId: identity.userId,
      identityId: identity.id,
      channel: identity.type === 'PHONE' ? 'WHATSAPP' : 'EMAIL',
      purpose: 'PASSWORD_RESET',
      targetNormalized: identity.valueNormalized,
      codeHash: hashVerificationCode(identity.valueNormalized, 'PASSWORD_RESET', code),
      expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000),
      attemptCount: 0,
      maxAttempts: 5,
      sendCount: 1,
      lastSentAt: now,
      requestIp,
      userAgent,
      payloadJson: { delivery: identity.type === 'PHONE' ? 'whatsapp' : 'email_provider_pending' },
    },
    select: { id: true },
  });

  if (identity.type === 'PHONE') {
    const delivery = await sendWhatsAppMessage({
      toPhoneE164: identity.valueNormalized,
      text: `Kod reset kata laluan Partime anda ialah ${code}. Kod tamat dalam ${PASSWORD_RESET_TTL_MINUTES} minit.`,
    });
    await prisma.authVerificationToken.update({
      where: { id: token.id },
      data: {
        providerMessageId: delivery.messageId || null,
        payloadJson: {
          delivery: 'whatsapp',
          ok: delivery.ok,
          error: delivery.error || null,
          providerTenant: delivery.providerTenant || null,
          statusCode: delivery.statusCode || null,
        },
      },
    });
  }

  return { ok: true, message: GENERIC_PASSWORD_RESET_MESSAGE };
}

export async function confirmPasswordReset({ identifierInput, code, password, confirmPassword }: { identifierInput: string; code: string; password: string; confirmPassword: string }) {
  const passwordValidation = passwordsMatch(password, confirmPassword);
  if (!passwordValidation.ok) return { ok: false, status: 400, message: passwordValidation.message || 'Invalid password.' };

  const identifier = normalizeLoginIdentifier(identifierInput);
  if (!identifier || !/^\d{4}$/.test(code)) return { ok: false, status: 400, message: 'Kod reset tidak sah atau telah tamat.' };

  const now = new Date();
  const token = await prisma.authVerificationToken.findFirst({
    where: {
      targetNormalized: identifier.valueNormalized,
      purpose: 'PASSWORD_RESET',
      consumedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: [{ lastSentAt: 'desc' }, { createdAt: 'desc' }],
  });

  if (!token || !token.codeHash || !token.userId || token.attemptCount >= token.maxAttempts) {
    return { ok: false, status: 400, message: 'Kod reset tidak sah atau telah tamat.' };
  }

  const expected = hashVerificationCode(identifier.valueNormalized, 'PASSWORD_RESET', code);
  if (expected !== token.codeHash) {
    await prisma.authVerificationToken.update({
      where: { id: token.id },
      data: { attemptCount: token.attemptCount + 1 },
    });
    return { ok: false, status: 400, message: 'Kod reset tidak sah atau telah tamat.' };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.userCredential.upsert({
      where: { userId: token.userId },
      update: {
        passwordHash,
        passwordUpdatedAt: now,
        forcePasswordReset: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
      create: {
        userId: token.userId,
        passwordHash,
        passwordUpdatedAt: now,
        forcePasswordReset: false,
      },
    }),
    prisma.authVerificationToken.update({ where: { id: token.id }, data: { consumedAt: now } }),
  ]);

  return { ok: true, message: 'Kata laluan telah dikemas kini. Sila log masuk.' };
}

function verificationSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET (or NEXTAUTH_SECRET) is required for auth verification hashing');
  return secret;
}

function hashVerificationCode(targetNormalized: string, purpose: string, code: string): string {
  return createHash('sha256').update(`${verificationSecret()}:${purpose}:${targetNormalized}:${code}`).digest('hex');
}
