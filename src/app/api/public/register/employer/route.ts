import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseEmployerRegistrationForm } from '@/lib/employer-registration';
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

  const tenant = await prisma.tenant.create({
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

  let warning: string | null = null;
  const logo = formData.get('companyLogo');
  if (logo instanceof File && logo.size > 0) {
    try {
      const uploaded = await saveEmployerLogo({ tenantId: tenant.id, file: logo });
      await prisma.tenant.update({ where: { id: tenant.id }, data: { logoUrl: uploaded.url, logoKey: uploaded.key } });
    } catch {
      warning = 'Registration completed, but the company logo could not be stored. Admin can add it later.';
    }
  }

  await prisma.employerRegistration.create({
    data: {
      tenantId: tenant.id,
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
      otpVerifiedAt: new Date(),
    },
  });

  await prisma.staffOtp.update({ where: { id: otpResult.otp.id }, data: { consumedAt: new Date() } });
  return NextResponse.json({ ok: true, message: 'Employer registration successful. Your workspace is pending admin review.', warning });
}