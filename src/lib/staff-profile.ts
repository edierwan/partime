import { z } from 'zod';
import {
  formatIcNumber,
  formatMalaysiaPhoneDisplay,
  genderFromIc,
  isValidMalaysiaIc,
  normalizeAliasPanggilan,
  normalizeBankAccount,
  normalizeIcNumber,
  normalizeMalaysiaPhone,
  resolveBankName,
  validateBankAccount,
} from '@/lib/staff';
import { validateProfileImage } from '@/lib/uploads';

export type StaffApprovalStatusValue = 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';
export type StaffGenderFormValue = 'AUTO' | 'LELAKI' | 'PEREMPUAN' | 'UNKNOWN';

const rawSchema = z.object({
  id: z.string().optional(),
  payName: z.string().trim().min(1, 'Pay name required'),
  aliasPanggilan: z.string().trim().min(2, 'Alias too short'),
  fullName: z.string().trim().min(1, 'Full name required'),
  phone: z.string().trim().min(1, 'Phone number required'),
  email: z.string().trim().optional().default(''),
  icNumber: z.string().trim().optional().default(''),
  gender: z.enum(['AUTO', 'LELAKI', 'PEREMPUAN', 'UNKNOWN']).optional().default('AUTO'),
  bankCode: z.string().trim().optional().default(''),
  customBankName: z.string().trim().optional().default(''),
  bankAccountNumber: z.string().trim().optional().default(''),
  approvalStatus: z.enum(['APPROVED', 'PENDING_REVIEW', 'REJECTED']).optional(),
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
  gender: 'LELAKI' | 'PEREMPUAN' | 'UNKNOWN';
  phoneE164: string;
  phoneDisplay: string;
  email: string | null;
  bankCode: string | null;
  bankName: string | null;
  customBankName: string | null;
  bankAccountNumber: string | null;
  approvalStatus: StaffApprovalStatusValue;
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
    defaultActive = true,
  }: {
    defaultApprovalStatus?: StaffApprovalStatusValue;
    defaultActive?: boolean;
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
    bankCode: stringValue(fd, 'bankCode'),
    customBankName: stringValue(fd, 'customBankName'),
    bankAccountNumber: stringValue(fd, 'bankAccountNumber') || stringValue(fd, 'bankAccount'),
    approvalStatus: (stringValue(fd, 'approvalStatus') || undefined) as StaffApprovalStatusValue | undefined,
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

  const aliasPanggilan = normalizeAliasPanggilan(value.aliasPanggilan);
  if (!/^[A-Z0-9._-]{2,32}$/.test(aliasPanggilan)) {
    fieldErrors.aliasPanggilan = 'Alias must be 2-32 characters using letters, numbers, dot, dash, or underscore';
  }

  const phoneE164 = normalizeMalaysiaPhone(value.phone);
  if (!phoneE164) {
    fieldErrors.phone = 'Enter a valid Malaysia mobile number';
  }

  const email = value.email ? value.email.toLowerCase() : '';
  if (email && !z.string().email().safeParse(email).success) {
    fieldErrors.email = 'Enter a valid email address';
  }

  const icNumberNormalized = normalizeIcNumber(value.icNumber);
  if (value.icNumber && !isValidMalaysiaIc(icNumberNormalized)) {
    fieldErrors.icNumber = 'Enter a valid Malaysia IC number';
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

  const derivedGender = icNumberNormalized ? genderFromIc(icNumberNormalized) : 'UNKNOWN';
  const gender = value.gender === 'AUTO' ? derivedGender : value.gender;

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
      phoneE164,
      phoneDisplay: formatMalaysiaPhoneDisplay(phoneE164),
      email: email || null,
      bankCode: bankCode || null,
      bankName: resolveBankName(bankCode || null, null, customBankName || null),
      customBankName: customBankName || null,
      bankAccountNumber: bankAccountNumber || null,
      approvalStatus: value.approvalStatus || defaultApprovalStatus,
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