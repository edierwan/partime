import Link from 'next/link';
import { cookies } from 'next/headers';
import { PublicLanguageSelector } from '@/components/PublicLanguageSelector';
import { prisma } from '@/lib/db';
import { normalizeLocale } from '@/lib/public-i18n';
import { JOB_CATEGORIES, MALAYSIA_STATES, formatJobDate, formatJobRate, jobPublicHref, listPublicJobs } from '@/lib/marketplace';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const fallbackImages = [
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80',
];

export default async function JobsPage({ searchParams }: { searchParams: { lang?: string; q?: string; location?: string; state?: string; category?: string; skill?: string; date?: string; payType?: string; minRate?: string; openOnly?: string; interest?: string } }) {
  const locale = normalizeLocale(searchParams.lang || cookies().get('partime_public_lang')?.value);
  const [jobs, skills] = await Promise.all([
    listPublicJobs(searchParams, 60),
    prisma.skill.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }], take: 80 }),
  ]);

  return (
    <main className="min-h-screen bg-[#f4f8ff] px-4 py-5 text-[#081638] md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex items-center justify-between gap-4">
          <Link href={`/?lang=${locale}`} className="flex items-center gap-2 text-lg font-black text-[#092152]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#075bf2] text-sm text-white">P</span>Partime</Link>
          <div className="flex items-center gap-2"><PublicLanguageSelector locale={locale} /><Link href="/register/part-timer" className="hidden rounded-lg bg-[#075bf2] px-3 py-2 text-sm font-black text-white sm:inline-flex">Create profile</Link></div>
        </header>

        <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black text-[#075bf2]">Marketplace</p>
              <h1 className="mt-2 text-3xl font-black text-[#092152]">Open part-time jobs</h1>
              <p className="mt-1 text-sm font-semibold text-[#60749b]">Filter by location, skill, date, category and pay type.</p>
            </div>
            <Link href={`/register/part-timer?lang=${locale}`} className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-black text-[#075bf2]">Create profile</Link>
          </div>
          {searchParams.interest === 'job-unavailable' && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">That job is no longer available.</p>}
          <form action="/jobs" className="mt-4 grid gap-3 md:grid-cols-6">
            <input type="hidden" name="lang" value={locale} />
            <input className="input border-blue-100 md:col-span-2" name="q" defaultValue={searchParams.q || ''} placeholder="Search title, work type or employer" />
            <input className="input border-blue-100" name="location" defaultValue={searchParams.location || ''} placeholder="City or venue" />
            <input className="input border-blue-100" name="date" type="date" defaultValue={searchParams.date || ''} />
            <select className="input border-blue-100" name="state" defaultValue={searchParams.state || ''}>
              <option value="">All states</option>
              {MALAYSIA_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
            <button className="rounded-xl bg-[#075bf2] px-5 py-3 text-sm font-black text-white" type="submit">Filter</button>
            <select className="input border-blue-100 md:col-span-2" name="skill" defaultValue={searchParams.skill || ''}>
              <option value="">Any skill</option>
              {skills.map((skill) => <option key={skill.id} value={skill.slug}>{skill.nameEn}</option>)}
            </select>
            <select className="input border-blue-100" name="category" defaultValue={searchParams.category || ''}>
              <option value="">All categories</option>
              {JOB_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <select className="input border-blue-100" name="payType" defaultValue={searchParams.payType || ''}>
              <option value="">Any pay type</option>
              <option value="HOURLY">Hourly</option>
              <option value="DAILY">Daily</option>
              <option value="FIXED">Fixed</option>
            </select>
            <input className="input border-blue-100" name="minRate" defaultValue={searchParams.minRate || ''} placeholder="Min RM" inputMode="decimal" />
            <label className="flex items-center justify-center gap-2 rounded-xl border border-blue-100 px-3 py-2 text-sm font-bold text-[#405b8d]"><input type="checkbox" name="openOnly" defaultChecked={searchParams.openOnly === 'on'} />Open only</label>
            <Link href={`/jobs?lang=${locale}`} className="rounded-xl border border-blue-200 px-5 py-3 text-center text-sm font-black text-[#075bf2]">Reset</Link>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-8 text-center text-sm font-semibold text-[#60749b] md:col-span-2 xl:col-span-3">
              <div className="text-xl font-black text-[#092152]">No open jobs match this search.</div>
              <Link href={`/jobs?lang=${locale}`} className="mt-4 inline-flex rounded-xl bg-[#075bf2] px-4 py-2 text-sm font-black text-white">Clear filters</Link>
            </div>
          )}
          {jobs.map((job, index) => (
            <Link key={job.id} href={`${jobPublicHref(job)}?lang=${locale}`} className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(20,65,130,0.14)]">
              <div className="relative aspect-[16/9] bg-blue-100">
                <img src={jobImage(job, index)} alt={job.name} className="h-full w-full object-cover" />
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-[#075bf2]">{job.category || 'Part-time'}</span>
                <span className="absolute right-3 top-3 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">{job.jobStatus}</span>
              </div>
              <div className="p-5">
                <h2 className="line-clamp-1 text-xl font-black text-[#092152]">{job.name}</h2>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[#60749b]">{job.summary || job.description || 'Open marketplace job'}</p>
                <div className="mt-4 grid gap-2 text-sm font-semibold text-[#405b8d]">
                  <div>{job.tenant.name}</div>
                  <div>{job.location}</div>
                  <div>{formatJobDate(job.workDate)} {job.startTime ? `- ${job.startTime}` : ''}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1">
                  {(job.skills.length ? job.skills.slice(0, 3).map(({ skill }) => skill.nameEn) : [job.category || 'Part-time']).map((tag) => <span key={tag} className="rounded-md bg-[#eef5ff] px-2 py-1 text-[11px] font-bold text-[#075bf2]">{tag}</span>)}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-blue-100 pt-4">
                  <span className="font-black text-[#092152]">{formatJobRate(job)}</span>
                  <span className="text-xs font-semibold text-[#60749b]">{job.filledCount}/{job.headcount} filled</span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

function jobImage(job: Awaited<ReturnType<typeof listPublicJobs>>[number], index: number): string {
  return job.coverImageUrl || job.media.find((media) => media.mediaType === 'IMAGE')?.url || fallbackImages[index % fallbackImages.length];
}
