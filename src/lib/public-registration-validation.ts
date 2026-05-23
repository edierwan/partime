import { isValidMalaysiaIc, normalizeAliasPanggilan, normalizeIcNumber, normalizeMalaysiaPhone, normalizePassportNumber } from '@/lib/staff';

export type PublicFieldErrors = Record<string, string>;

type FormValueSource = FormData | URLSearchParams | Record<string, unknown>;

export interface EmployerRegistrationDraft {
  companyName: string;
  businessRegistrationNo: string;
  contactPersonName: string;
  contactPhone: string;
  contactPhoneE164: string | null;
  contactEmail: string | null;
  industry: string;
  addressLine1: string;
  addressLine2: string;
  stateCode: string;
  state: string;
  city: string;
  postcode: string;
  country: string;
  notes: string;
  hiringNeeds: string[];
  consent: boolean;
}

export interface PartTimerRegistrationDraft {
  payName: string;
  aliasPanggilan: string;
  fullName: string;
  nationality: string;
  otherNationality: string;
  icNumber: string;
  passportNumber: string;
  phone: string;
  phoneE164: string | null;
  email: string | null;
  stateCode: string;
  state: string;
  city: string;
  postcode: string;
  country: string;
  preferredLocation: string;
  skillIds: string[];
  consent: boolean;
}

export type PublicValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: 'REGISTRATION_INCOMPLETE'; fieldErrors: PublicFieldErrors; data: T };

export function validateEmployerRegistrationDraft(source: FormValueSource): PublicValidationResult<EmployerRegistrationDraft> {
  const data: EmployerRegistrationDraft = {
    companyName: valueOf(source, 'companyName'),
    businessRegistrationNo: valueOf(source, 'businessRegistrationNo'),
    contactPersonName: valueOf(source, 'contactPersonName'),
    contactPhone: valueOf(source, 'contactPhone') || valueOf(source, 'phone'),
    contactPhoneE164: null,
    contactEmail: normalizeOptionalEmail(valueOf(source, 'contactEmail')),
    industry: valueOf(source, 'industry'),
    addressLine1: valueOf(source, 'addressLine1'),
    addressLine2: valueOf(source, 'addressLine2'),
    stateCode: valueOf(source, 'stateCode').toUpperCase(),
    state: valueOf(source, 'state'),
    city: valueOf(source, 'city'),
    postcode: normalizePostcodeValue(valueOf(source, 'postcode')),
    country: valueOf(source, 'country') || 'Malaysia',
    notes: valueOf(source, 'notes'),
    hiringNeeds: valuesOf(source, 'hiringNeeds'),
    consent: isChecked(source, 'consent'),
  };

  const fieldErrors: PublicFieldErrors = {};
  if (!data.companyName) fieldErrors.companyName = 'Company name is required.';
  if (!data.industry) fieldErrors.industry = 'Industry is required.';
  if (!data.addressLine1) fieldErrors.addressLine1 = 'Address Line 1 is required.';
  if (!data.stateCode) {
    fieldErrors.stateCode = 'Please select a state.';
    fieldErrors.state = 'Please select a state.';
  }
  if (!data.city) fieldErrors.city = 'City is required.';
  if (!/^\d{5}$/.test(data.postcode)) fieldErrors.postcode = 'Postcode must be 5 digits.';
  if (!data.country) fieldErrors.country = 'Country is required.';
  if (!data.contactPersonName) fieldErrors.contactPersonName = 'Contact person name is required.';
  data.contactPhoneE164 = normalizeMalaysiaPhone(data.contactPhone);
  if (!data.contactPhoneE164) {
    fieldErrors.contactPhone = 'Enter a valid Malaysia mobile number.';
    fieldErrors.phone = 'Enter a valid Malaysia mobile number.';
  }
  if (data.contactEmail === '') {
    data.contactEmail = null;
  } else if (valueOf(source, 'contactEmail') && !data.contactEmail) {
    fieldErrors.contactEmail = 'Enter a valid contact email.';
  }
  if (data.hiringNeeds.length === 0) fieldErrors.hiringNeeds = 'Please select at least one hiring need.';
  if (!data.consent) fieldErrors.consent = 'Please confirm the information is correct before requesting OTP.';

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: 'REGISTRATION_INCOMPLETE', fieldErrors, data };
  }

  return { ok: true, data };
}

export function validatePartTimerRegistrationDraft(source: FormValueSource): PublicValidationResult<PartTimerRegistrationDraft> {
  const nationality = valueOf(source, 'nationality') || 'Malaysia';
  const data: PartTimerRegistrationDraft = {
    payName: valueOf(source, 'payName'),
    aliasPanggilan: normalizeAliasPanggilan(valueOf(source, 'aliasPanggilan') || valueOf(source, 'alias')),
    fullName: valueOf(source, 'fullName'),
    nationality,
    otherNationality: valueOf(source, 'otherNationality'),
    icNumber: normalizeIcNumber(valueOf(source, 'icNumber')),
    passportNumber: normalizePassportNumber(valueOf(source, 'passportNumber')),
    phone: valueOf(source, 'phone'),
    phoneE164: null,
    email: normalizeOptionalEmail(valueOf(source, 'email')),
    stateCode: valueOf(source, 'stateCode').toUpperCase(),
    state: valueOf(source, 'state'),
    city: valueOf(source, 'city'),
    postcode: normalizePostcodeValue(valueOf(source, 'postcode')),
    country: valueOf(source, 'country') || 'Malaysia',
    preferredLocation: valueOf(source, 'preferredLocation'),
    skillIds: valuesOf(source, 'skillIds'),
    consent: isChecked(source, 'consent'),
  };

  const fieldErrors: PublicFieldErrors = {};
  if (!data.payName) fieldErrors.payName = 'Pay name is required.';
  if (!data.fullName) fieldErrors.fullName = 'Full name is required.';
  if (!data.aliasPanggilan) {
    fieldErrors.aliasPanggilan = 'Alias / Panggilan is required.';
  } else if (!/^[A-Z0-9._-]{2,32}$/.test(data.aliasPanggilan)) {
    fieldErrors.aliasPanggilan = 'Alias must be 2-32 characters using letters, numbers, dot, dash, or underscore.';
  }
  if (!data.nationality) fieldErrors.nationality = 'Nationality is required.';
  if (data.nationality === 'Other' && !data.otherNationality.trim()) {
    fieldErrors.otherNationality = 'Please specify nationality.';
  }
  if (data.nationality === 'Malaysia') {
    if (!data.icNumber) {
      fieldErrors.icNumber = 'IC number is required for Malaysian part-timers.';
    } else if (!isValidMalaysiaIc(data.icNumber)) {
      fieldErrors.icNumber = 'Enter a valid Malaysia IC number.';
    }
  } else if (!data.passportNumber) {
    fieldErrors.passportNumber = 'Passport number is required for non-Malaysian part-timers.';
  }

  data.phoneE164 = normalizeMalaysiaPhone(data.phone);
  if (!data.phoneE164) fieldErrors.phone = 'Enter a valid Malaysia mobile number.';
  if (data.email === '') {
    data.email = null;
  } else if (valueOf(source, 'email') && !data.email) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (!data.stateCode) {
    fieldErrors.stateCode = 'Please select a state.';
    fieldErrors.state = 'Please select a state.';
  }
  if (!data.city) fieldErrors.city = 'City is required.';
  if (!/^\d{5}$/.test(data.postcode)) fieldErrors.postcode = 'Postcode must be 5 digits.';
  if (data.skillIds.length === 0) fieldErrors.skillIds = 'Please select at least one skill.';
  if (!data.consent) fieldErrors.consent = 'Please confirm the information is correct before requesting OTP.';

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: 'REGISTRATION_INCOMPLETE', fieldErrors, data };
  }

  return { ok: true, data };
}

function valueOf(source: FormValueSource, key: string): string {
  if (source instanceof FormData) {
    const value = source.get(key);
    return typeof value === 'string' ? value.trim() : '';
  }
  if (source instanceof URLSearchParams) {
    return source.get(key)?.trim() || '';
  }
  const value = source[key];
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function valuesOf(source: FormValueSource, key: string): string[] {
  if (source instanceof FormData) {
    return source.getAll(key).filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean);
  }
  if (source instanceof URLSearchParams) {
    return source.getAll(key).map((value) => value.trim()).filter(Boolean);
  }
  const value = source[key];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function normalizeOptionalEmail(input: string): string | null | '' {
  const value = String(input || '').trim();
  if (!value) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value.toLowerCase() : null;
}

function normalizePostcodeValue(input: string): string {
  return String(input || '').replace(/\D/g, '').slice(0, 5);
}

function isChecked(source: FormValueSource, key: string): boolean {
  const value = valueOf(source, key).toLowerCase();
  return value === 'on' || value === 'true' || value === '1' || value === 'yes';
}