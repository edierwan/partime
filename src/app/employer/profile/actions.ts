'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireEmployerPortalContext } from '@/lib/employer-portal';
import { toTitleCaseInput } from '@/lib/input-formatting';
import { validateMalaysiaLocation } from '@/lib/malaysia-locations';
import { normalizeMalaysiaPhone } from '@/lib/staff';
import { saveEmployerLogo } from '@/lib/uploads';

export async function saveEmployerProfile(formData: FormData) {
  const context = await requireEmployerPortalContext();

  const companyName = toTitleCaseInput(String(formData.get('companyName') || '')).trim();
  const businessRegistrationNo = String(formData.get('businessRegistrationNo') || '').trim() || null;
  const industry = String(formData.get('industry') || '').trim() || null;
  const contactPersonName = toTitleCaseInput(String(formData.get('contactPersonName') || '')).trim();
  const contactPhoneE164 = normalizeMalaysiaPhone(String(formData.get('contactPhone') || '').trim());
  const contactEmailInput = String(formData.get('contactEmail') || '').trim();
  const contactEmail = normalizeOptionalEmail(contactEmailInput);
  const addressLine1 = toTitleCaseInput(String(formData.get('addressLine1') || '')).trim();
  const addressLine2Value = toTitleCaseInput(String(formData.get('addressLine2') || '')).trim();
  const addressLine2 = addressLine2Value || null;
  const stateCode = String(formData.get('stateCode') || '').trim().toUpperCase();
  const state = String(formData.get('state') || '').trim();
  const city = String(formData.get('city') || '').trim();
  const postcode = String(formData.get('postcode') || '').trim();

  if (!companyName || !contactPersonName || !contactPhoneE164 || !addressLine1) {
    redirect('/employer/profile?error=invalid');
  }
  if (contactEmailInput && !contactEmail) {
    redirect('/employer/profile?error=email');
  }

  const location = await validateMalaysiaLocation({
    stateCode,
    stateName: state,
    cityName: city,
    postcode,
    country: 'Malaysia',
    requireState: true,
    requireCity: true,
    requirePostcode: true,
    requireVerifiedPostcode: true,
    allowCustomCity: true,
  });
  if (!location.ok) {
    redirect('/employer/profile?error=location');
  }

  let logoData: { logoUrl?: string; logoKey?: string } = {};
  const companyLogo = formData.get('companyLogo');
  if (companyLogo instanceof File && companyLogo.size > 0) {
    const uploaded = await saveEmployerLogo({ tenantId: context.tenant.id, file: companyLogo });
    logoData = { logoUrl: uploaded.url, logoKey: uploaded.key };
  }

  const resubmittingRejected = context.registration?.status === 'REJECTED' || context.tenant.status === 'REJECTED';
  const nextRegistrationStatus = resubmittingRejected ? 'PENDING_REVIEW' : context.registration?.status || 'PENDING_REVIEW';
  const nextTenantStatus = context.tenant.status === 'REJECTED' ? 'PENDING_REVIEW' : context.tenant.status;

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: context.tenant.id },
      data: {
        name: companyName,
        registrationNo: businessRegistrationNo,
        businessType: industry,
        phoneE164: contactPhoneE164,
        email: contactEmail,
        addressLine1,
        addressLine2,
        city: location.data.cityName,
        state: location.data.stateName,
        stateCode: location.data.stateCode,
        postcode: location.data.postcode,
        country: location.data.country,
        status: nextTenantStatus,
        ...logoData,
      },
    });

    const registrationData = {
      companyName,
      contactPersonName,
      contactPhoneE164,
      contactEmail,
      businessRegistrationNo,
      industry,
      addressLine1,
      addressLine2,
      city: location.data.cityName,
      state: location.data.stateName,
      stateCode: location.data.stateCode,
      postcode: location.data.postcode,
      country: location.data.country,
      status: nextRegistrationStatus,
      rejectionReason: resubmittingRejected ? null : context.registration?.rejectionReason || null,
    };

    if (context.registration) {
      await tx.employerRegistration.update({ where: { id: context.registration.id }, data: registrationData });
    } else {
      await tx.employerRegistration.create({
        data: {
          tenantId: context.tenant.id,
          expectedHiringNeeds: [],
          notes: null,
          otpVerifiedAt: new Date(),
          ...registrationData,
        },
      });
    }
  });

  revalidatePath('/employer/dashboard');
  revalidatePath('/employer/profile');
  revalidatePath('/employer/settings');
  redirect(`/employer/profile?saved=1${resubmittingRejected ? '&resubmitted=1' : ''}`);
}

function normalizeOptionalEmail(input: string): string | null {
  const value = String(input || '').trim().toLowerCase();
  if (!value) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}