import Link from 'next/link';
import { prisma } from '@/lib/db';
import { currentAdminTenantId } from '@/lib/tenant';
import { formatMYR } from '@/lib/money';

export default async function EmployerDashboardPage() {
  const tenantId = await currentAdminTenantId();
  const where = tenantId ? { tenantId } : {};
  const [jobs, offers, interested, confirmed, latestJobs] = await Promise.all([
    prisma.workEvent.count({ where }),
    prisma.jobOfferRecipient.count({ where: { offer: where } }),
    prisma.jobOfferRecipient.count({ where: { offer: where, status: 'INTERESTED' } }),
    prisma.jobOfferRecipient.count({ where: { offer: where, status: 'CONFIRMED' } }),
    prisma.workEvent.findMany({ where, include: { tenant: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="sectiontitle">Employer dashboard</h1>
          <p className="subtitle">Jobs, offers and confirmed part-timers for your tenant.</p>
        </div>
        <Link href="/employer/jobs/new" className="btn-primary">Post job</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Jobs" value={jobs} />
        <Metric label="Offer recipients" value={offers} />
        <Metric label="Interested" value={interested} />
        <Metric label="Confirmed" value={confirmed} />
      </div>
      <div className="card">
        <div className="border-b border-ink-200 p-4 font-semibold">Latest jobs</div>
        <div className="divide-y divide-ink-100">
          {latestJobs.length === 0 && <div className="p-5 text-sm text-ink-500">No jobs yet.</div>}
          {latestJobs.map((job) => (
            <Link href={`/employer/jobs/${job.id}`} key={job.id} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-ink-50">
              <div>
                <div className="font-medium text-ink-950">{job.name}</div>
                <div className="text-sm text-ink-500">{job.location}</div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold">{formatMYR(job.defaultRateCents)}</div>
                <div className="text-ink-500">{job.jobStatus}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="card card-pad"><div className="text-sm text-ink-500">{label}</div><div className="mt-2 text-3xl font-semibold text-ink-950">{value}</div></div>;
}