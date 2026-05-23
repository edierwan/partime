import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

export type StaffGenderValue = 'LELAKI' | 'PEREMPUAN' | 'TIDAK_DINYATAKAN';

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export interface BankOption {
  code: string;
  label: string;
  minLength?: number;
  maxLength?: number;
}

export interface NationalityOption {
  code: string;
  label: string;
}

export const NATIONALITY_OPTIONS: NationalityOption[] = [
  { code: 'Malaysia', label: 'Malaysia' },
  { code: 'Indonesia', label: 'Indonesia' },
  { code: 'Bangladesh', label: 'Bangladesh' },
  { code: 'Nepal', label: 'Nepal' },
  { code: 'Myanmar', label: 'Myanmar' },
  { code: 'Pakistan', label: 'Pakistan' },
  { code: 'India', label: 'India' },
  { code: 'Philippines', label: 'Philippines' },
  { code: 'Thailand', label: 'Thailand' },
  { code: 'Other', label: 'Other' },
];

export const AVAILABILITY_OPTIONS = [
  'Weekdays',
  'Weekends',
  'Night shift',
  'Full day',
  'Event-based',
] as const;

export const MALAYSIA_BANK_OPTIONS: BankOption[] = [
  { code: 'MAYBANK', label: 'Maybank', minLength: 10, maxLength: 12 },
  { code: 'CIMB', label: 'CIMB Bank', minLength: 10, maxLength: 14 },
  { code: 'PUBLIC_BANK', label: 'Public Bank', minLength: 10, maxLength: 12 },
  { code: 'RHB', label: 'RHB Bank', minLength: 10, maxLength: 14 },
  { code: 'HONG_LEONG', label: 'Hong Leong Bank', minLength: 10, maxLength: 14 },
  { code: 'AMBANK', label: 'AmBank', minLength: 10, maxLength: 14 },
  { code: 'BANK_ISLAM', label: 'Bank Islam', minLength: 10, maxLength: 14 },
  { code: 'BANK_RAKYAT', label: 'Bank Rakyat', minLength: 10, maxLength: 14 },
  { code: 'BSN', label: 'BSN', minLength: 10, maxLength: 14 },
  { code: 'OCBC', label: 'OCBC Bank', minLength: 10, maxLength: 14 },
  { code: 'UOB', label: 'UOB Bank', minLength: 10, maxLength: 14 },
  { code: 'HSBC', label: 'HSBC Bank Malaysia', minLength: 10, maxLength: 14 },
  { code: 'STANDARD_CHARTERED', label: 'Standard Chartered Malaysia', minLength: 10, maxLength: 14 },
  { code: 'ALLIANCE', label: 'Alliance Bank', minLength: 10, maxLength: 14 },
  { code: 'AFFIN', label: 'Affin Bank', minLength: 10, maxLength: 14 },
  { code: 'TNG', label: 'TNG eWallet', minLength: 10, maxLength: 14 },
  { code: 'OTHER', label: 'Other', minLength: 6, maxLength: 20 },
];

const GENERIC_BANK_ACCOUNT_MIN = 6;
const GENERIC_BANK_ACCOUNT_MAX = 20;

export function normalizeAliasPanggilan(input: string): string {
  return String(input || '').trim().toUpperCase();
}

export function normalizeMalaysiaPhone(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) return '';

  const parsed = parsePhoneNumberFromString(raw, 'MY');
  if (!parsed || parsed.country !== 'MY' || !parsed.isValid()) return '';

  const national = parsed.nationalNumber;
  const type = typeof parsed.getType === 'function' ? parsed.getType() : undefined;
  const looksMobile = national.startsWith('1');
  const notLandline = type !== 'FIXED_LINE';
  if (!looksMobile || !notLandline) return '';

  return parsed.number;
}

export function isValidMalaysiaMobile(input: string): boolean {
  return Boolean(normalizeMalaysiaPhone(input));
}

export function formatMalaysiaPhoneDisplay(input: string | null | undefined): string {
  const raw = String(input || '').trim();
  if (!raw) return '—';

  const parsed = parsePhoneNumberFromString(raw, 'MY');
  if (!parsed) return raw;
  return parsed.formatInternational();
}

export function normalizeIcNumber(input: string): string {
  return String(input || '').replace(/\D/g, '').slice(0, 12);
}

function icBirthDateParts(normalized: string) {
  if (normalized.length !== 12) return null;

  const yy = Number(normalized.slice(0, 2));
  const mm = Number(normalized.slice(2, 4));
  const dd = Number(normalized.slice(4, 6));
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null;

  const currentYear = new Date().getFullYear() % 100;
  const fullYear = yy <= currentYear ? 2000 + yy : 1900 + yy;
  const date = new Date(Date.UTC(fullYear, mm - 1, dd));
  if (
    date.getUTCFullYear() !== fullYear ||
    date.getUTCMonth() !== mm - 1 ||
    date.getUTCDate() !== dd
  ) {
    return null;
  }

  return { yy, mm, dd, fullYear };
}

export function isValidMalaysiaIc(normalized: string): boolean {
  return normalized.length === 12 && Boolean(icBirthDateParts(normalized));
}

export function formatIcNumber(normalized: string | null | undefined): string {
  const digits = normalizeIcNumber(String(normalized || ''));
  if (digits.length !== 12) return String(normalized || '');
  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

export function maskIcNumber(normalized: string | null | undefined): string {
  const digits = normalizeIcNumber(String(normalized || ''));
  if (digits.length !== 12) return '—';
  return `${digits.slice(0, 6)}-**-${digits.slice(8)}`;
}

export function genderFromIc(normalized: string): StaffGenderValue {
  const digits = normalizeIcNumber(normalized);
  if (digits.length !== 12) return 'TIDAK_DINYATAKAN';
  return Number(digits.slice(-1)) % 2 === 0 ? 'PEREMPUAN' : 'LELAKI';
}

export function normalizePassportNumber(input: string): string {
  return String(input || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32);
}

export function displayGender(gender: string | null | undefined): string {
  if (gender === 'LELAKI') return 'Lelaki';
  if (gender === 'PEREMPUAN') return 'Perempuan';
  return 'Tidak dinyatakan';
}

export function normalizeBankAccount(input: string): string {
  return String(input || '').replace(/\D/g, '');
}

export function validateBankAccount(bankCode: string | null | undefined, accountNo: string | null | undefined): ValidationResult {
  const normalized = normalizeBankAccount(String(accountNo || ''));
  if (!normalized) return { ok: true };
  if (!/^\d+$/.test(normalized)) return { ok: false, error: 'Account number must contain digits only' };

  const option = MALAYSIA_BANK_OPTIONS.find((item) => item.code === bankCode);
  const minLength = option?.minLength ?? GENERIC_BANK_ACCOUNT_MIN;
  const maxLength = option?.maxLength ?? GENERIC_BANK_ACCOUNT_MAX;
  if (normalized.length < minLength || normalized.length > maxLength) {
    return { ok: false, error: `Account number must be ${minLength}-${maxLength} digits` };
  }
  return { ok: true };
}

export function maskBankAccountNumber(accountNo: string | null | undefined): string {
  const normalized = normalizeBankAccount(String(accountNo || ''));
  if (!normalized) return '—';
  return `**** **** ${normalized.slice(-4)}`;
}

export function resolveBankName(bankCode: string | null | undefined, bankName: string | null | undefined, customBankName: string | null | undefined): string | null {
  if (bankCode === 'OTHER') return customBankName || bankName || 'Other';
  const option = MALAYSIA_BANK_OPTIONS.find((item) => item.code === bankCode);
  return customBankName || bankName || option?.label || null;
}

export function initialsForName(name: string | null | undefined): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'P';
}