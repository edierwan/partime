import Link from 'next/link';
import { listPublicJobs, formatJobDate, formatJobRate, jobPublicHref } from '@/lib/marketplace';
import { normalizeMalaysiaPhone } from '@/lib/staff';
import { PartTimerLookup } from '../PartTimerLookup';

export default async function PartTimerJobsPage({ searchParams }: { searchParams: { phone?: string; q?: string } }) {
  const phone = normalizeMalaysiaPhone(searchParams.phone || '');
  const jobs = await listPublicJobs({ q: searchParams.q }, 30);
  return <PartTimerLookup phone={phone || searchParams.phone}><div className="space-y-5"><form className="card card-pad flex gap-2" action="/part-timer/jobs" method="get"><input type="hidden" name="phone" value={phone} /><input className="input" name="q" defaultValue={searchParams.q || ''} placeholder="Search open jobs" /><button className="btn-primary bg-ink-900 hover:bg-ink-700" type="submit">Search</button></form><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{jobs.map((job) => <Link href={`${jobPublicHref(job)}?phone=${encodeURIComponent(phone)}`} key={job.id} className="card card-pad hover:bg-ink-50"><div className="text-xs font-semibold text-[#8a5b22]">{job.category || 'Part-time'}</div><div className="mt-2 font-semibold text-ink-950">{job.name}</div><div className="mt-1 text-sm text-ink-500">{job.location} - {formatJobDate(job.workDate)}</div><div className="mt-4 font-semibold">{formatJobRate(job)}</div></Link>)}</div></div></PartTimerLookup>;
}