'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicLocale } from '@/lib/public-i18n';

const copy = {
  ms: {
    identifier: 'Email atau nombor telefon',
    identifierPlaceholder: 'nama@contoh.com atau 012-345 6789',
    password: 'Kata laluan',
    passwordPlaceholder: 'Masukkan kata laluan',
    forgot: 'Lupa kata laluan?',
    registerPrompt: 'Belum ada akaun?',
    registerLink: 'Daftar sekarang',
    createAccount: 'Cipta akaun baharu',
    divider: 'atau',
    submit: 'Log masuk',
    loading: 'Sedang log masuk...',
    network: 'Ralat rangkaian. Sila cuba lagi.',
    genericError: 'Email/nombor telefon atau kata laluan tidak sah.',
    showPassword: 'Tunjukkan kata laluan',
    hidePassword: 'Sembunyikan kata laluan',
  },
  id: {
    identifier: 'Email atau nomor telepon',
    identifierPlaceholder: 'nama@contoh.com atau 012-345 6789',
    password: 'Kata sandi',
    passwordPlaceholder: 'Masukkan kata sandi',
    forgot: 'Lupa kata sandi?',
    registerPrompt: 'Belum punya akun?',
    registerLink: 'Daftar sekarang',
    createAccount: 'Buat akun baru',
    divider: 'atau',
    submit: 'Masuk',
    loading: 'Sedang masuk...',
    network: 'Kesalahan jaringan. Silakan coba lagi.',
    genericError: 'Email/nomor telepon atau kata sandi tidak valid.',
    showPassword: 'Tampilkan kata sandi',
    hidePassword: 'Sembunyikan kata sandi',
  },
  en: {
    identifier: 'Email or phone number',
    identifierPlaceholder: 'name@example.com or 012-345 6789',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    forgot: 'Forgot password?',
    registerPrompt: 'No account yet?',
    registerLink: 'Register now',
    createAccount: 'Create new account',
    divider: 'or',
    submit: 'Log in',
    loading: 'Logging in...',
    network: 'Network error. Please try again.',
    genericError: 'Invalid email/phone number or password.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
} as const;

export default function LoginForm({ next, locale }: { next?: string; locale: PublicLocale }) {
  const router = useRouter();
  const t = copy[locale];
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const registerHref = buildLocalizedHref('/register', locale, next);
  const forgotHref = buildLocalizedHref('/forgot-password', locale);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || t.genericError);
        if (data.redirectTo) router.push(data.redirectTo);
        setLoading(false);
        return;
      }
      router.push(data.redirectTo || safeNext(next) || '/account/switch');
      router.refresh();
    } catch {
      setErr(t.network);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-ink-700">{t.identifier}</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">
            <MailIcon />
          </span>
          <input
            className="h-12 w-full rounded-2xl border border-ink-200 bg-white pl-12 pr-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
            type="text"
            autoComplete="username"
            autoFocus
            placeholder={t.identifierPlaceholder}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-ink-700">{t.password}</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">
            <LockIcon />
          </span>
          <input
            className="h-12 w-full rounded-2xl border border-ink-200 bg-white pl-12 pr-12 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder={t.passwordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            aria-label={showPassword ? t.hidePassword : t.showPassword}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <Link href={forgotHref} className="text-sm font-semibold text-brand-600 transition hover:text-brand-700 hover:underline">
          {t.forgot}
        </Link>
      </div>

      {err ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div> : null}

      <button
        type="submit"
        className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(37,64,216,0.85)] transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loading}
      >
        {loading ? t.loading : t.submit}
      </button>

      <p className="text-center text-sm text-ink-500">
        {t.registerPrompt}{' '}
        <Link href={registerHref} className="font-semibold text-brand-600 transition hover:text-brand-700 hover:underline">
          {t.registerLink}
        </Link>
      </p>

      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-ink-300">
        <span className="h-px flex-1 bg-ink-200" />
        <span>{t.divider}</span>
        <span className="h-px flex-1 bg-ink-200" />
      </div>

      <Link
        href={registerHref}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-700 transition hover:border-brand-200 hover:bg-brand-50/60 hover:text-brand-700"
      >
        <UserPlusIcon />
        <span>{t.createAccount}</span>
      </Link>
    </form>
  );
}

function safeNext(value?: string): string | undefined {
  if (!value) return undefined;
  return value.startsWith('/') && !value.startsWith('//') ? value : undefined;
}

function buildLocalizedHref(path: string, locale: PublicLocale, next?: string): string {
  const params = new URLSearchParams();
  params.set('lang', locale);
  const safeNextValue = safeNext(next);
  if (safeNextValue) params.set('next', safeNextValue);
  return `${path}?${params.toString()}`;
}

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path d="M3.75 5.833h12.5a.833.833 0 0 1 .833.834v6.666a.833.833 0 0 1-.833.834H3.75a.833.833 0 0 1-.833-.834V6.667a.833.833 0 0 1 .833-.834Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="m3.333 6.667 5.74 4.018a1.667 1.667 0 0 0 1.914 0l5.68-4.018" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path d="M6.667 8.333V6.667a3.333 3.333 0 1 1 6.666 0v1.666" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="4.167" y="8.333" width="11.666" height="8.333" rx="1.667" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path d="M1.667 10s3.03-5 8.333-5c5.304 0 8.333 5 8.333 5s-3.03 5-8.333 5c-5.304 0-8.333-5-8.333-5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path d="M8.53 5.47A8.97 8.97 0 0 1 10 5c5.304 0 8.333 5 8.333 5a14.44 14.44 0 0 1-2.47 2.947M11.768 11.768A2.5 2.5 0 0 1 8.232 8.232" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.146 5.147C3.192 6.299 1.667 10 1.667 10s3.03 5 8.333 5a8.94 8.94 0 0 0 3.765-.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m2.5 2.5 15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path d="M10 11.667c-2.762 0-5 1.492-5 3.333v.833h8.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8.333" cy="6.667" r="2.917" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15.833 6.667v5M13.333 9.167h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
