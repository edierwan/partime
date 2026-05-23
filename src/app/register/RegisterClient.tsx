'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { MALAYSIA_BANK_OPTIONS, formatIcNumber, genderFromIc, normalizeIcNumber } from '@/lib/staff';

type FieldErrors = Record<string, string>;

export function RegisterClient() {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [otpCode, setOtpCode] = useState('');
  const [icInput, setIcInput] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const derivedGender = genderFromIc(normalizeIcNumber(icInput));

  async function sendOtp() {
    if (!formRef.current) return;
    setPending(true);
    setError(null);
    setFieldErrors({});
    setMessage(null);

    const res = await fetch('/api/public/register/send-otp', {
      method: 'POST',
      body: new FormData(formRef.current),
    });
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

  async function verifyOtp() {
    if (!formRef.current) return;
    setPending(true);
    setError(null);
    setFieldErrors({});
    setMessage(null);

    const body = new FormData(formRef.current);
    body.set('otpCode', otpCode);

    const res = await fetch('/api/public/register/verify', {
      method: 'POST',
      body,
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);

    if (!res.ok || !data.ok) {
      setError(data.message || 'We could not verify the OTP.');
      setFieldErrors(data.fieldErrors || {});
      return;
    }

    setStep('done');
    setMessage(data.warning ? `${data.message} ${data.warning}` : data.message || 'Registration submitted.');
  }

  if (step === 'done') {
    return (
      <div className="card card-pad max-w-xl mx-auto space-y-4">
        <div>
          <div className="text-sm font-semibold text-emerald-700">Registration submitted</div>
          <h1 className="mt-1 text-2xl font-semibold text-ink-950">Your staff profile is now pending review</h1>
          <p className="mt-2 text-sm text-ink-600">Admin will review your details before you can clock in, unless pending access is enabled.</p>
        </div>
        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
        <div className="flex gap-3">
          <Link href="/login" className="btn-primary">Back to Login</Link>
          <Link href="/register" className="btn-ghost">Register Another Profile</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">Partime</div>
        <h1 className="mt-3 text-3xl font-semibold text-ink-950">Staff Self Registration</h1>
        <p className="mt-2 text-sm text-ink-600">Submit your profile, verify your WhatsApp number, and wait for admin review.</p>
      </div>

      <form ref={formRef} className="card card-pad space-y-5">
        <div className="flex items-start gap-4 rounded-2xl border border-ink-200 bg-ink-50/70 p-4">
          <Avatar name={fullName || 'New Staff'} src={previewUrl} className="h-16 w-16 text-base" />
          <div className="flex-1 space-y-2">
            <div>
              <label className="label">Profile Photo</label>
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
              <p className="text-xs text-ink-500 mt-1">Optional. JPG, PNG, or WEBP up to 2MB.</p>
              {fieldErrors.profileImage && <p className="text-xs text-rose-600 mt-1">{fieldErrors.profileImage}</p>}
            </div>
          </div>
        </div>

        <div>
          <label className="label">Full Name</label>
          <input className="input" name="fullName" placeholder="e.g. Nur Syafiqah" onChange={(event) => setFullName(event.target.value)} />
          {fieldErrors.fullName && <p className="text-xs text-rose-600 mt-1">{fieldErrors.fullName}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField name="payName" label="Pay Name" placeholder="e.g. nur.sya" error={fieldErrors.payName} />
          <InputField name="aliasPanggilan" label="Alias Panggilan" placeholder="e.g. NURSYA01" error={fieldErrors.aliasPanggilan} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField name="phone" label="Malaysia Mobile Number" placeholder="e.g. +60 12-345 6789" error={fieldErrors.phone} inputMode="tel" />
          <InputField name="email" label="Email (Optional)" placeholder="e.g. nur@example.com" error={fieldErrors.email} inputMode="email" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">IC Number</label>
            <input
              className="input"
              name="icNumber"
              inputMode="numeric"
              placeholder="e.g. 010203-10-1234"
              value={icInput}
              onChange={(event) => setIcInput(event.target.value)}
              onBlur={() => setIcInput((value) => formatIcNumber(normalizeIcNumber(value) || value))}
            />
            <p className="text-xs text-ink-500 mt-1">Gender is auto-derived from the IC number unless changed later by admin.</p>
            {fieldErrors.icNumber && <p className="text-xs text-rose-600 mt-1">{fieldErrors.icNumber}</p>}
          </div>
          <div className="rounded-2xl border border-ink-200 bg-ink-50/70 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-ink-500">Derived Gender</div>
            <div className="mt-1 text-sm font-medium text-ink-900">{derivedGender === 'UNKNOWN' ? 'Not enough IC data yet' : derivedGender}</div>
            <input type="hidden" name="gender" value="AUTO" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Bank</label>
            <select className="input" name="bankCode" value={bankCode} onChange={(event) => setBankCode(event.target.value)}>
              <option value="">Select bank</option>
              {MALAYSIA_BANK_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>{option.label}</option>
              ))}
            </select>
            {fieldErrors.bankCode && <p className="text-xs text-rose-600 mt-1">{fieldErrors.bankCode}</p>}
          </div>
          <InputField name="bankAccountNumber" label="Bank Account Number" placeholder="e.g. 123456789012" error={fieldErrors.bankAccountNumber} inputMode="numeric" />
        </div>

        {bankCode === 'OTHER' && (
          <InputField name="customBankName" label="Custom Bank Name" placeholder="e.g. GX Bank" error={fieldErrors.customBankName} />
        )}

        <div>
          <label className="label">Notes (Optional)</label>
          <textarea className="input min-h-[90px]" name="notes" placeholder="Anything admin should know about your profile…" />
        </div>

        {step === 'otp' && (
          <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4 space-y-3">
            <div>
              <div className="text-sm font-medium text-ink-900">Enter WhatsApp OTP</div>
              <p className="text-xs text-ink-600 mt-1">If you update your phone number after requesting the OTP, send a new OTP before verifying.</p>
            </div>
            <div>
              <label className="label">4-digit OTP</label>
              <input
                className="input max-w-[220px] tracking-[0.3em] text-center"
                inputMode="numeric"
                maxLength={4}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
              />
              {fieldErrors.otpCode && <p className="text-xs text-rose-600 mt-1">{fieldErrors.otpCode}</p>}
            </div>
          </div>
        )}

        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <div className="flex flex-wrap gap-3">
          {step === 'form' ? (
            <button type="button" disabled={pending} onClick={sendOtp} className="btn-primary">
              {pending ? 'Sending OTP…' : 'Send WhatsApp OTP'}
            </button>
          ) : (
            <>
              <button type="button" disabled={pending || otpCode.length !== 4} onClick={verifyOtp} className="btn-primary">
                {pending ? 'Verifying…' : 'Verify & Submit'}
              </button>
              <button type="button" disabled={pending} onClick={sendOtp} className="btn-ghost">
                {pending ? 'Sending…' : 'Resend OTP'}
              </button>
            </>
          )}
          <Link href="/login" className="btn-ghost">Back to Login</Link>
        </div>
      </form>
    </div>
  );
}

function InputField({
  name,
  label,
  placeholder,
  error,
  inputMode,
}: {
  name: string;
  label: string;
  placeholder?: string;
  error?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" name={name} placeholder={placeholder} inputMode={inputMode} />
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}