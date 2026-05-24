'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { PublicLocale } from '@/lib/public-i18n';

const copy = {
  ms: {
    identifier: 'Emel atau nombor telefon',
    request: 'Hantar arahan reset',
    code: 'Kod reset',
    password: 'Kata laluan baru',
    confirmPassword: 'Sahkan kata laluan baru',
    save: 'Tetapkan kata laluan',
    login: 'Kembali log masuk',
    sent: 'Jika akaun wujud, arahan reset kata laluan telah dihantar.',
  },
  id: {
    identifier: 'Email atau nomor telepon',
    request: 'Kirim instruksi reset',
    code: 'Kode reset',
    password: 'Kata sandi baru',
    confirmPassword: 'Konfirmasi kata sandi baru',
    save: 'Tetapkan kata sandi',
    login: 'Kembali masuk',
    sent: 'Jika akun ada, instruksi reset kata sandi telah dikirim.',
  },
  en: {
    identifier: 'Email or phone number',
    request: 'Send reset instructions',
    code: 'Reset code',
    password: 'New password',
    confirmPassword: 'Confirm new password',
    save: 'Set password',
    login: 'Back to login',
    sent: 'If an account exists, password reset instructions have been sent.',
  },
} as const;

export function ForgotPasswordForm({ locale, initialIdentifier = '' }: { locale: PublicLocale; initialIdentifier?: string }) {
  const t = copy[locale];
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);

  async function requestReset(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    setRequested(true);
    setMessage(data.message || t.sent);
  }

  async function confirmReset(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/password-reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, code, password, confirmPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok || !data.ok) {
      setError(data.message || 'Reset failed.');
      return;
    }
    setMessage(data.message || 'Password updated.');
  }

  return (
    <div className="space-y-5">
      <form onSubmit={requestReset} className="space-y-4">
        <div>
          <label className="label">{t.identifier}</label>
          <input className="input" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" required />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>{t.request}</button>
      </form>

      {requested ? (
        <form onSubmit={confirmReset} className="space-y-4 border-t border-ink-200 pt-5">
          <div>
            <label className="label">{t.code}</label>
            <input className="input" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))} required />
          </div>
          <div>
            <label className="label">{t.password}</label>
            <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
          </div>
          <div>
            <label className="label">{t.confirmPassword}</label>
            <input className="input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading || code.length !== 4}>{t.save}</button>
        </form>
      ) : null}

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <Link href={`/login?lang=${locale}`} className="inline-flex text-sm font-medium text-brand-700 hover:underline">{t.login}</Link>
    </div>
  );
}
