import Link from 'next/link';
import { cookies } from 'next/headers';
import { PublicLanguageSelector } from '@/components/PublicLanguageSelector';
import { prisma } from '@/lib/db';
import { normalizeLocale } from '@/lib/public-i18n';
import { formatJobDate, formatJobRate, jobPublicHref, listPublicJobs } from '@/lib/marketplace';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const copy = {
  ms: {
    eyebrow: 'Partime Marketplace',
    title: 'Cari kerja sambilan yang sesuai dengan jadual anda',
    subtitle: 'Kerja event, promosi, F&B, retail, warehouse dan tugasan teknikal daripada majikan yang disemak.',
    search: 'Cari kerja, lokasi atau kemahiran',
    location: 'Lokasi',
    browse: 'Cari kerja',
    registerPartTimer: 'Daftar pekerja sambilan',
    registerEmployer: 'Daftar majikan',
    latest: 'Kerja terkini',
    categories: 'Kategori popular',
    noJobs: 'Belum ada kerja dibuka. Cuba daftar profil dahulu.',
  },
  id: {
    eyebrow: 'Partime Marketplace',
    title: 'Temukan kerja paruh waktu yang cocok dengan jadwal Anda',
    subtitle: 'Event, promosi, F&B, retail, warehouse dan kerja teknis dari pemberi kerja yang ditinjau.',
    search: 'Cari kerja, lokasi atau keahlian',
    location: 'Lokasi',
    browse: 'Cari kerja',
    registerPartTimer: 'Daftar pekerja paruh waktu',
    registerEmployer: 'Daftar pemberi kerja',
    latest: 'Kerja terbaru',
    categories: 'Kategori populer',
    noJobs: 'Belum ada kerja terbuka. Coba daftar profil terlebih dahulu.',
  },
  en: {
    eyebrow: 'Partime Marketplace',
    title: 'Find part-time work that fits your schedule',
    subtitle: 'Events, promotions, F&B, retail, warehouse and technical work from reviewed employers.',
    search: 'Search jobs, locations or skills',
    location: 'Location',
    browse: 'Search jobs',
    registerPartTimer: 'Register as part-timer',
    registerEmployer: 'Register as employer',
    latest: 'Latest jobs',
    categories: 'Popular categories',
    noJobs: 'No open jobs yet. Create your profile first.',
  },
};

export default async function Home({ searchParams }: { searchParams: { lang?: string; q?: string; location?: string } }) {
  const locale = normalizeLocale(searchParams.lang || cookies().get('partime_public_lang')?.value);
  const t = copy[locale];
  const [jobs, categories] = await Promise.all([
    listPublicJobs({ q: searchParams.q, location: searchParams.location }, 6),
    prisma.workEvent.groupBy({
      by: ['category'],
      where: { active: true, publicVisible: true, jobStatus: { in: ['OPEN', 'OFFERING'] }, category: { not: null } },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
      take: 8,
    }),
  ]);
  const langQuery = `lang=${locale}`;

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-ink-900">
      <header className="border-b border-black/10 bg-[#f7f3ea]/95 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href={`/?${langQuery}`} className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 text-sm font-bold text-white">P</span>
            <span className="text-lg font-semibold tracking-tight">Partime</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/register?${langQuery}`} className="hidden rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-medium text-ink-800 md:inline-flex">Register</Link>
            <Link href="/login" className="hidden rounded-lg bg-ink-900 px-3 py-2 text-sm font-medium text-white md:inline-flex">Admin</Link>
            <PublicLanguageSelector locale={locale} />
          </div>
        </div>
      </header>

      <section className="px-4 py-8 md:px-8 md:py-14">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a5b22]">{t.eyebrow}</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-ink-950 md:text-6xl">{t.title}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-700 md:text-lg">{t.subtitle}</p>
            </div>
            <form action="/jobs" className="grid gap-3 rounded-xl border border-black/10 bg-white p-3 shadow-card md:grid-cols-[1fr_0.75fr_auto]">
              <input type="hidden" name="lang" value={locale} />
              <input className="input border-transparent bg-ink-50" name="q" defaultValue={searchParams.q || ''} placeholder={t.search} />
              <input className="input border-transparent bg-ink-50" name="location" defaultValue={searchParams.location || ''} placeholder={t.location} />
              <button className="btn-primary bg-[#b46f22] hover:bg-[#945816]" type="submit">{t.browse}</button>
            </form>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <Link href={`/register/part-timer?${langQuery}`} className="rounded-lg bg-ink-900 px-4 py-3 text-center text-sm font-semibold text-white">{t.registerPartTimer}</Link>
              <Link href={`/register/employer?${langQuery}`} className="rounded-lg border border-black/10 bg-white px-4 py-3 text-center text-sm font-semibold text-ink-900">{t.registerEmployer}</Link>
            </div>
          </div>

          <div className="rounded-xl border border-black/10 bg-[#1d2a24] p-4 text-white shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t.latest}</h2>
              <Link href={`/jobs?${langQuery}`} className="text-sm text-[#f2c87c] hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              {jobs.length === 0 && <div className="rounded-lg bg-white/8 p-4 text-sm text-white/70">{t.noJobs}</div>}
              {jobs.map((job) => (
                <Link key={job.id} href={`${jobPublicHref(job)}?${langQuery}`} className="block rounded-lg bg-white p-4 text-ink-900 transition hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold">{job.name}</div>
                      <div className="mt-1 text-xs text-ink-500">{job.tenant.name} - {job.location}</div>
                    </div>
                    <div className="text-right text-xs font-semibold text-[#9b5f19]">{formatJobDate(job.workDate)}</div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold">{formatJobRate(job)}</span>
                    <span className="text-xs text-ink-500">{job.filledCount}/{job.headcount} filled</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-lg font-semibold text-ink-950">{t.categories}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((entry) => entry.category && (
              <Link key={entry.category} href={`/jobs?category=${encodeURIComponent(entry.category)}&${langQuery}`} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-ink-700">
                {entry.category} ({entry._count.category})
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
