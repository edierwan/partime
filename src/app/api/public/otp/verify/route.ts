import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashOtpCode } from '@/lib/otp';
import { normalizeMalaysiaPhone } from '@/lib/staff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedPurposes = new Set(['PART_TIMER_REGISTER', 'EMPLOYER_REGISTER']);

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 });

  const purpose = String(formData.get('purpose') || '').trim();
  const phoneE164 = normalizeMalaysiaPhone(String(formData.get('phone') || formData.get('contactPhone') || '').trim());
  const code = String(formData.get('otpCode') || '').trim();
  if (!allowedPurposes.has(purpose) || !phoneE164 || !/^\d{4}$/.test(code)) {
    return NextResponse.json({ ok: false, message: 'Invalid OTP request.' }, { status: 400 });
  }

  const otp = await prisma.staffOtp.findFirst({
    where: { phoneE164, purpose: purpose as any, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp || otp.sendStatus !== 'SENT' || otp.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, message: 'OTP expired. Please request a new code.' }, { status: 400 });
  }
  if (otp.attemptCount >= otp.maxAttempts) {
    return NextResponse.json({ ok: false, message: 'Too many incorrect OTP attempts. Please request a new code.' }, { status: 429 });
  }

  const hashed = hashOtpCode({ phoneE164, purpose, code });
  if (hashed !== otp.codeHash) {
    await prisma.staffOtp.update({ where: { id: otp.id }, data: { attemptCount: { increment: 1 } } });
    return NextResponse.json({ ok: false, message: 'Invalid OTP code.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}