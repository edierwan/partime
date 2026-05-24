import type { PublicLocale } from '@/lib/public-i18n';
import { normalizeMalaysiaPhone } from '@/lib/staff';

export type LoginIdentifierType = 'EMAIL' | 'PHONE';

export interface NormalizedLoginIdentifier {
  type: LoginIdentifierType;
  valueNormalized: string;
  valueDisplay: string;
}

const GENERIC_LOGIN_ERRORS: Record<PublicLocale, string> = {
  ms: 'Email/nombor telefon atau kata laluan tidak sah.',
  id: 'Email/nomor telepon atau kata sandi tidak valid.',
  en: 'Invalid email/phone number or password.',
};

export const GENERIC_LOGIN_ERROR = GENERIC_LOGIN_ERRORS.ms;
export const GENERIC_PASSWORD_RESET_MESSAGE = 'Jika akaun wujud, arahan reset kata laluan telah dihantar.';

export function getGenericLoginError(locale: PublicLocale): string {
  return GENERIC_LOGIN_ERRORS[locale];
}

export function normalizeEmailIdentity(input: string): string | null {
  const value = String(input || '').trim().toLowerCase();
  if (!value) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

export function normalizePhoneIdentity(input: string): string | null {
  return normalizeMalaysiaPhone(input) || null;
}

export function normalizeLoginIdentifier(input: string): NormalizedLoginIdentifier | null {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const email = normalizeEmailIdentity(raw);
  if (email) {
    return {
      type: 'EMAIL',
      valueNormalized: email,
      valueDisplay: email,
    };
  }

  const phone = normalizePhoneIdentity(raw);
  if (phone) {
    return {
      type: 'PHONE',
      valueNormalized: phone,
      valueDisplay: phone,
    };
  }

  return null;
}

export function maskIdentity(value: string): string {
  const email = normalizeEmailIdentity(value);
  if (email) {
    const [local, domain] = email.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }
  const phone = normalizePhoneIdentity(value);
  if (phone) return `***${phone.slice(-4)}`;
  return '***';
}
