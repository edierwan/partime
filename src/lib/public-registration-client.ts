import { PublicLocale, publicDict } from '@/lib/public-i18n';
import { validateEmployerRegistrationDraft, type EmployerRegistrationDraft, type PublicFieldErrors } from '@/lib/public-registration-validation';

interface EmployerOtpPostcodeMatch {
  postcode: string;
  stateCode: string;
  stateName: string;
  cityName: string | null;
  placeName: string | null;
}

export interface EmployerOtpValidationResult {
  ok: boolean;
  fieldErrors: PublicFieldErrors;
  items: string[];
}

export function focusFirstFieldError(form: HTMLFormElement, fieldErrors: PublicFieldErrors): void {
  const firstKey = Object.keys(fieldErrors)[0];
  if (!firstKey) return;

  const escaped = escapeAttribute(firstKey);
  const target = (
    form.querySelector<HTMLElement>(`[data-field-target="${escaped}"]`) ||
    Array.from(form.elements).find((element) => {
      return element instanceof HTMLElement && 'name' in element && (element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).name === firstKey && (element as HTMLInputElement).type !== 'hidden';
    }) as HTMLElement | undefined
  ) || null;

  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if ('focus' in target) target.focus();
}

export function formatOtpCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export async function getEmployerOtpValidationErrors(form: HTMLFormElement, locale: PublicLocale, serverFieldErrors: PublicFieldErrors = {}): Promise<EmployerOtpValidationResult> {
  const t = publicDict[locale];
  const validation = validateEmployerRegistrationDraft(new FormData(form));
  const fieldErrors: PublicFieldErrors = {
    ...(validation.ok ? {} : validation.fieldErrors),
    ...serverFieldErrors,
  };

  if (validation.data.city && !validation.data.stateCode) {
    fieldErrors.stateCode = t.selectValidStateBeforeCity;
    fieldErrors.state = t.selectValidStateBeforeCity;
  }

  if (validation.data.postcode.length === 5) {
    const exactMatch = await lookupEmployerPostcode(validation.data.postcode);
    if (exactMatch === null) {
      fieldErrors.postcode = t.postcodeNotVerified;
    } else if (exactMatch) {
      const resolvedCityName = exactMatch.cityName || exactMatch.placeName || '';
      const resolvedStateName = validation.data.state || exactMatch.stateName;
      if (validation.data.stateCode && exactMatch.stateCode !== validation.data.stateCode) {
        fieldErrors.postcode = formatTemplate(t.invalidPostcodeForLocation, {
          city: validation.data.city || resolvedCityName || t.city,
          state: validation.data.state || exactMatch.stateName,
        });
      } else if (validation.data.city && resolvedCityName && normalizeLocationName(validation.data.city) !== normalizeLocationName(resolvedCityName)) {
        fieldErrors.postcode = formatTemplate(t.invalidPostcodeForLocation, {
          city: validation.data.city,
          state: resolvedStateName,
        });
      }
    }
  }

  return {
    ok: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    items: buildEmployerOtpValidationItems(fieldErrors, validation.data, t),
  };
}

function escapeAttribute(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function lookupEmployerPostcode(postcode: string): Promise<EmployerOtpPostcodeMatch | null | undefined> {
  try {
    const params = new URLSearchParams({ query: postcode, limit: '8' });
    const res = await fetch(`/api/public/locations/postcodes?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) return undefined;

    const data = await res.json().catch(() => null) as { postcodes?: EmployerOtpPostcodeMatch[] } | null;
    return data?.postcodes?.find((item) => item.postcode === postcode) || null;
  } catch {
    return undefined;
  }
}

function buildEmployerOtpValidationItems(fieldErrors: PublicFieldErrors, draft: EmployerRegistrationDraft, t: (typeof publicDict)[PublicLocale]): string[] {
  const items: string[] = [];
  const seen = new Set<string>();

  pushValidationItem(items, seen, fieldErrors.companyName ? t.companyName : null);
  pushValidationItem(items, seen, fieldErrors.addressLine1 ? t.address : null);

  if (fieldErrors.stateCode || fieldErrors.state) {
    const stateError = fieldErrors.stateCode || fieldErrors.state || t.state;
    pushValidationItem(items, seen, !draft.stateCode && stateError !== t.selectValidStateBeforeCity ? t.state : stateError);
  }

  if (fieldErrors.city) {
    pushValidationItem(items, seen, !draft.city ? t.city : fieldErrors.city);
  }

  if (fieldErrors.postcode) {
    pushValidationItem(items, seen, draft.postcode.length === 5 ? fieldErrors.postcode : t.postcode);
  }

  pushValidationItem(items, seen, fieldErrors.contactPersonName ? t.contactPerson : null);
  pushValidationItem(items, seen, fieldErrors.contactPhone || fieldErrors.phone ? t.contactPhoneInvalid : null);
  pushValidationItem(items, seen, fieldErrors.contactEmail ? t.contactEmail : null);
  pushValidationItem(items, seen, fieldErrors.industry ? t.industry : null);
  pushValidationItem(items, seen, fieldErrors.hiringNeeds ? t.hiringNeeds : null);
  pushValidationItem(items, seen, fieldErrors.consent ? t.confirmationCheckbox : null);

  return items;
}

function pushValidationItem(items: string[], seen: Set<string>, value: string | null): void {
  if (!value || seen.has(value)) return;
  seen.add(value);
  items.push(value);
}

function formatTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] || '');
}

function normalizeLocationName(value: string): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}