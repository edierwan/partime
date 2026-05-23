import { OtpPurpose, Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  generateOtpCode,
  hashOtpCode,
  maskOtpPhone,
  otpCooldownRemainingSeconds,
  otpExpiresAt,
  otpRemainingSeconds,
  OTP_IP_WINDOW_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS_PER_IP,
  OTP_MAX_SENDS_PER_PHONE,
  OTP_PHONE_WINDOW_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
} from '@/lib/otp';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export type ReserveOtpSendResult =
  | {
      ok: true;
      otpId: string;
      code: string;
      expiresInSeconds: number;
      resendAfterSeconds: number;
      maskedPhone: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
      message: string;
      retryAfterSeconds?: number;
      expiresInSeconds?: number;
      maskedPhone?: string;
    };

export type VerifyOtpResult =
  | {
      ok: true;
      otp: {
        id: string;
        phoneE164: string;
        purpose: OtpPurpose;
        expiresAt: Date;
        attemptCount: number;
        maxAttempts: number;
      };
      expiresInSeconds: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
      message: string;
    };

export async function reserveOtpSend({
  phoneE164,
  purpose,
  requestIp,
  userAgent,
}: {
  phoneE164: string;
  purpose: OtpPurpose;
  requestIp: string | null;
  userAgent: string | null;
}): Promise<ReserveOtpSendResult> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const phoneWindowStartsAt = new Date(now.getTime() - OTP_PHONE_WINDOW_MINUTES * 60 * 1000);
    const ipWindowStartsAt = new Date(now.getTime() - OTP_IP_WINDOW_MINUTES * 60 * 1000);

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`partime-otp:${purpose}:${phoneE164}`}))`;

    const [phoneAttempts, ipAttempts, activeOtp] = await Promise.all([
      tx.staffOtp.count({
        where: {
          phoneE164,
          lastSentAt: { gte: phoneWindowStartsAt },
        },
      }),
      requestIp
        ? tx.staffOtp.count({
            where: {
              requestIp,
              lastSentAt: { gte: ipWindowStartsAt },
            },
          })
        : Promise.resolve(0),
      tx.staffOtp.findFirst({
        where: {
          phoneE164,
          purpose,
          consumedAt: null,
          blockedAt: null,
          expiresAt: { gt: now },
          sendStatus: { in: ['PENDING', 'SENT'] },
        },
        orderBy: [{ lastSentAt: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    if (phoneAttempts >= OTP_MAX_SENDS_PER_PHONE) {
      return {
        ok: false,
        status: 429,
        error: 'OTP_PHONE_RATE_LIMIT',
        message: 'Too many OTP requests. Please try again later.',
      };
    }
    if (ipAttempts >= OTP_MAX_SENDS_PER_IP) {
      return {
        ok: false,
        status: 429,
        error: 'OTP_IP_RATE_LIMIT',
        message: 'Too many OTP requests from this device. Please try again later.',
      };
    }

    if (activeOtp?.lastSentAt) {
      const retryAfterSeconds = otpCooldownRemainingSeconds(activeOtp.lastSentAt, now);
      if (retryAfterSeconds > 0) {
        return {
          ok: false,
          status: 429,
          error: 'OTP_COOLDOWN_ACTIVE',
          message: `Resend OTP in ${retryAfterSeconds}s.`,
          retryAfterSeconds,
          expiresInSeconds: otpRemainingSeconds(activeOtp.expiresAt, now),
          maskedPhone: maskOtpPhone(phoneE164),
        };
      }

      await tx.staffOtp.update({
        where: { id: activeOtp.id },
        data: {
          blockedAt: now,
          sendStatus: 'SUPERSEDED',
        },
      });
    }

    const code = generateOtpCode();
    const otp = await tx.staffOtp.create({
      data: {
        phoneE164,
        codeHash: hashOtpCode({ phoneE164, purpose, code }),
        purpose,
        expiresAt: otpExpiresAt(now),
        attemptCount: 0,
        maxAttempts: OTP_MAX_ATTEMPTS,
        sendCount: 1,
        lastSentAt: now,
        requestIp,
        userAgent,
        sendStatus: 'PENDING',
      },
      select: { id: true },
    });

    return {
      ok: true,
      otpId: otp.id,
      code,
      expiresInSeconds: otpRemainingSeconds(otpExpiresAt(now), now),
      resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      maskedPhone: maskOtpPhone(phoneE164),
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function markOtpSent({
  otpId,
  providerMessageId,
  payloadJson,
}: {
  otpId: string;
  providerMessageId?: string | null;
  payloadJson?: Prisma.InputJsonValue;
}) {
  await prisma.staffOtp.update({
    where: { id: otpId },
    data: {
      sendStatus: 'SENT',
      sendError: null,
      providerMessageId: providerMessageId || null,
      payloadJson,
    },
  });
}

export async function markOtpSendFailed({
  otpId,
  error,
  payloadJson,
}: {
  otpId: string;
  error: string;
  payloadJson?: Prisma.InputJsonValue;
}) {
  await prisma.staffOtp.update({
    where: { id: otpId },
    data: {
      blockedAt: new Date(),
      sendStatus: 'FAILED',
      sendError: error,
      payloadJson,
    },
  });
}

export async function verifyOtpCode({
  prismaClient = prisma,
  phoneE164,
  purpose,
  code,
  consumeOnSuccess = false,
}: {
  prismaClient?: PrismaLike;
  phoneE164: string;
  purpose: OtpPurpose;
  code: string;
  consumeOnSuccess?: boolean;
}): Promise<VerifyOtpResult> {
  const now = new Date();
  const otp = await prismaClient.staffOtp.findFirst({
    where: {
      phoneE164,
      purpose,
      consumedAt: null,
      blockedAt: null,
    },
    orderBy: [{ lastSentAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      phoneE164: true,
      purpose: true,
      codeHash: true,
      expiresAt: true,
      attemptCount: true,
      maxAttempts: true,
      sendStatus: true,
    },
  });

  if (!otp || otp.sendStatus !== 'SENT') {
    return { ok: false, status: 400, error: 'OTP_EXPIRED', message: 'OTP expired. Please request a new code.' };
  }

  if (otp.expiresAt <= now) {
    await prismaClient.staffOtp.update({
      where: { id: otp.id },
      data: {
        blockedAt: now,
        sendStatus: 'EXPIRED',
      },
    });
    return { ok: false, status: 400, error: 'OTP_EXPIRED', message: 'OTP expired. Please request a new code.' };
  }

  if (otp.attemptCount >= otp.maxAttempts) {
    await prismaClient.staffOtp.update({
      where: { id: otp.id },
      data: { blockedAt: otp.expiresAt > now ? now : otp.expiresAt },
    });
    return { ok: false, status: 429, error: 'OTP_ATTEMPTS_EXCEEDED', message: 'Too many incorrect attempts. Please request a new OTP.' };
  }

  const hashed = hashOtpCode({ phoneE164, purpose, code });
  if (hashed !== otp.codeHash) {
    const nextAttemptCount = otp.attemptCount + 1;
    await prismaClient.staffOtp.update({
      where: { id: otp.id },
      data: {
        attemptCount: nextAttemptCount,
        blockedAt: nextAttemptCount >= otp.maxAttempts ? now : null,
      },
    });
    if (nextAttemptCount >= otp.maxAttempts) {
      return { ok: false, status: 429, error: 'OTP_ATTEMPTS_EXCEEDED', message: 'Too many incorrect attempts. Please request a new OTP.' };
    }
    return { ok: false, status: 400, error: 'OTP_INVALID', message: 'Invalid OTP code.' };
  }

  if (consumeOnSuccess) {
    await prismaClient.staffOtp.update({
      where: { id: otp.id },
      data: { consumedAt: now },
    });
  }

  return {
    ok: true,
    otp: {
      id: otp.id,
      phoneE164: otp.phoneE164,
      purpose: otp.purpose,
      expiresAt: otp.expiresAt,
      attemptCount: otp.attemptCount,
      maxAttempts: otp.maxAttempts,
    },
    expiresInSeconds: otpRemainingSeconds(otp.expiresAt, now),
  };
}