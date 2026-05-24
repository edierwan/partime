import { validateMalaysiaLocation } from '@/lib/malaysia-locations';
import { toTitleCaseInput } from '@/lib/input-formatting';
import { validateEmployerRegistrationDraft } from '@/lib/public-registration-validation';

export interface EmployerRegistrationFormData {
  companyName: string;
  businessRegistrationNo: string | null;
  contactPersonName: string;
  contactPhone: string;
  contactPhoneE164: string;
  contactEmail: string | null;
  password: string;
  industry: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  stateCode: string;
  postcode: string;
  country: string;
  notes: string | null;
  hiringNeeds: string[];
}

export type EmployerRegistrationParseResult =
  | { ok: true; data: EmployerRegistrationFormData }
  | { ok: false; error: string; fieldErrors: Record<string, string> };

export async function parseEmployerRegistrationForm(fd: FormData): Promise<EmployerRegistrationParseResult> {
  const basic = validateEmployerRegistrationDraft(fd);
  if (!basic.ok) {
    return { ok: false, error: 'Invalid input', fieldErrors: basic.fieldErrors };
  }

  const location = await validateMalaysiaLocation({
    stateCode: basic.data.stateCode,
    stateName: basic.data.state,
    cityName: basic.data.city,
    postcode: basic.data.postcode,
    country: basic.data.country,
    requireState: true,
    requireCity: true,
    requirePostcode: true,
    requireVerifiedPostcode: true,
    allowCustomCity: true,
  });
  if (!location.ok) {
    return { ok: false, error: 'Invalid input', fieldErrors: location.fieldErrors };
  }

  return {
    ok: true,
    data: {
      companyName: toTitleCaseInput(basic.data.companyName),
      businessRegistrationNo: basic.data.businessRegistrationNo || null,
      contactPersonName: toTitleCaseInput(basic.data.contactPersonName),
      contactPhone: basic.data.contactPhone,
      contactPhoneE164: basic.data.contactPhoneE164 || '',
      contactEmail: basic.data.contactEmail || null,
      password: basic.data.password,
      industry: basic.data.industry,
      addressLine1: toTitleCaseInput(basic.data.addressLine1),
      addressLine2: basic.data.addressLine2 ? toTitleCaseInput(basic.data.addressLine2) : null,
      city: location.data.cityName,
      state: location.data.stateName,
      stateCode: location.data.stateCode,
      postcode: location.data.postcode || '',
      country: location.data.country,
      notes: basic.data.notes || null,
      hiringNeeds: basic.data.hiringNeeds,
    },
  };
}