import Link from 'next/link';
import { cookies } from 'next/headers';
import { PublicLanguageSelector } from '@/components/PublicLanguageSelector';
import { normalizeLocale, publicDict } from '@/lib/public-i18n';

export const dynamic = 'force-dynamic';

export default async function RegisterEntryPage(props: { searchParams: Promise<{ lang?: string }> }) {
  const searchParams = await props.searchParams;
  const locale = normalizeLocale(searchParams.lang || (await cookies()).get('partime_public_lang')?.value);
  const t = publicDict[locale];
  const langQuery = `?lang=${locale}`;

  return (
    <div className="min-h-screen bg-ink-50 px-6 py-10 md:py-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Link href={`/login${langQuery}`} className="text-sm font-medium text-brand-700 hover:underline">{t.adminSignIn}</Link>
          <PublicLanguageSelector locale={locale} />
        </div>

        <div className="text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">Partime</div>
          <h1 className="mt-3 text-3xl font-semibold text-ink-950">{t.landingTitle}</h1>
          <p className="mt-2 text-sm text-ink-600">{t.landingSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ChoiceCard
            href={`/register/part-timer${langQuery}`}
            title={t.applyPartTimer}
            description={locale === 'en' ? 'Create your worker profile, choose skills, and verify with WhatsApp OTP.' : locale === 'id' ? 'Buat profil kerja, pilih keahlian, dan verifikasi dengan OTP WhatsApp.' : 'Cipta profil kerja, pilih kemahiran, dan sahkan dengan OTP WhatsApp.'}
            icon="PT"
          />
          <ChoiceCard
            href={`/register/employer${langQuery}`}
            title={t.employerRegister}
            description={locale === 'en' ? 'Register your company workspace and wait for platform approval.' : locale === 'id' ? 'Daftarkan workspace perusahaan dan tunggu persetujuan platform.' : 'Daftar workspace syarikat dan tunggu kelulusan platform.'}
            icon="MY"
          />
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({ href, title, description, icon }: { href: string; title: string; description: string; icon: string }) {
  return (
    <Link href={href} className="card card-pad block transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-700">{icon}</span>
        <span>
          <span className="block text-xl font-semibold text-ink-950">{title}</span>
          <span className="mt-2 block text-sm leading-6 text-ink-600">{description}</span>
        </span>
      </div>
    </Link>
  );
}