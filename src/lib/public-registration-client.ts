import type { PublicFieldErrors } from '@/lib/public-registration-validation';

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

function escapeAttribute(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}