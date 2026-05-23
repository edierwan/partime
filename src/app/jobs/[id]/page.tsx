import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { PublicLanguageSelector } from '@/components/PublicLanguageSelector';
import { normalizeLocale } from '@/lib/public-i18n';
import { formatJobDate, formatJobRate, jobPublicHref, getPublicJobBySlugOrId } from '@/lib/marketplace';
import { registerJobInterest } from '../actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function JobDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { lang?: string; interest?: string } }) {
  const locale = normalizeLocale(searchParams.lang || cookies().get('partime_public_lang')?.value);
  const job = await getPublicJobBySlugOrId(params.id);
  if (!job) notFound();
  const href = jobPublicHref(job);

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-4 py-5 md:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex items-center justify-between gap-4">
          <Link href={`/jobs?lang=${locale}`} className="text-sm font-semibold text-ink-700 hover:underline">Back to jobs</Link>
          <PublicLanguageSelector locale={locale} />
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <article className="rounded-xl border border-black/10 bg-white p-5 shadow-card md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a5b22]">{job.category || 'Part-time job'}</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-ink-950 md:text-5xl">{job.name}</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-ink-600">
              <span className="rounded-full bg-ink-100 px-3 py-1">{job.tenant.name}</span>
              <span className="rounded-full bg-ink-100 px-3 py-1">{job.location}</span>
              <span className="rounded-full bg-ink-100 px-3 py-1">{formatJobDate(job.workDate)}</span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Info label="Rate" value={formatJobRate(job)} />
              <Info label="Headcount" value={`${job.filledCount}/${job.headcount} filled`} />
              <Info label="Time" value={`${job.startTime || 'TBC'}${job.endTime ? ` - ${job.endTime}` : ''}`} />
            </div>
            <div className="mt-8 space-y-4 text-sm leading-7 text-ink-700">
              {job.summary && <p className="text-base font-medium text-ink-900">{job.summary}</p>}
              <p className="whitespace-pre-line">{job.description || job.notes || 'Job details will be updated by the employer.'}</p>
            </div>
            {job.skills.length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-semibold text-ink-950">Skills</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.skills.map(({ skill }) => <span key={skill.id} className="rounded-full bg-[#f2e1c5] px-3 py-1 text-sm text-[#6f4312]">{skill.nameEn}</span>)}
                </div>
              </div>
            )}
          </article>

          <aside className="rounded-xl border border-black/10 bg-[#1d2a24] p-5 text-white shadow-card lg:sticky lg:top-5 lg:self-start">
            <h2 className="text-xl font-semibold">Express interest</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">Use the WhatsApp number already registered in your Partime profile.</p>
            {searchParams.interest === 'registered' && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Interest recorded.</p>}
            {searchParams.interest === 'invalid-phone' && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Enter a valid Malaysia mobile number.</p>}
            <form action={registerJobInterest} className="mt-5 space-y-3">
              <input type="hidden" name="jobId" value={job.id} />
              <label className="block text-sm font-medium text-white/80">WhatsApp number</label>
              <input className="input border-white/10 bg-white text-ink-900" name="phone" placeholder="+60 12-345 6789" />
              <label className="block text-sm font-medium text-white/80">Note</label>
              <textarea className="input min-h-[96px] border-white/10 bg-white text-ink-900" name="note" placeholder="Availability or quick note" />
              <button className="btn-primary w-full bg-[#b46f22] hover:bg-[#945816]" type="submit">Send interest</button>
            </form>
            <Link href={`/register/part-timer?lang=${locale}&job=${job.id}`} className="mt-3 flex justify-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white">Create profile</Link>
            <Link href={`${href}?lang=${locale}`} className="mt-3 block text-center text-xs text-white/60">Job reference: {job.slug || job.id}</Link>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-ink-950">{value}</div>
    </div>
  );
}