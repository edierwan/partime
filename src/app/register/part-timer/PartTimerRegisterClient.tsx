'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { MalaysiaAddressFields } from '@/components/location/MalaysiaAddressFields';
import { PublicLanguageSelector } from '@/components/PublicLanguageSelector';
import { focusFirstFieldError, formatOtpCountdown } from '@/lib/public-registration-client';
import { AVAILABILITY_OPTIONS, MALAYSIA_BANK_OPTIONS, NATIONALITY_OPTIONS, displayGender, formatIcNumber, genderFromIc, normalizeIcNumber } from '@/lib/staff';
import { PublicLocale, publicDict } from '@/lib/public-i18n';
import { validatePartTimerRegistrationDraft } from '@/lib/public-registration-validation';

type SkillCatalog = Array<{
  id: string;
  nameMs: string;
  nameId: string;
  nameEn: string;
  skills: Array<{ id: string; nameMs: string; nameId: string; nameEn: string }>;
}>;

type FieldErrors = Record<string, string>;

export function PartTimerRegisterClient({ locale, skillCatalog }: { locale: PublicLocale; skillCatalog: SkillCatalog }) {
  const t = publicDict[locale];
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [otpCode, setOtpCode] = useState('');
  const [icInput, setIcInput] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [nationality, setNationality] = useState('Malaysia');
  const [fullName, setFullName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [otpFormReady, setOtpFormReady] = useState(false);
  const [hasTriedOtp, setHasTriedOtp] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [otpExpiresAtMs, setOtpExpiresAtMs] = useState<number | null>(null);
  const [resendAvailableAtMs, setResendAvailableAtMs] = useState<number | null>(null);
  const [clockMs, setClockMs] = useState(Date.now());

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    syncOtpReadiness(false);
  }, []);

  useEffect(() => {
    if (step !== 'otp' || (!otpExpiresAtMs && !resendAvailableAtMs)) return;
    const timer = window.setInterval(() => setClockMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [otpExpiresAtMs, resendAvailableAtMs, step]);

  const derivedGender = genderFromIc(normalizeIcNumber(icInput));
  const resendRemainingSeconds = resendAvailableAtMs ? Math.max(0, Math.ceil((resendAvailableAtMs - clockMs) / 1000)) : 0;
  const otpRemainingSeconds = otpExpiresAtMs ? Math.max(0, Math.ceil((otpExpiresAtMs - clockMs) / 1000)) : 0;
  const otpExpired = step === 'otp' && otpExpiresAtMs !== null && otpRemainingSeconds === 0;

  function syncOtpReadiness(updateErrors: boolean) {
    if (!formRef.current) return false;
    const validation = validatePartTimerRegistrationDraft(new FormData(formRef.current));
    setOtpFormReady(validation.ok);
    if (updateErrors) {
      setFieldErrors((current) => ({
        ...preserveServerOnlyErrors(current, ['profileImage', 'portfolioMedia', 'otpCode']),
        ...(validation.ok ? {} : validation.fieldErrors),
      }));
    }
    return validation.ok;
  }

  function handleInvalidOtpAttempt() {
    if (!formRef.current) return;
    setHasTriedOtp(true);
    setError(t.completeRequiredBeforeOtp);
    const validation = validatePartTimerRegistrationDraft(new FormData(formRef.current));
    if (!validation.ok) {
      setFieldErrors((current) => ({
        ...preserveServerOnlyErrors(current, ['profileImage', 'portfolioMedia', 'otpCode']),
        ...validation.fieldErrors,
      }));
      focusFirstFieldError(formRef.current, validation.fieldErrors);
      setOtpFormReady(false);
    }
  }

  async function sendOtp() {
    if (!formRef.current || isSendingOtp) return;
    const validation = validatePartTimerRegistrationDraft(new FormData(formRef.current));
    setOtpFormReady(validation.ok);
    if (!validation.ok) {
      handleInvalidOtpAttempt();
      return;
    }

    setIsSendingOtp(true);
    setError(null);
    setFieldErrors({});
    setMessage(null);

    const body = new FormData(formRef.current);
    body.set('purpose', 'PART_TIMER_REGISTER');
    const res = await fetch('/api/public/otp/send', { method: 'POST', body });
    const data = await res.json().catch(() => ({}));
    setIsSendingOtp(false);

    if (!res.ok || !data.ok) {
      if (data.error === 'REGISTRATION_INCOMPLETE' && data.fieldErrors) {
        setHasTriedOtp(true);
        setFieldErrors(data.fieldErrors || {});
        setError(data.message || t.completeRequiredBeforeOtp);
        focusFirstFieldError(formRef.current, data.fieldErrors || {});
        return;
      }
      if (data.error === 'OTP_COOLDOWN_ACTIVE') {
        setStep('otp');
        setMaskedPhone(data.maskedPhone || maskedPhone);
        setResendAvailableAtMs(Date.now() + Number(data.retryAfterSeconds || 0) * 1000);
        if (typeof data.expiresInSeconds === 'number') {
          setOtpExpiresAtMs(Date.now() + Number(data.expiresInSeconds) * 1000);
        }
        setError(data.message || null);
        return;
      }
      setError(data.message || 'We could not send the OTP.');
      setFieldErrors(data.fieldErrors || {});
      return;
    }
    setStep('otp');
    setMessage(data.message || 'OTP sent.');
    setMaskedPhone(data.maskedPhone || null);
    setOtpExpiresAtMs(Date.now() + Number(data.expiresInSeconds || 300) * 1000);
    setResendAvailableAtMs(Date.now() + Number(data.resendAfterSeconds || 60) * 1000);
    setClockMs(Date.now());
  }

  async function verifyAndSubmit() {
    if (!formRef.current || isVerifying || otpExpired) return;
    setIsVerifying(true);
    setError(null);
    setFieldErrors({});
    setMessage(null);

    const body = new FormData(formRef.current);
    body.set('otpCode', otpCode);
    const res = await fetch('/api/public/register/part-timer', { method: 'POST', body });
    const data = await res.json().catch(() => ({}));
    setIsVerifying(false);

    if (!res.ok || !data.ok) {
      setError(data.message || 'We could not submit your registration.');
      setFieldErrors(data.fieldErrors || {});
      if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
        focusFirstFieldError(formRef.current, data.fieldErrors);
      }
      return;
    }
    if (data.redirectTo) {
      router.push(data.redirectTo);
      router.refresh();
      return;
    }
    setStep('done');
    setMessage(t.successPartTimer);
  }

  if (step === 'done') {
    return (
      <div className="card card-pad mx-auto max-w-xl space-y-4">
        <div className="text-sm font-semibold text-emerald-700">Partime</div>
        <h1 className="text-2xl font-semibold text-ink-950">{t.successPartTimer}</h1>
        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
        <Link href={`/register?lang=${locale}`} className="btn-primary inline-flex">{t.back}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href={`/register?lang=${locale}`} className="text-sm font-medium text-brand-700 hover:underline">{t.back}</Link>
        <PublicLanguageSelector locale={locale} />
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">Partime</div>
        <h1 className="mt-3 text-3xl font-semibold text-ink-950">{t.partTimerTitle}</h1>
        <p className="mt-2 text-sm text-ink-600">{t.partTimerSubtitle}</p>
      </div>

      <form ref={formRef} encType="multipart/form-data" className="card card-pad space-y-7" onChange={() => { setOtpFormReady(syncOtpReadiness(hasTriedOtp)); setClockMs(Date.now()); }}>
        <Section title="1. Personal Details">
          <div className="flex items-start gap-4 rounded-2xl border border-ink-200 bg-ink-50/70 p-4">
            <Avatar name={fullName || 'Part-timer'} src={previewUrl} className="h-16 w-16 text-base" />
            <div className="flex-1">
              <label className="label">{t.profilePhoto}</label>
              <input
                className="input px-3 py-2"
                type="file"
                name="profileImage"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const next = event.target.files?.[0];
                  if (!next) return;
                  setPreviewUrl((current) => {
                    if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
                    return URL.createObjectURL(next);
                  });
                }}
              />
              <p className="mt-1 text-xs text-ink-500">JPG, PNG, WEBP up to 2MB.</p>
              <FieldError error={fieldErrors.profileImage} />
            </div>
          </div>

          <Input name="fullName" label={t.fullName} placeholder="e.g. Nur Syafiqah" error={fieldErrors.fullName} onChange={(value) => setFullName(value)} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input name="payName" label={t.payName} placeholder="e.g. nur.sya" error={fieldErrors.payName} />
            <Input name="aliasPanggilan" label={t.alias} placeholder="e.g. NURSYA01" error={fieldErrors.aliasPanggilan} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="label">{t.nationality}</label>
              <select className="input" name="nationality" value={nationality} onChange={(event) => setNationality(event.target.value)}>
                {NATIONALITY_OPTIONS.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
              </select>
            </div>
            {nationality === 'Other' && <Input name="otherNationality" label={t.otherNationality} error={fieldErrors.otherNationality} />}
          </div>
          {nationality === 'Malaysia' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="label">{t.icNumber}</label>
                <input className="input" name="icNumber" inputMode="numeric" placeholder="e.g. 010203-10-1234" value={icInput} onChange={(event) => setIcInput(event.target.value)} onBlur={() => setIcInput((value) => formatIcNumber(normalizeIcNumber(value) || value))} />
                <p className="mt-1 text-xs text-ink-500">{t.genderHelper}</p>
                <FieldError error={fieldErrors.icNumber} />
              </div>
              <div>
                <label className="label">{t.gender}</label>
                <input className="input bg-ink-50" value={displayGender(derivedGender)} readOnly disabled />
                <input type="hidden" name="gender" value="AUTO" />
              </div>
            </div>
          ) : (
            <Input name="passportNumber" label={t.passportNumber} placeholder="e.g. A12345678" error={fieldErrors.passportNumber} />
          )}
        </Section>

        <Section title="2. Contact & Verification">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input name="phone" label={t.mobile} placeholder="e.g. +60 12-345 6789" error={fieldErrors.phone} inputMode="tel" />
            <Input name="email" label={`${t.email} (Optional)`} placeholder="e.g. nur@example.com" error={fieldErrors.email} inputMode="email" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input name="password" type="password" label={t.password} error={fieldErrors.password} />
            <Input name="confirmPassword" type="password" label={t.confirmPassword} error={fieldErrors.confirmPassword} />
          </div>
          <MalaysiaAddressFields
            errors={fieldErrors}
            footerError={fieldErrors.preferredLocation}
            names={{
              stateCode: 'stateCode',
              stateName: 'state',
              cityName: 'city',
              postcode: 'postcode',
              country: 'country',
              preferredLocation: 'preferredLocation',
            }}
            labels={{
              state: t.state,
              city: t.city,
              postcode: t.postcode,
              selectState: t.selectState,
              cityPlaceholder: t.cityPlaceholder,
              postcodePlaceholder: t.postcodePlaceholder,
              customCityHint: t.customCityHint,
            }}
            required={{ state: true, city: true, postcode: true }}
            initialValue={{ country: 'Malaysia' }}
            showAddressLine1={false}
            showAddressLine2={false}
            showCountry={false}
            helperText={t.preferredLocation}
          />
        </Section>

        <Section title="3. Work Skills">
          <div className="space-y-4">
            {skillCatalog.map((category) => (
              <div key={category.id} className="rounded-2xl border border-ink-200 p-4">
                <div className="text-sm font-semibold text-ink-900">{labelFor(category, locale)}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {category.skills.map((skill) => (
                    <label key={skill.id} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
                      <input type="checkbox" name="skillIds" value={skill.id} className="rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
                      {labelFor(skill, locale)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <Input name="otherSkillName" label={t.otherSkill} placeholder="e.g. Stage crew" error={fieldErrors.otherSkillName} />
            <FieldError error={fieldErrors.skillIds} />
          </div>
          <div>
            <div className="label">{t.availability}</div>
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY_OPTIONS.map((option) => (
                <label key={option} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
                  <input type="checkbox" name="availability" value={option} className="rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
                  {option}
                </label>
              ))}
            </div>
          </div>
        </Section>

        <Section title="4. Portfolio (Optional)">
          <div className="rounded-2xl border border-ink-200 bg-ink-50/70 p-4">
            <label className="label">Work Photos / Videos</label>
            <input className="input px-3 py-2" type="file" name="portfolioMedia" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple />
            <p className="mt-1 text-xs text-ink-500">Upload up to 6 JPG, PNG, WEBP, MP4 or WEBM files for admin review.</p>
            <FieldError error={fieldErrors.portfolioMedia} />
          </div>
        </Section>

        <Section title="5. Bank Details">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="label">{t.bank}</label>
              <select className="input" name="bankCode" value={bankCode} onChange={(event) => setBankCode(event.target.value)}>
                <option value="">Select bank</option>
                {MALAYSIA_BANK_OPTIONS.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
              </select>
              <FieldError error={fieldErrors.bankCode} />
            </div>
            <Input name="bankAccountNumber" label={t.bankAccount} placeholder="e.g. 123456789012" error={fieldErrors.bankAccountNumber} inputMode="numeric" />
          </div>
          {bankCode === 'OTHER' && <Input name="customBankName" label="Custom Bank Name" error={fieldErrors.customBankName} />}
          <div>
            <label className="label">{t.notes}</label>
            <textarea className="input min-h-[90px]" name="notes" />
          </div>
          <label className="flex items-start gap-3 rounded-2xl border border-ink-200 p-4 text-sm text-ink-700">
            <input type="checkbox" name="consent" className="mt-1 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
            <span>{t.consent}</span>
          </label>
          <FieldError error={fieldErrors.consent} />
        </Section>

        <Section title="6. OTP Verification">
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
          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <div className="flex flex-wrap gap-3">
            {step === 'form' ? (
              <button
                type="button"
                disabled={isSendingOtp}
                aria-disabled={!otpFormReady || isSendingOtp}
                onClick={otpFormReady ? sendOtp : handleInvalidOtpAttempt}
                className={`btn-primary ${!otpFormReady && !isSendingOtp ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {isSendingOtp ? t.sendingOtp : otpFormReady ? t.sendOtp : t.completeRequiredFieldsFirst}
              </button>
            ) : (
              <>
                <button type="button" disabled={isVerifying || otpCode.length !== 4 || otpExpired} onClick={verifyAndSubmit} className="btn-primary">{isVerifying ? 'Verifying...' : t.verifySubmit}</button>
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

function Input({ name, label, placeholder, error, inputMode, onChange, type = 'text' }: { name: string; label: string; placeholder?: string; error?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; onChange?: (value: string) => void; type?: React.HTMLInputTypeAttribute }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} name={name} placeholder={placeholder} inputMode={inputMode} onChange={(event) => onChange?.(event.target.value)} />
      <FieldError error={error} />
    </div>
  );
}

function FieldError({ error }: { error?: string }) {
  return error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null;
}

function labelFor(item: { nameMs: string; nameId: string; nameEn: string }, locale: PublicLocale) {
  if (locale === 'id') return item.nameId;
  if (locale === 'en') return item.nameEn;
  return item.nameMs;
}

function preserveServerOnlyErrors(fieldErrors: FieldErrors, keys: string[]): FieldErrors {
  return Object.fromEntries(Object.entries(fieldErrors).filter(([key]) => keys.includes(key)));
}