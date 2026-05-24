'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { MalaysiaAddressFields } from '@/components/location/MalaysiaAddressFields';
import { formatTitleCaseControl, maybeFormatTitleCaseControl } from '@/lib/input-formatting';
import { PublicLanguageSelector } from '@/components/PublicLanguageSelector';
import { focusFirstFieldError, formatOtpCountdown, getEmployerOtpValidationErrors } from '@/lib/public-registration-client';
import { PublicLocale, publicDict } from '@/lib/public-i18n';
import { validateEmployerRegistrationDraft } from '@/lib/public-registration-validation';

const INDUSTRIES = ['Event', 'Retail', 'F&B', 'Construction', 'Maintenance', 'Logistics', 'Warehouse', 'Cleaning', 'Other'];
const HIRING_NEEDS = ['General worker', 'Event crew', 'Technician', 'Promoter', 'Runner', 'Other'];

type FieldErrors = Record<string, string>;

export function EmployerRegisterClient({ locale }: { locale: PublicLocale }) {
  const t = publicDict[locale];
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [otpValidationItems, setOtpValidationItems] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [otpFormReady, setOtpFormReady] = useState(false);
  const [hasTriedOtp, setHasTriedOtp] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [otpExpiresAtMs, setOtpExpiresAtMs] = useState<number | null>(null);
  const [resendAvailableAtMs, setResendAvailableAtMs] = useState<number | null>(null);
  const [clockMs, setClockMs] = useState(Date.now());

  useEffect(() => {
    return () => {
      if (logoPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  useEffect(() => {
    syncOtpReadiness(false);
  }, []);

  useEffect(() => {
    if (step !== 'otp' || (!otpExpiresAtMs && !resendAvailableAtMs)) return;
    const timer = window.setInterval(() => setClockMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [otpExpiresAtMs, resendAvailableAtMs, step]);

  const resendRemainingSeconds = resendAvailableAtMs ? Math.max(0, Math.ceil((resendAvailableAtMs - clockMs) / 1000)) : 0;
  const otpRemainingSeconds = otpExpiresAtMs ? Math.max(0, Math.ceil((otpExpiresAtMs - clockMs) / 1000)) : 0;
  const otpExpired = step === 'otp' && otpExpiresAtMs !== null && otpRemainingSeconds === 0;

  function syncOtpReadiness(updateErrors: boolean) {
    if (!formRef.current) return false;
    const validation = validateEmployerRegistrationDraft(new FormData(formRef.current));
    setOtpFormReady(validation.ok);
    if (updateErrors) {
      setFieldErrors((current) => ({
        ...preserveServerOnlyErrors(current, ['companyLogo', 'otpCode']),
        ...(validation.ok ? {} : validation.fieldErrors),
      }));
    }
    return validation.ok;
  }

  async function handleInvalidOtpAttempt(serverFieldErrors: FieldErrors = {}) {
    if (!formRef.current) return { ok: false, fieldErrors: {}, items: [] };
    formatEmployerRegistrationTitleCaseFields(formRef.current);
    setHasTriedOtp(true);
    const validation = await getEmployerOtpValidationErrors(formRef.current, locale, serverFieldErrors);
    applyOtpValidationState(validation.fieldErrors, validation.items, validation.ok);
    return validation;
  }

  function applyOtpValidationState(nextFieldErrors: FieldErrors, nextItems: string[], ok: boolean) {
    setOtpFormReady(ok);
    if (ok) {
      setOtpValidationItems([]);
      setError(null);
      return;
    }

    if (!formRef.current) return;

    setFieldErrors((current) => ({
      ...preserveServerOnlyErrors(current, ['companyLogo', 'otpCode']),
      ...nextFieldErrors,
    }));
    setOtpValidationItems(nextItems);
    setError(nextItems.length > 0 ? t.otpValidationHeading : t.completeRequiredBeforeOtp);
    focusFirstFieldError(formRef.current, nextFieldErrors);
  }

  async function sendOtp() {
    if (!formRef.current || isSendingOtp) return;
    setIsSendingOtp(true);
    formatEmployerRegistrationTitleCaseFields(formRef.current);
    const validation = await getEmployerOtpValidationErrors(formRef.current, locale);
    setOtpFormReady(validation.ok);
    if (!validation.ok) {
      setIsSendingOtp(false);
      setHasTriedOtp(true);
      applyOtpValidationState(validation.fieldErrors, validation.items, false);
      return;
    }

    setError(null);
    setOtpValidationItems([]);
    setFieldErrors({});
    const body = new FormData(formRef.current);
    body.set('purpose', 'EMPLOYER_REGISTER');
    body.set('phone', String(body.get('contactPhone') || ''));
    const res = await fetch('/api/public/otp/send', { method: 'POST', body });
    const data = await res.json().catch(() => ({}));
    setIsSendingOtp(false);
    if (!res.ok || !data.ok) {
      if (data.error === 'REGISTRATION_INCOMPLETE' && data.fieldErrors) {
        await handleInvalidOtpAttempt(data.fieldErrors || {});
        return;
      }
      if (data.error === 'OTP_COOLDOWN_ACTIVE') {
        setStep('otp');
        setMaskedPhone(data.maskedPhone || maskedPhone);
        setResendAvailableAtMs(Date.now() + Number(data.retryAfterSeconds || 0) * 1000);
        if (typeof data.expiresInSeconds === 'number') {
          setOtpExpiresAtMs(Date.now() + Number(data.expiresInSeconds) * 1000);
        }
        setOtpValidationItems([]);
        setError(data.message || null);
        return;
      }
      setOtpValidationItems([]);
      setError(data.message || 'We could not send the OTP.');
      setFieldErrors(data.fieldErrors || {});
      return;
    }
    setStep('otp');
    setMessage(data.message || 'OTP sent.');
    setOtpValidationItems([]);
    setMaskedPhone(data.maskedPhone || null);
    setOtpExpiresAtMs(Date.now() + Number(data.expiresInSeconds || 300) * 1000);
    setResendAvailableAtMs(Date.now() + Number(data.resendAfterSeconds || 60) * 1000);
    setClockMs(Date.now());
  }

  async function verifyAndRegister() {
    if (!formRef.current || isVerifying || otpExpired) return;
    formatEmployerRegistrationTitleCaseFields(formRef.current);
    setIsVerifying(true);
    setError(null);
    setOtpValidationItems([]);
    setFieldErrors({});
    const body = new FormData(formRef.current);
    body.set('otpCode', otpCode);
    const res = await fetch('/api/public/register/employer', { method: 'POST', body });
    const data = await res.json().catch(() => ({}));
    setIsVerifying(false);
    if (!res.ok || !data.ok) {
      let nextError = data.message || 'We could not submit employer registration.';
      let nextItems: string[] = [];
      let nextFieldErrors = data.fieldErrors || {};
      if (data.fieldErrors && Object.keys(data.fieldErrors).some((key) => key !== 'otpCode')) {
        const validation = await getEmployerOtpValidationErrors(formRef.current, locale, data.fieldErrors);
        nextFieldErrors = validation.fieldErrors;
        nextItems = validation.items;
        nextError = validation.items.length > 0 ? t.otpValidationHeading : nextError;
      }

      setError(nextError);
      setOtpValidationItems(nextItems);
      setFieldErrors(nextFieldErrors);
      if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
        focusFirstFieldError(formRef.current, nextFieldErrors);
      }
      return;
    }
    router.push(data.redirectTo || '/employer/dashboard?registered=1');
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href={`/register?lang=${locale}`} className="text-sm font-medium text-brand-700 hover:underline">{t.back}</Link>
        <PublicLanguageSelector locale={locale} />
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">Partime</div>
        <h1 className="mt-3 text-3xl font-semibold text-ink-950">{t.employerTitle}</h1>
        <p className="mt-2 text-sm text-ink-600">{t.employerSubtitle}</p>
      </div>
      <form ref={formRef} encType="multipart/form-data" className="card card-pad space-y-7" onChange={() => { setOtpFormReady(syncOtpReadiness(hasTriedOtp)); setClockMs(Date.now()); }}>
        <Section title="1. Company Details">
          <Input name="companyName" label={t.companyName} error={fieldErrors.companyName} titleCase />
          <div className="flex items-start gap-4 rounded-2xl border border-ink-200 bg-ink-50/70 p-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-ink-200 bg-white">
              {logoPreviewUrl ? (
                <img src={logoPreviewUrl} alt="Company logo preview" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-ink-400">Logo</span>
              )}
            </div>
            <div className="flex-1">
              <label className="label">Company Logo (Optional)</label>
              <input
                className="input px-3 py-2"
                name="companyLogo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const next = event.target.files?.[0];
                  if (!next) {
                    setLogoPreviewUrl((current) => {
                      if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
                      return null;
                    });
                    return;
                  }
                  setLogoPreviewUrl((current) => {
                    if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
                    return URL.createObjectURL(next);
                  });
                }}
              />
              <p className="mt-1 text-xs text-ink-500">JPG, PNG, WEBP up to 2MB.</p>
              <FieldError error={fieldErrors.companyLogo} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input name="businessRegistrationNo" label={`${t.registrationNo} (Optional)`} error={fieldErrors.businessRegistrationNo} />
            <div>
              <label className="label">{t.industry}</label>
              <select name="industry" className="input">
                <option value="">Select industry</option>
                {INDUSTRIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <FieldError error={fieldErrors.industry} />
            </div>
          </div>
          <MalaysiaAddressFields
            errors={fieldErrors}
            names={{
              addressLine1: 'addressLine1',
              addressLine2: 'addressLine2',
              stateCode: 'stateCode',
              stateName: 'state',
              cityName: 'city',
              postcode: 'postcode',
              country: 'country',
            }}
            labels={{
              addressLine1: t.address,
              addressLine2: `${t.addressLine2} (Optional)`,
              state: t.state,
              city: t.city,
              postcode: t.postcode,
              country: t.country,
              selectState: t.selectState,
              cityPlaceholder: t.cityPlaceholder,
              postcodePlaceholder: t.postcodePlaceholder,
              customCityHint: t.customCityHint,
            }}
            required={{ addressLine1: true, state: true, city: true, postcode: true }}
            initialValue={{ country: 'Malaysia' }}
            titleCaseAddressLines
            disableBrowserAutocomplete
            autocompletePrefix="partimeEmployer"
            autoResolvePostcodeFromCity
          />
        </Section>

        <Section title="2. Contact Person">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input name="contactPersonName" label={t.contactPerson} error={fieldErrors.contactPersonName} titleCase />
            <Input name="contactPhone" label={t.contactPhone} placeholder="e.g. +60 12-345 6789" error={fieldErrors.contactPhone} inputMode="tel" />
          </div>
          <Input name="contactEmail" label={t.contactEmail} error={fieldErrors.contactEmail} inputMode="email" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input name="password" type="password" label={t.password} error={fieldErrors.password} />
            <Input name="confirmPassword" type="password" label={t.confirmPassword} error={fieldErrors.confirmPassword} />
          </div>
        </Section>

        <Section title="3. Hiring Needs">
          <div className="label">{t.hiringNeeds}</div>
          <div className="flex flex-wrap gap-2">
            {HIRING_NEEDS.map((need) => (
              <label key={need} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
                <input type="checkbox" name="hiringNeeds" value={need} className="rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
                {need}
              </label>
            ))}
          </div>
          <div>
            <label className="label">{t.notes}</label>
            <textarea name="notes" className="input min-h-[90px]" />
          </div>
          <label className="flex items-start gap-3 rounded-2xl border border-ink-200 p-4 text-sm text-ink-700">
            <input type="checkbox" name="consent" className="mt-1 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
            <span>{t.consent}</span>
          </label>
          <FieldError error={fieldErrors.consent} />
        </Section>

        <Section title="4. OTP Verification">
          {step === 'otp' && (
            <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4">
              <label className="label">{t.otpTitle}</label>
              <input className="input max-w-[220px] text-center tracking-[0.3em]" inputMode="numeric" maxLength={4} value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" />
              <FieldError error={fieldErrors.otpCode} />
              {maskedPhone && <p className="mt-2 text-xs text-ink-600">{`WhatsApp: ${maskedPhone}`}</p>}
              {otpRemainingSeconds > 0 && <p className="mt-1 text-xs text-ink-600">{t.otpExpiresIn.replace('{time}', formatOtpCountdown(otpRemainingSeconds))}</p>}
              {otpExpired && <p className="mt-2 text-xs text-rose-600">{t.otpExpired}</p>}
            </div>
          )}
          {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <p>{error}</p>
              {otpValidationItems.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {otpValidationItems.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : null}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {step === 'form' ? (
              <button
                type="button"
                disabled={isSendingOtp}
                aria-disabled={!otpFormReady || isSendingOtp}
                onClick={sendOtp}
                className={`btn-primary ${!otpFormReady && !isSendingOtp ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {isSendingOtp ? t.sendingOtp : otpFormReady ? t.sendOtp : t.completeRequiredFieldsFirst}
              </button>
            ) : (
              <>
                <button type="button" disabled={isVerifying || otpCode.length !== 4 || otpExpired} onClick={verifyAndRegister} className="btn-primary">{isVerifying ? 'Verifying...' : t.verifySubmit}</button>
                <button type="button" disabled={isSendingOtp || resendRemainingSeconds > 0} onClick={sendOtp} className="btn-ghost">{isSendingOtp ? t.sendingOtp : resendRemainingSeconds > 0 ? t.resendOtpIn.replace('{seconds}', String(resendRemainingSeconds)) : t.resendOtp}</button>
              </>
            )}
          </div>
        </Section>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-4"><h2 className="text-base font-semibold text-ink-950">{title}</h2>{children}</section>;
}

function Input({ name, label, placeholder, error, inputMode, defaultValue, titleCase = false, type = 'text' }: { name: string; label: string; placeholder?: string; error?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; defaultValue?: string; titleCase?: boolean; type?: React.HTMLInputTypeAttribute }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        name={name}
        data-field-target={name}
        data-title-case-input={titleCase ? 'true' : undefined}
        placeholder={placeholder}
        inputMode={inputMode}
        defaultValue={defaultValue}
        onChange={titleCase ? (event) => {
          maybeFormatTitleCaseControl(event.currentTarget);
        } : undefined}
        onBlur={titleCase ? (event) => {
          formatTitleCaseControl(event.currentTarget);
        } : undefined}
      />
      <FieldError error={error} />
    </div>
  );
}

function FieldError({ error }: { error?: string }) {
  return error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null;
}

function preserveServerOnlyErrors(fieldErrors: FieldErrors, keys: string[]): FieldErrors {
  return Object.fromEntries(Object.entries(fieldErrors).filter(([key]) => keys.includes(key)));
}

function formatEmployerRegistrationTitleCaseFields(form: HTMLFormElement): void {
  for (const control of Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-title-case-input="true"]'))) {
    formatTitleCaseControl(control);
  }
}