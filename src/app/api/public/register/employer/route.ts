import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db';
import { createSessionToken, setSessionCookie } from '@/lib/auth';
import { parseEmployerRegistrationForm } from '@/lib/employer-registration';
import { employerDashboardPath } from '@/lib/employer-portal';
import { verifyOtpCode } from '@/lib/otp-service';
import { uniqueTenantSlug } from '@/lib/tenant';
import { saveEmployerLogo } from '@/lib/uploads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PURPOSE = 'EMPLOYER_REGISTER';

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ ok: false, message: 'Invalid submission.' }, { status: 400 });

  const parsed = await parseEmployerRegistrationForm(formData);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.error, fieldErrors: parsed.fieldErrors }, { status: 400 });
  }

  const value = parsed.data;

  const otpCode = String(formData.get('otpCode') || '').trim();
  if (!/^\d{4}$/.test(otpCode)) {
    return NextResponse.json({ ok: false, message: 'Enter the 4-digit OTP code.', fieldErrors: { otpCode: 'Enter the 4-digit OTP code.' } }, { status: 400 });
  }

  const otpResult = await verifyOtpCode({
    phoneE164: value.contactPhoneE164,
    purpose: PURPOSE as any,
    code: otpCode,
  });
  if (!otpResult.ok) {
    return NextResponse.json({ ok: false, error: otpResult.error, message: otpResult.message, fieldErrors: { otpCode: otpResult.message } }, { status: otpResult.status });
  }

  const existingIdentity = await prisma.userIdentity.findFirst({
    where: {
      OR: [
        { type: 'PHONE', valueNormalized: value.contactPhoneE164 },
        ...(value.contactEmail ? [{ type: 'EMAIL' as const, valueNormalized: value.contactEmail }] : []),
      ],
    },
    select: { id: true },
  });
  if (existingIdentity) {
    return NextResponse.json({ ok: false, message: 'This email or phone number is already registered.' }, { status: 400 });
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(value.password, 10);
  const legacyPasswordHash = await bcrypt.hash(randomUUID(), 10);

  const created = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: value.companyName,
        slug: await uniqueTenantSlug(value.companyName),
        registrationNo: value.businessRegistrationNo,
        businessType: value.industry,
        phoneE164: value.contactPhoneE164,
        email: value.contactEmail,
        addressLine1: value.addressLine1,
        addressLine2: value.addressLine2,
        city: value.city,
        state: value.state,
        stateCode: value.stateCode,
        postcode: value.postcode,
        country: value.country,
        status: 'PENDING_REVIEW',
      },
      select: { id: true },
    });

    const ownerEmail = await resolveEmployerOwnerEmail(value.contactEmail, tenant.id, tx);
    const owner = await tx.userAccount.create({
      data: {
        displayName: value.contactPersonName,
        status: 'ACTIVE',
        preferredLocale: 'ms',
        identities: {
          create: [
            {
              type: 'PHONE',
              valueNormalized: value.contactPhoneE164,
              valueDisplay: value.contactPhone,
              verifiedAt: now,
              isPrimary: true,
            },
            ...(value.contactEmail ? [{
              type: 'EMAIL' as const,
              valueNormalized: value.contactEmail,
              valueDisplay: value.contactEmail,
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

    const legacyOwner = await tx.adminUser.create({
      data: {
        email: ownerEmail,
        passwordHash: legacyPasswordHash,
        name: value.contactPersonName,
        platformRole: 'EMPLOYER_OWNER',
      },
      select: { id: true, email: true, name: true },
    });

    await tx.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        adminUserId: legacyOwner.id,
        userId: owner.id,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: now,
      },
    });

    await tx.employerRegistration.create({
      data: {
        tenantId: tenant.id,
        submittedByUserId: owner.id,
        companyName: value.companyName,
        contactPersonName: value.contactPersonName,
        contactPhoneE164: value.contactPhoneE164,
        contactEmail: value.contactEmail,
        businessRegistrationNo: value.businessRegistrationNo,
        industry: value.industry,
        addressLine1: value.addressLine1,
        addressLine2: value.addressLine2,
        city: value.city,
        state: value.state,
        stateCode: value.stateCode,
        postcode: value.postcode,
        country: value.country,
        expectedHiringNeeds: value.hiringNeeds,
        notes: value.notes,
        status: 'PENDING_REVIEW',
        otpVerifiedAt: now,
      },
    });

    await tx.staffOtp.update({ where: { id: otpResult.otp.id }, data: { consumedAt: now } });

    return { tenant, owner, ownerEmail };
  });

  let warning: string | null = null;
  const logo = formData.get('companyLogo');
  if (logo instanceof File && logo.size > 0) {
    try {
      const uploaded = await saveEmployerLogo({ tenantId: created.tenant.id, file: logo });
      await prisma.tenant.update({ where: { id: created.tenant.id }, data: { logoUrl: uploaded.url, logoKey: uploaded.key } });
    } catch {
      warning = 'Registration completed, but the company logo could not be stored. Admin can add it later.';
    }
  }

  const token = await createSessionToken({
    sub: created.owner.id,
    email: value.contactEmail || created.ownerEmail,
    name: created.owner.displayName || value.contactPersonName,
    role: 'EMPLOYER',
    tenantId: created.tenant.id,
    phoneE164: value.contactPhoneE164,
  });
  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    message: 'Employer registration successful. Your workspace is pending admin review.',
    warning,
    redirectTo: `${employerDashboardPath()}?registered=1`,
  });
}

async function resolveEmployerOwnerEmail(contactEmail: string | null, tenantId: string, client: Pick<typeof prisma, 'adminUser'> = prisma): Promise<string> {
  const preferredEmail = String(contactEmail || '').trim().toLowerCase();
  if (preferredEmail) {
    const existing = await client.adminUser.findUnique({ where: { email: preferredEmail }, select: { id: true } });
    if (!existing) return preferredEmail;
  }

  return `owner+${tenantId}@employer.partime.local`;
}