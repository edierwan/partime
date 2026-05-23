import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { formatJobDate, formatJobRate, jobPublicHref } from '@/lib/marketplace';
import { setEmployerJobStatus } from '../actions';

export default async function EmployerJobDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [job, partTimers] = await Promise.all([
    prisma.workEvent.findUnique({
      where: { id: params.id },
      include: { tenant: true, skills: { include: { skill: true } }, interests: { include: { partTimer: true }, orderBy: { createdAt: 'desc' } }, offers: { include: { recipients: { include: { partTimer: true } } }, orderBy: { createdAt: 'desc' } } },
    }),
    prisma.staff.findMany({ where: { active: true, status: 'ACTIVE' }, orderBy: { fullName: 'asc' }, take: 100 }),
  ]);
  if (!job) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Link href="/employer/jobs" className="text-sm text-brand-700 hover:underline">Back to jobs</Link><h1 className="sectiontitle mt-2">{job.name}</h1><p className="subtitle">{job.tenant.name} - {job.location}</p></div>
        <Link href={jobPublicHref(job)} className="btn-ghost">Public page</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Tile label="Date" value={formatJobDate(job.workDate)} />
        <Tile label="Rate" value={formatJobRate(job)} />
        <Tile label="Headcount" value={`${job.filledCount}/${job.headcount}`} />
        <Tile label="Status" value={job.jobStatus} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="card card-pad space-y-5">
          <div><h2 className="font-semibold text-ink-950">Job details</h2><p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink-700">{job.description || job.summary || job.notes || 'No description added.'}</p></div>
          <form action={setEmployerJobStatus} className="flex flex-wrap items-end gap-3 border-t border-ink-200 pt-4">
            <input type="hidden" name="jobId" value={job.id} />
            <div><label className="label">Status</label><select className="input" name="status" defaultValue={job.jobStatus}><option value="DRAFT">Draft</option><option value="OPEN">Open</option><option value="OFFERING">Offering</option><option value="FULL">Full</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option><option value="CLOSED">Closed</option></select></div>
            <button className="btn-primary" type="submit">Update</button>
          </form>
          <div className="border-t border-ink-200 pt-4"><h2 className="font-semibold text-ink-950">Interested part-timers</h2><div className="mt-3 divide-y divide-ink-100">{job.interests.length === 0 && <div className="py-4 text-sm text-ink-500">No interest yet.</div>}{job.interests.map((interest) => <div key={interest.id} className="py-3 text-sm"><div className="font-medium text-ink-950">{interest.partTimer.fullName}</div><div className="text-ink-500">{interest.partTimer.phoneDisplay || interest.partTimer.phoneE164} - {interest.status}</div></div>)}</div></div>
        </section>
        <aside className="card card-pad space-y-4">
          <div><h2 className="font-semibold text-ink-950">Send WhatsApp offer</h2><p className="mt-1 text-sm text-ink-500">Select part-timers and send the reply 1/2 offer flow.</p></div>
          <form action="/employer/offers" method="get" className="space-y-3">
            <input type="hidden" name="jobId" value={job.id} />
            <label className="label">Part-timers</label>
            <div className="max-h-72 space-y-2 overflow-auto rounded-lg border border-ink-200 p-3">
              {partTimers.map((partTimer) => <label key={partTimer.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="partTimerId" value={partTimer.id} />{partTimer.fullName}</label>)}
            </div>
            <button className="btn-primary w-full" type="submit">Prepare offer</button>
          </form>
          <div className="border-t border-ink-200 pt-4"><h3 className="text-sm font-semibold">Recent offer batches</h3><div className="mt-2 space-y-2 text-sm text-ink-600">{job.offers.length === 0 && <div>No offers sent.</div>}{job.offers.map((offer) => <Link href="/employer/offers" key={offer.id} className="block rounded-lg bg-ink-50 p-3 hover:bg-ink-100">{offer.title} - {offer.recipients.length} recipients</Link>)}</div></div>
        </aside>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return <div className="card card-pad"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">{label}</div><div className="mt-2 text-lg font-semibold text-ink-950">{value}</div></div>;
}