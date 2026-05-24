import Link from 'next/link';
import { cookies } from 'next/headers';
import LoginForm from './LoginForm';
import { getSession, resolveAuthenticatedHomePath } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PublicLanguageSelector } from '@/components/PublicLanguageSelector';
import { normalizeLocale, type PublicLocale } from '@/lib/public-i18n';

export const dynamic = 'force-dynamic';

const copy = {
  ms: {
    headingLead: 'Log masuk ke',
    subtitle: 'Satu akaun untuk urus kerja sambilan, syarikat, dan operasi anda.',
    cardSubtitle: 'Akses akaun anda',
    securityNote: 'Log masuk selamat untuk majikan, pekerja sambilan, dan admin.',
    illustrationTitle: 'Ringkasan',
    illustrationSubtitle: 'Semak operasi akaun anda sepintas lalu.',
    stats: ['Tugasan aktif', 'Permohonan baru', 'Syarikat aktif'],
    queueTitle: 'Permohonan terkini',
    fillRate: 'Kadar pengisian',
    fillRatePeriod: 'Minggu ini',
    chips: ['Majikan', 'Pekerja Sambilan', 'Admin Workspace'],
    chipSubtitles: ['Urus pasukan & tugasan', 'Cari kerja & mohon', 'Kawal akses & tetapan'],
  },
  id: {
    headingLead: 'Masuk ke',
    subtitle: 'Satu akun untuk mengelola kerja paruh waktu, perusahaan, dan operasi Anda.',
    cardSubtitle: 'Akses akun Anda',
    securityNote: 'Masuk aman untuk pemberi kerja, pekerja paruh waktu, dan admin.',
    illustrationTitle: 'Ringkasan',
    illustrationSubtitle: 'Pantau operasi akun Anda dalam satu tampilan.',
    stats: ['Tugas aktif', 'Lamaran baru', 'Perusahaan aktif'],
    queueTitle: 'Lamaran terbaru',
    fillRate: 'Tingkat pengisian',
    fillRatePeriod: 'Minggu ini',
    chips: ['Pemberi Kerja', 'Pekerja Paruh Waktu', 'Admin Workspace'],
    chipSubtitles: ['Kelola tim & tugas', 'Cari kerja & melamar', 'Atur akses & pengaturan'],
  },
  en: {
    headingLead: 'Log in to',
    subtitle: 'One account to manage part-time work, companies, and your operations.',
    cardSubtitle: 'Access your account',
    securityNote: 'Secure login for employers, part-timers, and admins.',
    illustrationTitle: 'Overview',
    illustrationSubtitle: 'See your account operations at a glance.',
    stats: ['Active tasks', 'New applications', 'Active companies'],
    queueTitle: 'Recent applications',
    fillRate: 'Fill rate',
    fillRatePeriod: 'This week',
    chips: ['Employers', 'Part-timers', 'Admin Workspace'],
    chipSubtitles: ['Manage teams and shifts', 'Find jobs and apply', 'Control access and settings'],
  },
} as const;

export default async function LoginPage(
  props: {
    searchParams: Promise<{ next?: string; lang?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const locale = normalizeLocale(searchParams.lang || (await cookies()).get('partime_public_lang')?.value);
  const t = copy[locale];
  const s = await getSession();
  if (s) redirect(searchParams.next || resolveAuthenticatedHomePath(s));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(224,231,255,0.85),transparent_20%),radial-gradient(circle_at_top_right,_rgba(224,231,255,0.75),transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(199,210,254,0.5),transparent_22%),linear-gradient(180deg,#fbfdff_0%,#f5f9ff_50%,#eef4ff_100%)]">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-brand-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-ink-100/70 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-brand-100/50 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 rounded-[28px] border border-white/80 bg-white/80 px-5 py-4 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.4)] backdrop-blur-sm sm:px-6">
          <Link href={`/?lang=${locale}`} className="flex items-center gap-3 text-ink-950 transition hover:opacity-90">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white shadow-[0_18px_28px_-18px_rgba(37,64,216,0.95)]">P</span>
            <span className="text-2xl font-semibold tracking-[-0.03em]">Partime</span>
          </Link>
          <PublicLanguageSelector locale={locale} />
        </header>

        <main className="flex flex-1 items-center py-8 lg:py-12">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] lg:gap-14">
            <section className="order-2 lg:order-1">
              <div className="max-w-2xl">
                <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.06em] text-ink-950 sm:text-5xl lg:text-6xl">
                  {t.headingLead}{' '}
                  <span className="text-brand-500">Partime</span>
                </h1>
                <p className="mt-5 max-w-xl text-lg leading-8 text-ink-500 sm:text-xl">
                  {t.subtitle}
                </p>
              </div>

              <DashboardIllustration locale={locale} />
            </section>

            <section className="order-1 lg:order-2">
              <div className="mx-auto w-full max-w-[470px]">
                <div className="rounded-[32px] border border-white/90 bg-white/86 p-6 shadow-[0_35px_90px_-56px_rgba(37,64,216,0.45)] backdrop-blur-xl sm:p-8">
                  <div className="mb-8 flex items-center gap-4">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white shadow-[0_22px_36px_-20px_rgba(37,64,216,0.95)]">P</span>
                    <div>
                      <div className="text-[2rem] font-semibold leading-none tracking-[-0.04em] text-ink-950">Partime</div>
                      <div className="mt-1 text-sm text-ink-500">{t.cardSubtitle}</div>
                    </div>
                  </div>

                  <LoginForm next={searchParams.next} locale={locale} />
                </div>

                <div className="mt-6 flex items-start gap-3 px-2 text-sm leading-6 text-ink-500">
                  <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-brand-500 shadow-[0_16px_32px_-24px_rgba(15,23,42,0.45)]">
                    <ShieldIcon />
                  </span>
                  <p className="max-w-sm">{t.securityNote}</p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function DashboardIllustration({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];

  return (
    <div className="mt-10">
      <div className="relative rounded-[36px] border border-white/80 bg-white/60 p-4 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:p-6">
        <div className="pointer-events-none absolute -right-5 top-8 hidden rounded-full bg-brand-100/90 p-4 text-brand-600 shadow-[0_18px_50px_-36px_rgba(37,64,216,0.85)] sm:flex">
          <PeopleIcon />
        </div>

        <div className="grid gap-4 sm:grid-cols-[84px_1fr]">
          <div className="rounded-[28px] bg-gradient-to-b from-brand-500 to-brand-700 p-4 text-white shadow-[0_30px_55px_-35px_rgba(37,64,216,1)]">
            <div className="flex h-full flex-col items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold">P</span>
              <div className="grid gap-3 py-4 text-white/85">
                <SidebarDot active />
                <SidebarDot />
                <SidebarDot />
                <SidebarDot />
              </div>
              <SidebarDot />
            </div>
          </div>

          <div className="space-y-4 rounded-[28px] bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-ink-900">{t.illustrationTitle}</div>
                <div className="mt-1 text-xs text-ink-500">{t.illustrationSubtitle}</div>
              </div>
              <div className="hidden items-center gap-1 text-brand-500 sm:flex">
                <DotGrid />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {t.stats.map((item, index) => (
                <div key={item} className="rounded-[22px] border border-ink-100 bg-white px-4 py-3 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.4)]">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-ink-950">{['126', '32', '18'][index]}</div>
                  <div className="mt-1 text-xs text-ink-500">{item}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px]">
              <div className="rounded-[24px] border border-ink-100 bg-white px-4 py-4 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.35)]">
                <div className="text-sm font-semibold text-ink-900">{t.queueTitle}</div>
                <div className="mt-4 space-y-4">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                        {item + 1}
                      </div>
                      <div className="flex-1">
                        <div className="h-2.5 w-3/4 rounded-full bg-ink-100" />
                        <div className="mt-2 h-2 w-1/2 rounded-full bg-brand-100" />
                      </div>
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-ink-100 bg-white px-4 py-5 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.35)]">
                <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[conic-gradient(#2540D8_0_92%,#E0E7FF_92%_100%)] p-2">
                  <div className="grid h-full w-full place-items-center rounded-full bg-white text-2xl font-semibold tracking-[-0.04em] text-ink-950">92%</div>
                </div>
                <div className="mt-4 text-center text-sm font-semibold text-ink-900">{t.fillRate}</div>
                <div className="mt-1 text-center text-xs text-ink-500">{t.fillRatePeriod}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {t.chips.map((item, index) => (
          <div key={item} className="rounded-[24px] border border-white/85 bg-white/82 px-4 py-4 shadow-[0_20px_45px_-40px_rgba(15,23,42,0.4)] backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                {index === 0 ? <BriefcaseIcon /> : index === 1 ? <UserStarIcon /> : <ShieldIcon />}
              </span>
              <div>
                <div className="text-sm font-semibold text-ink-900">{item}</div>
                <div className="mt-0.5 text-xs text-ink-500">{t.chipSubtitles[index]}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SidebarDot({ active = false }: { active?: boolean }) {
  return <span className={`block h-9 w-9 rounded-2xl border ${active ? 'border-white/20 bg-white/18' : 'border-white/15 bg-white/10'}`} />;
}

function DotGrid() {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {Array.from({ length: 12 }, (_, index) => (
        <span key={index} className="h-1.5 w-1.5 rounded-full bg-brand-100" />
      ))}
    </div>
  );
}

function PeopleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M8.5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 18.5A4.5 4.5 0 0 1 8 14h1a4.5 4.5 0 0 1 4.5 4.5v.5h-10v-.5Zm11.5.5a3.5 3.5 0 0 1 3.5-3.5h.5a3.5 3.5 0 0 1 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="4" y="7" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 11.5c2.5 1.3 5.2 2 8 2s5.5-.7 8-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function UserStarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <circle cx="10" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m18.5 7 .65 1.32 1.46.21-1.06 1.03.25 1.45-1.3-.69-1.3.69.24-1.45-1.05-1.03 1.45-.21L18.5 7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M12 3.75 5.25 6.5v5.12c0 4.1 2.73 7.94 6.75 8.88 4.02-.94 6.75-4.78 6.75-8.88V6.5L12 3.75Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m9.25 12.25 1.75 1.75 3.75-4.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
