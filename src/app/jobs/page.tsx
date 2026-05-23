import Link from 'next/link';
import { cookies } from 'next/headers';
import { PublicLanguageSelector } from '@/components/PublicLanguageSelector';
import { prisma } from '@/lib/db';
import { normalizeLocale } from '@/lib/public-i18n';
import { JOB_CATEGORIES, MALAYSIA_STATES, formatJobDate, formatJobRate, jobPublicHref, listPublicJobs } from '@/lib/marketplace';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function JobsPage({ searchParams }: { searchParams: { lang?: string; q?: string; location?: string; state?: string; category?: string; skill?: string; minRate?: string; interest?: string } }) {
  const locale = normalizeLocale(searchParams.lang || cookies().get('partime_public_lang')?.value);
  const [jobs, skills] = await Promise.all([
    listPublicJobs(searchParams, 60),
    prisma.skill.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }], take: 40 }),
  ]);

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-4 py-5 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex items-center justify-between gap-4">
          <Link href={`/?lang=${locale}`} className="flex items-center gap-2 text-lg font-semibold"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 text-sm text-white">P</span>Partime</Link>
          <PublicLanguageSelector locale={locale} />
        </header>

        <section className="rounded-xl border border-black/10 bg-white p-4 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a5b22]">Marketplace</p>
              <h1 className="mt-2 text-3xl font-semibold text-ink-950">Open part-time jobs</h1>
            </div>
            <Link href={`/register/part-timer?lang=${locale}`} className="btn-primary bg-[#b46f22] hover:bg-[#945816]">Create profile</Link>
          </div>
          {searchParams.interest === 'job-unavailable' && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">That job is no longer available.</p>}
          <form action="/jobs" className="mt-4 grid gap-3 md:grid-cols-5">
            <input type="hidden" name="lang" value={locale} />
            <input className="input md:col-span-2" name="q" defaultValue={searchParams.q || ''} placeholder="Search title, work type or location" />
            <select className="input" name="state" defaultValue={searchParams.state || ''}>
              <option value="">All states</option>
              {MALAYSIA_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
            <select className="input" name="category" defaultValue={searchParams.category || ''}>
              <option value="">All categories</option>
              {JOB_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <button className="btn-primary bg-ink-900 hover:bg-ink-700" type="submit">Filter</button>
            <select className="input md:col-span-2" name="skill" defaultValue={searchParams.skill || ''}>
              <option value="">Any skill</option>
              {skills.map((skill) => <option key={skill.id} value={skill.slug}>{skill.nameEn}</option>)}
            </select>
            <input className="input" name="location" defaultValue={searchParams.location || ''} placeholder="City or venue" />
            <input className="input" name="minRate" defaultValue={searchParams.minRate || ''} placeholder="Min RM" inputMode="decimal" />
            <Link href={`/jobs?lang=${locale}`} className="btn-ghost">Reset</Link>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.length === 0 && <div className="rounded-xl border border-black/10 bg-white p-6 text-sm text-ink-600 md:col-span-2 xl:col-span-3">No open jobs match this search.</div>}
          {jobs.map((job) => (
            <Link key={job.id} href={`${jobPublicHref(job)}?lang=${locale}`} className="rounded-xl border border-black/10 bg-white p-5 shadow-card transition hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a5b22]">{job.category || 'Part-time'}</p>
                  <h2 className="mt-2 text-xl font-semibold text-ink-950">{job.name}</h2>
                  <p className="mt-2 text-sm text-ink-600">{job.summary || job.description || 'Open marketplace job'}</p>
                </div>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{job.jobStatus}</span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-ink-600">
                <div>{job.tenant.name}</div>
                <div>{job.location}</div>
                <div>{formatJobDate(job.workDate)} {job.startTime ? `- ${job.startTime}` : ''}</div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4">
                <span className="font-semibold text-ink-950">{formatJobRate(job)}</span>
                <span className="text-xs text-ink-500">{job.filledCount}/{job.headcount} filled</span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}