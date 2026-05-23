import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashOtpCode } from '@/lib/otp';
import { normalizeMalaysiaPhone } from '@/lib/staff';
import { uniqueTenantSlug } from '@/lib/tenant';
import { saveEmployerLogo } from '@/lib/uploads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PURPOSE = 'EMPLOYER_REGISTER';

const schema = z.object({
  companyName: z.string().trim().min(2, 'Company name is required'),
  businessRegistrationNo: z.string().trim().optional().default(''),
  contactPersonName: z.string().trim().min(2, 'Contact person is required'),
  contactPhone: z.string().trim().min(1, 'Contact phone is required'),
  contactEmail: z.string().trim().email('Valid contact email is required'),
  industry: z.string().trim().min(1, 'Industry is required'),
  addressLine1: z.string().trim().min(1, 'Address is required'),
  addressLine2: z.string().trim().optional().default(''),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  postcode: z.string().trim().min(3, 'Postcode is required'),
  country: z.string().trim().optional().default('Malaysia'),
  notes: z.string().trim().optional().default(''),
});

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ ok: false, message: 'Invalid submission.' }, { status: 400 });

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.errors.forEach((issue) => {
      if (issue.path[0]) fieldErrors[String(issue.path[0])] = issue.message;
    });
    return NextResponse.json({ ok: false, message: 'Invalid input', fieldErrors }, { status: 400 });
  }

  if (formData.get('consent') !== 'on' && formData.get('consent') !== 'true') {
    return NextResponse.json({ ok: false, message: 'Consent is required.', fieldErrors: { consent: 'Consent is required.' } }, { status: 400 });
  }

  const value = parsed.data;
  const contactPhoneE164 = normalizeMalaysiaPhone(value.contactPhone);
  if (!contactPhoneE164) {
    return NextResponse.json({ ok: false, message: 'Enter a valid Malaysia mobile number.', fieldErrors: { contactPhone: 'Enter a valid Malaysia mobile number.' } }, { status: 400 });
  }

  const otpCode = String(formData.get('otpCode') || '').trim();
  if (!/^\d{4}$/.test(otpCode)) {
    return NextResponse.json({ ok: false, message: 'Enter the 4-digit OTP code.', fieldErrors: { otpCode: 'Enter the 4-digit OTP code.' } }, { status: 400 });
  }

  const otp = await prisma.staffOtp.findFirst({ where: { phoneE164: contactPhoneE164, purpose: PURPOSE as any, consumedAt: null }, orderBy: { createdAt: 'desc' } });
  if (!otp || otp.sendStatus !== 'SENT' || otp.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, message: 'OTP expired. Please request a new code.' }, { status: 400 });
  }
  if (otp.attemptCount >= otp.maxAttempts) {
    return NextResponse.json({ ok: false, message: 'Too many incorrect OTP attempts. Please request a new code.' }, { status: 429 });
  }
  if (hashOtpCode({ phoneE164: contactPhoneE164, purpose: PURPOSE, code: otpCode }) !== otp.codeHash) {
    await prisma.staffOtp.update({ where: { id: otp.id }, data: { attemptCount: { increment: 1 } } });
    return NextResponse.json({ ok: false, message: 'Invalid OTP code.', fieldErrors: { otpCode: 'Invalid OTP code.' } }, { status: 400 });
  }

  const hiringNeeds = formData.getAll('hiringNeeds').filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  const tenant = await prisma.tenant.create({
    data: {
      name: value.companyName,
      slug: await uniqueTenantSlug(value.companyName),
      registrationNo: value.businessRegistrationNo || null,
      businessType: value.industry,
      phoneE164: contactPhoneE164,
      email: value.contactEmail.toLowerCase(),
      addressLine1: value.addressLine1,
      addressLine2: value.addressLine2 || null,
      city: value.city,
      state: value.state,
      postcode: value.postcode,
      country: value.country || 'Malaysia',
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
      contactPhoneE164,
      contactEmail: value.contactEmail.toLowerCase(),
      businessRegistrationNo: value.businessRegistrationNo || null,
      industry: value.industry,
      addressLine1: value.addressLine1,
      addressLine2: value.addressLine2 || null,
      city: value.city,
      state: value.state,
      postcode: value.postcode,
      country: value.country || 'Malaysia',
      expectedHiringNeeds: hiringNeeds,
      notes: value.notes || null,
      status: 'PENDING_REVIEW',
      otpVerifiedAt: new Date(),
    },
  });

  await prisma.staffOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return NextResponse.json({ ok: true, message: 'Employer registration successful. Your workspace is pending admin review.', warning });
}