import { cookies } from 'next/headers';
import { PublicLanguageSelector } from '@/components/PublicLanguageSelector';
import { normalizeLocale } from '@/lib/public-i18n';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const dynamic = 'force-dynamic';

const copy = {
  ms: { title: 'Reset kata laluan', subtitle: 'Masukkan emel atau nombor telefon. Jika akaun wujud, kami akan hantar arahan reset.' },
  id: { title: 'Reset kata sandi', subtitle: 'Masukkan email atau nomor telepon. Jika akun ada, kami akan mengirim instruksi reset.' },
  en: { title: 'Reset password', subtitle: 'Enter your email or phone number. If an account exists, we will send reset instructions.' },
} as const;

export default async function ForgotPasswordPage(props: { searchParams: Promise<{ lang?: string; identifier?: string }> }) {
  const searchParams = await props.searchParams;
  const locale = normalizeLocale(searchParams.lang || (await cookies()).get('partime_public_lang')?.value);
  const t = copy[locale];

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end"><PublicLanguageSelector locale={locale} /></div>
        <div className="card card-pad space-y-5">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">Partime</div>
            <h1 className="mt-3 text-2xl font-semibold text-ink-950">{t.title}</h1>
            <p className="mt-2 text-sm leading-6 text-ink-600">{t.subtitle}</p>
          </div>
          <ForgotPasswordForm locale={locale} initialIdentifier={searchParams.identifier || ''} />
        </div>
      </div>
    </div>
  );
}
