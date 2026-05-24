import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSessionToken, setSessionCookie } from '@/lib/auth';
import { verifyOtpCode } from '@/lib/otp-service';
import { parseStaffProfileForm } from '@/lib/staff-profile';
import { savePartTimerPortfolioMedia, saveStaffProfileImage } from '@/lib/uploads';
import { syncPartTimerSkills } from '@/lib/skills';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PURPOSE = 'PART_TIMER_REGISTER';

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ ok: false, message: 'Invalid submission.' }, { status: 400 });

  const parsed = await parseStaffProfileForm(formData, {
    defaultApprovalStatus: 'PENDING_REVIEW',
    defaultStatus: 'PENDING_REVIEW',
    defaultActive: true,
    requireIdentity: true,
    requireSkills: true,
    requireConsent: true,
    requireStructuredLocation: true,
    requirePassword: true,
  });
  if (!parsed.ok) return NextResponse.json({ ok: false, message: parsed.error, fieldErrors: parsed.fieldErrors }, { status: 400 });

  const data = parsed.data;
  const otpCode = String(formData.get('otpCode') || '').trim();
  if (!/^\d{4}$/.test(otpCode)) {
    return NextResponse.json({ ok: false, message: 'Enter the 4-digit OTP code.', fieldErrors: { otpCode: 'Enter the 4-digit OTP code.' } }, { status: 400 });
  }

  const otpResult = await verifyOtpCode({
    phoneE164: data.phoneE164,
    purpose: PURPOSE as any,
    code: otpCode,
  });
  if (!otpResult.ok) {
    return NextResponse.json({ ok: false, error: otpResult.error, message: otpResult.message, fieldErrors: { otpCode: otpResult.message } }, { status: otpResult.status });
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

  const existingIdentity = await prisma.userIdentity.findFirst({
    where: {
      OR: [
        { type: 'PHONE', valueNormalized: data.phoneE164 },
        ...(data.email ? [{ type: 'EMAIL' as const, valueNormalized: data.email }] : []),
      ],
    },
    select: { id: true },
  });
  if (existingIdentity) {
    return NextResponse.json({ ok: false, message: 'This email or phone number is already registered.' }, { status: 400 });
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(data.password || '', 10);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.userAccount.create({
      data: {
        displayName: data.fullName,
        status: 'PENDING',
        preferredLocale: 'ms',
        identities: {
          create: [
            {
              type: 'PHONE',
              valueNormalized: data.phoneE164,
              valueDisplay: data.phoneDisplay,
              verifiedAt: now,
              isPrimary: true,
            },
            ...(data.email ? [{
              type: 'EMAIL' as const,
              valueNormalized: data.email,
              valueDisplay: data.email,
              verifiedAt: null,
              isPrimary: false,
            }] : []),
          ],
        },
        credential: {
          create: {
            passwordHash,
            passwordUpdatedAt: now,
          },
        },
      },
      select: { id: true, displayName: true },
    });

    const staff = await tx.staff.create({
      data: {
        userId: user.id,
        payName: data.payName,
        aliasPanggilan: data.aliasPanggilan,
        fullName: data.fullName,
        icNumberNormalized: data.icNumberNormalized,
        icNumberDisplay: data.icNumberDisplay,
        gender: data.gender,
        nationality: data.nationality,
        otherNationality: data.otherNationality,
        passportNumber: data.passportNumber,
        phoneE164: data.phoneE164,
        phoneDisplay: data.phoneDisplay,
        email: data.email,
        stateCode: data.stateCode,
        state: data.state,
        city: data.city,
        postcode: data.postcode,
        bankCode: data.bankCode,
        bankName: data.bankName,
        customBankName: data.customBankName,
        bankAccountNumber: data.bankAccountNumber,
        approvalStatus: 'PENDING_REVIEW',
        status: 'PENDING_REVIEW',
        preferredLocation: data.preferredLocation,
        availability: data.availability,
        active: true,
        notes: data.notes,
      },
      select: { id: true },
    });

    await tx.staffOtp.update({ where: { id: otpResult.otp.id }, data: { consumedAt: now } });
    return { staff, user };
  });

  await syncPartTimerSkills({ partTimerId: created.staff.id, skillIds: data.skillIds, otherSkillName: data.otherSkillName });

  let warning: string | null = null;
  if (data.profileImage) {
    try {
      const uploaded = await saveStaffProfileImage({ staffId: created.staff.id, file: data.profileImage });
      await prisma.staff.update({ where: { id: created.staff.id }, data: { profileImageKey: uploaded.key, profileImageUrl: uploaded.url } });
    } catch {
      warning = 'Registration completed, but the profile photo could not be stored. Admin can add it later.';
    }
  }

  const portfolioFiles = formData.getAll('portfolioMedia').filter((file): file is File => file instanceof File && file.size > 0).slice(0, 6);
  if (portfolioFiles.length > 0) {
    try {
      const uploads = [];
      for (const [index, file] of portfolioFiles.entries()) {
        const uploaded = await savePartTimerPortfolioMedia({ partTimerId: created.staff.id, file });
        uploads.push({
          partTimerId: created.staff.id,
          mediaType: uploaded.mediaType,
          title: uploaded.filename,
          url: uploaded.url,
          key: uploaded.key,
          filename: uploaded.filename,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.sizeBytes,
          sortOrder: index,
        });
      }
      await prisma.partTimerPortfolioMedia.createMany({ data: uploads });
    } catch {
      warning = warning || 'Registration completed, but portfolio media could not be stored. Admin can add it later.';
    }
  }

  const token = await createSessionToken({
    sub: created.user.id,
    email: data.email || '',
    name: created.user.displayName || data.fullName,
    role: 'WORKER',
    tenantId: null,
    phoneE164: data.phoneE164,
  });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true, message: 'Registration successful. Your profile is pending admin review.', warning, redirectTo: '/worker/dashboard?registered=1' });
}