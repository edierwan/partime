import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashOtpCode } from '@/lib/otp';
import { parseStaffProfileForm } from '@/lib/staff-profile';
import { saveStaffProfileImage } from '@/lib/uploads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ ok: false, message: 'Invalid submission.' }, { status: 400 });
  }

  const parsed = await parseStaffProfileForm(formData, { defaultApprovalStatus: 'PENDING_REVIEW', defaultActive: true });
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.error, fieldErrors: parsed.fieldErrors }, { status: 400 });
  }

  const data = parsed.data;
  const otpCode = String(formData.get('otpCode') || '').trim();
  if (!/^\d{4}$/.test(otpCode)) {
    return NextResponse.json({ ok: false, message: 'Enter the 4-digit OTP code.', fieldErrors: { otpCode: 'Enter the 4-digit OTP code.' } }, { status: 400 });
  }

  const otp = await prisma.staffOtp.findFirst({
    where: {
      phoneE164: data.phoneE164,
      purpose: 'STAFF_REGISTER',
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp || otp.sendStatus !== 'SENT' || otp.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, message: 'OTP expired. Please request a new code.' }, { status: 400 });
  }
  if (otp.attemptCount >= otp.maxAttempts) {
    return NextResponse.json({ ok: false, message: 'Too many incorrect OTP attempts. Please request a new code.' }, { status: 429 });
  }

  const hashed = hashOtpCode({ phoneE164: data.phoneE164, purpose: 'STAFF_REGISTER', code: otpCode });
  if (hashed !== otp.codeHash) {
    await prisma.staffOtp.update({ where: { id: otp.id }, data: { attemptCount: { increment: 1 } } });
    return NextResponse.json({ ok: false, message: 'Invalid OTP code.', fieldErrors: { otpCode: 'Invalid OTP code.' } }, { status: 400 });
  }

  const duplicate = await prisma.staff.findFirst({
    where: {
      OR: [
        { phoneE164: data.phoneE164 },
        { aliasPanggilan: data.aliasPanggilan },
        ...(data.email ? [{ email: data.email }] : []),
        ...(data.icNumberNormalized ? [{ icNumberNormalized: data.icNumberNormalized }] : []),
      ],
    },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({ ok: false, message: 'We could not complete registration. Please contact admin if you already registered.' }, { status: 400 });
  }

  const created = await prisma.staff.create({
    data: {
      payName: data.payName,
      aliasPanggilan: data.aliasPanggilan,
      fullName: data.fullName,
      icNumberNormalized: data.icNumberNormalized,
      icNumberDisplay: data.icNumberDisplay,
      gender: data.gender,
      phoneE164: data.phoneE164,
      phoneDisplay: data.phoneDisplay,
      email: data.email,
      bankCode: data.bankCode,
      bankName: data.bankName,
      customBankName: data.customBankName,
      bankAccountNumber: data.bankAccountNumber,
      approvalStatus: 'PENDING_REVIEW',
      active: true,
      notes: data.notes,
    },
    select: { id: true },
  });

  let warning: string | null = null;
  if (data.profileImage) {
    try {
      const uploaded = await saveStaffProfileImage({ staffId: created.id, file: data.profileImage });
      await prisma.staff.update({
        where: { id: created.id },
        data: { profileImageKey: uploaded.key, profileImageUrl: uploaded.url },
      });
    } catch {
      warning = 'Registration completed, but the profile photo could not be stored. Admin can add it later.';
    }
  }

  await prisma.staffOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

  return NextResponse.json({
    ok: true,
    message: 'Registration submitted. Your profile is pending admin review.',
    warning,
  });
}