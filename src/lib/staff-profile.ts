import { z } from 'zod';
import {
  AVAILABILITY_OPTIONS,
  formatIcNumber,
  formatMalaysiaPhoneDisplay,
  genderFromIc,
  isValidMalaysiaIc,
  NATIONALITY_OPTIONS,
  normalizeAliasPanggilan,
  normalizeBankAccount,
  normalizeIcNumber,
  normalizeMalaysiaPhone,
  normalizePassportNumber,
  resolveBankName,
  validateBankAccount,
} from '@/lib/staff';
import { validateMalaysiaLocation } from '@/lib/malaysia-locations';
import { validateProfileImage } from '@/lib/uploads';

export type StaffApprovalStatusValue = 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';
export type PartTimerStatusValue = 'PENDING_OTP' | 'PENDING_REVIEW' | 'ACTIVE' | 'INACTIVE' | 'REJECTED' | 'SUSPENDED';
export type StaffGenderFormValue = 'AUTO' | 'LELAKI' | 'PEREMPUAN' | 'TIDAK_DINYATAKAN' | 'UNKNOWN';

const rawSchema = z.object({
  id: z.string().optional(),
  payName: z.string().trim().min(1, 'Pay name required'),
  aliasPanggilan: z.string().trim().min(2, 'Alias too short'),
  fullName: z.string().trim().min(1, 'Full name required'),
  phone: z.string().trim().min(1, 'Phone number required'),
  email: z.string().trim().optional().default(''),
  icNumber: z.string().trim().optional().default(''),
  gender: z.enum(['AUTO', 'LELAKI', 'PEREMPUAN', 'TIDAK_DINYATAKAN', 'UNKNOWN']).optional().default('AUTO'),
  nationality: z.string().trim().optional().default('Malaysia'),
  otherNationality: z.string().trim().optional().default(''),
  passportNumber: z.string().trim().optional().default(''),
  preferredLocation: z.string().trim().optional().default(''),
  stateCode: z.string().trim().optional().default(''),
  state: z.string().trim().optional().default(''),
  city: z.string().trim().optional().default(''),
  postcode: z.string().trim().optional().default(''),
  country: z.string().trim().optional().default('Malaysia'),
  bankCode: z.string().trim().optional().default(''),
  customBankName: z.string().trim().optional().default(''),
  bankAccountNumber: z.string().trim().optional().default(''),
  approvalStatus: z.enum(['APPROVED', 'PENDING_REVIEW', 'REJECTED']).optional(),
  status: z.enum(['PENDING_OTP', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE', 'REJECTED', 'SUSPENDED']).optional(),
  active: z.coerce.boolean().optional(),
  notes: z.string().trim().optional().default(''),
  removeProfileImage: z.coerce.boolean().optional().default(false),
});

export interface StaffProfileFormData {
  id?: string;
  payName: string;
  aliasPanggilan: string;
  fullName: string;
  icNumberNormalized: string | null;
  icNumberDisplay: string | null;
  gender: 'LELAKI' | 'PEREMPUAN' | 'TIDAK_DINYATAKAN';
  nationality: string;
  otherNationality: string | null;
  passportNumber: string | null;
  phoneE164: string;
  phoneDisplay: string;
  email: string | null;
  stateCode: string | null;
  state: string | null;
  city: string | null;
  postcode: string | null;
  country: string;
  bankCode: string | null;
  bankName: string | null;
  customBankName: string | null;
  bankAccountNumber: string | null;
  approvalStatus: StaffApprovalStatusValue;
  status: PartTimerStatusValue;
  preferredLocation: string | null;
  availability: string[];
  skillIds: string[];
  otherSkillName: string | null;
  active: boolean;
  notes: string | null;
  removeProfileImage: boolean;
  profileImage: File | null;
}

export type StaffProfileParseResult =
  | { ok: true; data: StaffProfileFormData }
  | { ok: false; error: string; fieldErrors: Record<string, string> };

export async function parseStaffProfileForm(
  fd: FormData,
  {
    defaultApprovalStatus = 'APPROVED',
    defaultStatus = 'ACTIVE',
    defaultActive = true,
    requireIdentity = false,
    requireSkills = false,
    requireConsent = false,
    requireStructuredLocation = false,
  }: {
    defaultApprovalStatus?: StaffApprovalStatusValue;
    defaultStatus?: PartTimerStatusValue;
    defaultActive?: boolean;
    requireIdentity?: boolean;
    requireSkills?: boolean;
    requireConsent?: boolean;
    requireStructuredLocation?: boolean;
  } = {},
): Promise<StaffProfileParseResult> {
  const raw = {
    id: stringValue(fd, 'id') || undefined,
    payName: stringValue(fd, 'payName'),
    aliasPanggilan: stringValue(fd, 'aliasPanggilan') || stringValue(fd, 'alias'),
    fullName: stringValue(fd, 'fullName'),
    phone: stringValue(fd, 'phone'),
    email: stringValue(fd, 'email'),
    icNumber: stringValue(fd, 'icNumber'),
    gender: (stringValue(fd, 'gender') || 'AUTO') as StaffGenderFormValue,
    nationality: stringValue(fd, 'nationality') || 'Malaysia',
    otherNationality: stringValue(fd, 'otherNationality'),
    passportNumber: stringValue(fd, 'passportNumber'),
    preferredLocation: stringValue(fd, 'preferredLocation'),
    stateCode: stringValue(fd, 'stateCode'),
    state: stringValue(fd, 'state'),
    city: stringValue(fd, 'city'),
    postcode: stringValue(fd, 'postcode'),
    country: stringValue(fd, 'country') || 'Malaysia',
    bankCode: stringValue(fd, 'bankCode'),
    customBankName: stringValue(fd, 'customBankName'),
    bankAccountNumber: stringValue(fd, 'bankAccountNumber') || stringValue(fd, 'bankAccount'),
    approvalStatus: (stringValue(fd, 'approvalStatus') || undefined) as StaffApprovalStatusValue | undefined,
    status: (stringValue(fd, 'status') || undefined) as PartTimerStatusValue | undefined,
    active: fd.get('active') === 'on' || fd.get('active') === 'true',
    notes: stringValue(fd, 'notes'),
    removeProfileImage: fd.get('removeProfileImage') === 'on' || fd.get('removeProfileImage') === 'true',
  };

  const parsed = rawSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.errors.forEach((issue) => {
      if (issue.path[0]) fieldErrors[String(issue.path[0])] = issue.message;
    });
    return { ok: false, error: 'Invalid input', fieldErrors };
  }

  const fileValue = fd.get('profileImage');
  const profileImage = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  try {
    await validateProfileImage(profileImage);
  } catch (error) {
    return {
      ok: false,
      error: 'Invalid profile image',
      fieldErrors: { profileImage: error instanceof Error ? error.message : 'Invalid profile image' },
    };
  }

  const value = parsed.data;
  const fieldErrors: Record<string, string> = {};
  const skillIds = stringValues(fd, 'skillIds').filter(Boolean);
  const otherSkillName = stringValue(fd, 'otherSkillName') || null;
  const availability = stringValues(fd, 'availability').filter((item) => (AVAILABILITY_OPTIONS as readonly string[]).includes(item));

  const aliasPanggilan = normalizeAliasPanggilan(value.aliasPanggilan);
  if (!/^[A-Z0-9._-]{2,32}$/.test(aliasPanggilan)) {
    fieldErrors.aliasPanggilan = 'Alias must be 2-32 characters using letters, numbers, dot, dash, or underscore';
  }

  const phoneE164 = normalizeMalaysiaPhone(value.phone);
  if (!phoneE164) {
    fieldErrors.phone = 'Enter a valid Malaysia mobile number';
  }

  let normalizedLocation = {
    stateCode: value.stateCode || null,
    state: value.state || null,
    city: value.city || null,
    postcode: value.postcode || null,
    country: value.country || 'Malaysia',
    preferredLocation: value.preferredLocation || null,
  };
  const hasStructuredLocationInput = Boolean(value.stateCode || value.state || value.city || value.postcode);
  if (requireStructuredLocation || hasStructuredLocationInput) {
    const locationResult = await validateMalaysiaLocation({
      stateCode: value.stateCode,
      stateName: value.state,
      cityName: value.city,
      postcode: value.postcode,
      country: value.country,
      requireState: requireStructuredLocation,
      requireCity: requireStructuredLocation,
      requirePostcode: requireStructuredLocation,
      allowCustomCity: true,
    });
    if (!locationResult.ok) {
      Object.assign(fieldErrors, locationResult.fieldErrors);
    } else {
      normalizedLocation = {
        stateCode: locationResult.data.stateCode,
        state: locationResult.data.stateName,
        city: locationResult.data.cityName,
        postcode: locationResult.data.postcode,
        country: locationResult.data.country,
        preferredLocation: locationResult.data.preferredLocation,
      };
    }
  }

  const email = value.email ? value.email.toLowerCase() : '';
  if (email && !z.string().email().safeParse(email).success) {
    fieldErrors.email = 'Enter a valid email address';
  }

  const icNumberNormalized = normalizeIcNumber(value.icNumber);
  const nationality = resolveNationality(value.nationality, value.otherNationality);
  const passportNumber = normalizePassportNumber(value.passportNumber);
  if (nationality === 'Malaysia' && requireIdentity && !icNumberNormalized) {
    fieldErrors.icNumber = 'IC number is required for Malaysian part-timers';
  } else if (value.icNumber && !isValidMalaysiaIc(icNumberNormalized)) {
    fieldErrors.icNumber = 'Enter a valid Malaysia IC number';
  }
  if (nationality !== 'Malaysia' && requireIdentity && !passportNumber) {
    fieldErrors.passportNumber = 'Passport number is required for non-Malaysian part-timers';
  }
  if (value.nationality === 'Other' && !value.otherNationality.trim()) {
    fieldErrors.otherNationality = 'Enter nationality';
  }
  if (requireSkills && skillIds.length === 0) {
    fieldErrors.skillIds = 'Please select at least one skill.';
  }
  if (requireConsent && fd.get('consent') !== 'on' && fd.get('consent') !== 'true') {
    fieldErrors.consent = 'Consent is required';
  }

  const bankCode = value.bankCode || '';
  const customBankName = value.customBankName.trim();
  const bankAccountNumber = normalizeBankAccount(value.bankAccountNumber);
  if (bankAccountNumber && !bankCode) {
    fieldErrors.bankCode = 'Select a bank before entering account number';
  }
  if (bankCode === 'OTHER' && !customBankName) {
    fieldErrors.customBankName = 'Enter the bank name';
  }
  const bankValidation = validateBankAccount(bankCode || null, bankAccountNumber || null);
  if (!bankValidation.ok) {
    fieldErrors.bankAccountNumber = bankValidation.error || 'Invalid bank account number';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: 'Invalid input', fieldErrors };
  }

  const derivedGender = icNumberNormalized ? genderFromIc(icNumberNormalized) : 'TIDAK_DINYATAKAN';
  const gender = value.gender === 'AUTO' || value.gender === 'UNKNOWN' ? derivedGender : value.gender;

  return {
    ok: true,
    data: {
      id: value.id,
      payName: value.payName,
      aliasPanggilan,
      fullName: value.fullName,
      icNumberNormalized: icNumberNormalized || null,
      icNumberDisplay: icNumberNormalized ? formatIcNumber(icNumberNormalized) : null,
      gender,
      nationality,
      otherNationality: value.nationality === 'Other' ? value.otherNationality.trim() || null : null,
      passportNumber: passportNumber || null,
      phoneE164,
      phoneDisplay: formatMalaysiaPhoneDisplay(phoneE164),
      email: email || null,
      stateCode: normalizedLocation.stateCode,
      state: normalizedLocation.state,
      city: normalizedLocation.city,
      postcode: normalizedLocation.postcode,
      country: normalizedLocation.country,
      bankCode: bankCode || null,
      bankName: resolveBankName(bankCode || null, null, customBankName || null),
      customBankName: customBankName || null,
      bankAccountNumber: bankAccountNumber || null,
      approvalStatus: value.approvalStatus || defaultApprovalStatus,
      status: value.status || defaultStatus,
      preferredLocation: normalizedLocation.preferredLocation,
      availability,
      skillIds,
      otherSkillName,
      active: value.active ?? defaultActive,
      notes: value.notes || null,
      removeProfileImage: value.removeProfileImage,
      profileImage,
    },
  };
}

function stringValue(fd: FormData, key: string): string {
  const value = fd.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function stringValues(fd: FormData, key: string): string[] {
  return fd.getAll(key).filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean);
}

function resolveNationality(nationality: string, otherNationality: string): string {
  const allowed = new Set(NATIONALITY_OPTIONS.map((item) => item.code));
  if (nationality === 'Other') return otherNationality.trim() || 'Other';
  return allowed.has(nationality) ? nationality : 'Malaysia';
}