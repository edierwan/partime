import { createHash, randomInt } from 'node:crypto';

export const OTP_TTL_MINUTES = 5;
export const OTP_TTL_SECONDS = OTP_TTL_MINUTES * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS_PER_PHONE = 3;
export const OTP_MAX_SENDS_PER_IP = 10;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_PHONE_WINDOW_MINUTES = 15;
export const OTP_IP_WINDOW_MINUTES = 60;

function otpSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET (or NEXTAUTH_SECRET) is required for OTP hashing');
  return secret;
}

export function generateOtpCode(): string {
  return String(randomInt(0, 10_000)).padStart(4, '0');
}

export function hashOtpCode({ phoneE164, purpose, code }: { phoneE164: string; purpose: string; code: string }): string {
  return createHash('sha256').update(`${otpSecret()}:${purpose}:${phoneE164}:${code}`).digest('hex');
}

export function otpExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + OTP_TTL_MINUTES * 60 * 1000);
}

export function otpRemainingSeconds(expiresAt: Date, now = new Date()): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000));
}

export function otpCooldownRemainingSeconds(lastSentAt: Date, now = new Date()): number {
  return Math.max(0, OTP_RESEND_COOLDOWN_SECONDS - Math.floor((now.getTime() - lastSentAt.getTime()) / 1000));
}

export function maskOtpPhone(phoneE164: string): string {
  const digits = String(phoneE164 || '').replace(/\D/g, '');
  if (!digits) return '';
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function safeOtpMessage(code: string): string {
  return `Your Partime verification code is ${code}. This code expires in 5 minutes.`;
}