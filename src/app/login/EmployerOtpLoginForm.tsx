'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EmployerOtpLoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [resendRemainingSeconds, setResendRemainingSeconds] = useState(0);

  useEffect(() => {
    if (resendRemainingSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setResendRemainingSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendRemainingSeconds]);

  async function sendOtp() {
    setError(null);
    setMessage(null);
    setSendingOtp(true);

    try {
      const formData = new FormData();
      formData.set('purpose', 'EMPLOYER_LOGIN');
      formData.set('phone', phone);

      const res = await fetch('/api/public/otp/send', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Unable to send OTP right now.');
        if (typeof data.retryAfterSeconds === 'number') {
          setResendRemainingSeconds(data.retryAfterSeconds);
        }
        return;
      }

      setMessage(data.message || 'OTP sent to your WhatsApp number.');
      setResendRemainingSeconds(typeof data.resendAfterSeconds === 'number' ? data.resendAfterSeconds : 0);
    } catch {
      setError('Network error while sending OTP.');
    } finally {
      setSendingOtp(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSigningIn(true);

    try {
      const res = await fetch('/api/auth/employer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otpCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Employer sign in failed.');
        return;
      }

      router.push(data.redirectTo || safeNext(next) || '/employer/dashboard');
      router.refresh();
    } catch {
      setError('Network error while signing in.');
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">WhatsApp number</label>
        <input className="input" type="tel" placeholder="e.g. 0123456789" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-ghost" disabled={sendingOtp || resendRemainingSeconds > 0 || !phone.trim()} onClick={sendOtp}>
          {sendingOtp ? 'Sending OTP…' : resendRemainingSeconds > 0 ? `Resend OTP in ${resendRemainingSeconds}s` : 'Send WhatsApp OTP'}
        </button>
        {message ? <div className="text-sm text-emerald-700">{message}</div> : null}
      </div>
      <div>
        <label className="label">OTP code</label>
        <input className="input" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))} required />
      </div>
      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      <button type="submit" className="btn-primary w-full" disabled={signingIn || otpCode.length !== 4}>
        {signingIn ? 'Signing in…' : 'Sign in as employer'}
      </button>
    </form>
  );
}

function safeNext(value?: string): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith('/')) return undefined;
  if (value.startsWith('//')) return undefined;
  return value.startsWith('/employer') ? value : undefined;
}