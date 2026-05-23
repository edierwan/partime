'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { PublicLanguageSelector } from '@/components/PublicLanguageSelector';
import { PublicLocale, publicDict } from '@/lib/public-i18n';

const INDUSTRIES = ['Event', 'Retail', 'F&B', 'Construction', 'Maintenance', 'Logistics', 'Warehouse', 'Cleaning', 'Other'];
const HIRING_NEEDS = ['General worker', 'Event crew', 'Technician', 'Promoter', 'Runner', 'Other'];

type FieldErrors = Record<string, string>;

export function EmployerRegisterClient({ locale }: { locale: PublicLocale }) {
  const t = publicDict[locale];
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');
  const [pending, setPending] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function sendOtp() {
    if (!formRef.current) return;
    setPending(true);
    setError(null);
    setFieldErrors({});
    const body = new FormData(formRef.current);
    body.set('purpose', 'EMPLOYER_REGISTER');
    body.set('phone', String(body.get('contactPhone') || ''));
    const res = await fetch('/api/public/otp/send', { method: 'POST', body });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok || !data.ok) {
      setError(data.message || 'We could not send the OTP.');
      setFieldErrors(data.fieldErrors || {});
      return;
    }
    setStep('otp');
    setMessage(data.message || 'OTP sent.');
  }

  async function verifyAndRegister() {
    if (!formRef.current) return;
    setPending(true);
    setError(null);
    setFieldErrors({});
    const body = new FormData(formRef.current);
    body.set('otpCode', otpCode);
    const res = await fetch('/api/public/register/employer', { method: 'POST', body });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok || !data.ok) {
      setError(data.message || 'We could not submit employer registration.');
      setFieldErrors(data.fieldErrors || {});
      return;
    }
    setStep('done');
    setMessage(t.successEmployer);
  }

  if (step === 'done') {
    return (
      <div className="card card-pad mx-auto max-w-xl space-y-4">
        <div className="text-sm font-semibold text-emerald-700">Partime</div>
        <h1 className="text-2xl font-semibold text-ink-950">{t.successEmployer}</h1>
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
        <h1 className="mt-3 text-3xl font-semibold text-ink-950">{t.employerTitle}</h1>
        <p className="mt-2 text-sm text-ink-600">{t.employerSubtitle}</p>
      </div>
      <form ref={formRef} encType="multipart/form-data" className="card card-pad space-y-7">
        <Section title="1. Company Details">
          <Input name="companyName" label={t.companyName} error={fieldErrors.companyName} />
          <div>
            <label className="label">Company Logo (Optional)</label>
            <input className="input px-3 py-2" name="companyLogo" type="file" accept="image/jpeg,image/png,image/webp" />
            <p className="mt-1 text-xs text-ink-500">JPG, PNG, WEBP up to 2MB.</p>
            <FieldError error={fieldErrors.companyLogo} />
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
          <Input name="addressLine1" label={t.address} error={fieldErrors.addressLine1} />
          <Input name="addressLine2" label="Address Line 2 (Optional)" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input name="city" label={t.city} error={fieldErrors.city} />
            <Input name="state" label={t.state} error={fieldErrors.state} />
            <Input name="postcode" label={t.postcode} error={fieldErrors.postcode} />
          </div>
          <Input name="country" label={t.country} defaultValue="Malaysia" error={fieldErrors.country} />
        </Section>

        <Section title="2. Contact Person">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input name="contactPersonName" label={t.contactPerson} error={fieldErrors.contactPersonName} />
            <Input name="contactPhone" label={t.contactPhone} placeholder="e.g. +60 12-345 6789" error={fieldErrors.contactPhone} inputMode="tel" />
          </div>
          <Input name="contactEmail" label={t.contactEmail} error={fieldErrors.contactEmail} inputMode="email" />
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
            </div>
          )}
          {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <div className="flex flex-wrap gap-3">
            {step === 'form' ? (
              <button type="button" disabled={pending} onClick={sendOtp} className="btn-primary">{pending ? 'Sending...' : t.sendOtp}</button>
            ) : (
              <>
                <button type="button" disabled={pending || otpCode.length !== 4} onClick={verifyAndRegister} className="btn-primary">{pending ? 'Verifying...' : t.verifySubmit}</button>
                <button type="button" disabled={pending} onClick={sendOtp} className="btn-ghost">{pending ? 'Sending...' : t.resendOtp}</button>
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

function Input({ name, label, placeholder, error, inputMode, defaultValue }: { name: string; label: string; placeholder?: string; error?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; defaultValue?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" name={name} placeholder={placeholder} inputMode={inputMode} defaultValue={defaultValue} />
      <FieldError error={error} />
    </div>
  );
}

function FieldError({ error }: { error?: string }) {
  return error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null;
}