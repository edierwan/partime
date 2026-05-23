import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { PublicLanguageSelector } from '@/components/PublicLanguageSelector';
import { normalizeLocale } from '@/lib/public-i18n';
import { formatJobDate, formatJobRate, getPublicJobBySlugOrId, jobPublicHref, listPublicJobs } from '@/lib/marketplace';
import { registerJobInterest } from '../actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const fallbackImage = 'https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?auto=format&fit=crop&w=1200&q=80';

export default async function JobDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { lang?: string; interest?: string } }) {
  const locale = normalizeLocale(searchParams.lang || cookies().get('partime_public_lang')?.value);
  const job = await getPublicJobBySlugOrId(params.id);
  if (!job) notFound();
  const href = jobPublicHref(job);
  const related = (await listPublicJobs({ category: job.category || undefined }, 5)).filter((item) => item.id !== job.id).slice(0, 3);
  const mediaImages = job.media.filter((media) => media.mediaType === 'IMAGE').map((media) => media.url);
  const heroImage = job.coverImageUrl || mediaImages[0] || fallbackImage;
  const gallery = Array.from(new Set([heroImage, ...mediaImages])).slice(0, 4);

  return (
    <main className="min-h-screen bg-[#f4f8ff] px-4 py-5 text-[#081638] md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex items-center justify-between gap-4">
          <Link href={`/jobs?lang=${locale}`} className="text-sm font-black text-[#075bf2] hover:underline">Back to jobs</Link>
          <PublicLanguageSelector locale={locale} />
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <article className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
            <div className="relative aspect-[16/9] bg-blue-100 md:aspect-[21/9]">
              <img src={heroImage} alt={job.name} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-5 text-white">
                <p className="text-xs font-black">{job.category || 'Part-time job'}</p>
                <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight md:text-5xl">{job.name}</h1>
              </div>
            </div>
            {gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-2 p-3">
                {gallery.map((image) => <img key={image} src={image} alt={job.name} className="aspect-[4/3] rounded-xl object-cover" />)}
              </div>
            )}
            <div className="p-5 md:p-8">
              <div className="flex flex-wrap gap-2 text-sm font-semibold text-[#405b8d]">
                <span className="rounded-full bg-[#eef5ff] px-3 py-1">{job.tenant.name}</span>
                <span className="rounded-full bg-[#eef5ff] px-3 py-1">{job.location}</span>
                <span className="rounded-full bg-[#eef5ff] px-3 py-1">{formatJobDate(job.workDate)}</span>
                <span className="rounded-full bg-[#eef5ff] px-3 py-1">{job.payType}</span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Rate" value={formatJobRate(job)} />
                <Info label="Workers needed" value={`${Math.max(job.headcount - job.filledCount, 0)} of ${job.headcount}`} />
                <Info label="Time" value={`${job.startTime || 'TBC'}${job.endTime ? ` - ${job.endTime}` : ''}`} />
                <Info label="Status" value={job.jobStatus} />
              </div>
              <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_280px]">
                <div className="space-y-4 text-sm font-semibold leading-7 text-[#405b8d]">
                  {job.summary && <p className="text-base font-black text-[#092152]">{job.summary}</p>}
                  <p className="whitespace-pre-line">{job.description || job.notes || 'Job details will be updated by the employer.'}</p>
                </div>
                <div className="space-y-3">
                  <DetailBlock label="Dress code" value={job.dressCode || 'To be confirmed by employer'} />
                  <DetailBlock label="Tools needed" value={job.toolsNeeded || 'Bring yourself and your registered WhatsApp phone unless employer states otherwise'} />
                  <DetailBlock label="Address" value={job.address || job.location} />
                </div>
              </div>
              {job.skills.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-sm font-black text-[#092152]">Required skills</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {job.skills.map(({ skill }) => <span key={skill.id} className="rounded-full bg-[#eef5ff] px-3 py-1 text-sm font-bold text-[#075bf2]">{skill.nameEn}</span>)}
                  </div>
                </div>
              )}
            </div>
          </article>

          <aside className="rounded-2xl border border-blue-100 bg-[#061b49] p-5 text-white shadow-sm lg:sticky lg:top-5 lg:self-start">
            <h2 className="text-xl font-black">Express interest</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/70">Use the WhatsApp number already registered in your Partime profile. New part-timers can create a profile first.</p>
            {searchParams.interest === 'registered' && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">Interest recorded.</p>}
            {searchParams.interest === 'invalid-phone' && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Enter a valid Malaysia mobile number.</p>}
            <form action={registerJobInterest} className="mt-5 space-y-3">
              <input type="hidden" name="jobId" value={job.id} />
              <label className="block text-sm font-bold text-white/80">WhatsApp number</label>
              <input className="input border-white/10 bg-white text-ink-900" name="phone" placeholder="+60 12-345 6789" />
              <label className="block text-sm font-bold text-white/80">Note</label>
              <textarea className="input min-h-[96px] border-white/10 bg-white text-ink-900" name="note" placeholder="Availability or quick note" />
              <button className="w-full rounded-xl bg-[#075bf2] px-4 py-3 text-sm font-black text-white hover:bg-[#064bd0]" type="submit">Send interest</button>
            </form>
            <Link href={`/register/part-timer?lang=${locale}&job=${job.id}`} className="mt-3 flex justify-center rounded-xl border border-white/15 px-4 py-3 text-sm font-black text-white">Create profile</Link>
            <Link href={`${href}?lang=${locale}`} className="mt-4 block text-center text-xs text-white/55">Job reference: {job.slug || job.id}</Link>
          </aside>
        </section>

        {related.length > 0 && (
          <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-[#092152]">Related jobs</h2>
              <Link href={`/jobs?category=${encodeURIComponent(job.category || '')}&lang=${locale}`} className="text-sm font-black text-[#075bf2]">View more -&gt;</Link>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {related.map((item) => (
                <Link key={item.id} href={`${jobPublicHref(item)}?lang=${locale}`} className="rounded-xl border border-blue-100 p-4 transition hover:bg-[#f8fbff]">
                  <div className="text-sm font-black text-[#092152]">{item.name}</div>
                  <div className="mt-2 text-xs font-semibold text-[#60749b]">{item.location} - {formatJobDate(item.workDate)}</div>
                  <div className="mt-3 text-sm font-black text-[#075bf2]">{formatJobRate(item)}</div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f8fbff] p-4 ring-1 ring-blue-100">
      <div className="text-xs font-bold text-[#60749b]">{label}</div>
      <div className="mt-2 text-sm font-black text-[#092152]">{value}</div>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-[#f8fbff] p-4">
      <div className="text-xs font-black text-[#075bf2]">{label}</div>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#405b8d]">{value}</p>
    </div>
  );
}
