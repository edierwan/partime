import Link from 'next/link';
import { prisma } from '@/lib/db';
import { currentAdminTenantId } from '@/lib/tenant';
import { formatJobDate, formatJobRate } from '@/lib/marketplace';

export default async function EmployerJobsPage({ searchParams }: { searchParams: { error?: string } }) {
  const tenantId = await currentAdminTenantId();
  const jobs = await prisma.workEvent.findMany({
    where: tenantId ? { tenantId } : {},
    include: { _count: { select: { interests: true, offers: true, sessions: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="sectiontitle">Jobs</h1><p className="subtitle">Post marketplace jobs and keep QR attendance linked.</p></div>
        <Link href="/employer/jobs/new" className="btn-primary">Post job</Link>
      </div>
      {searchParams.error === 'no-tenant' && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">No tenant context is available.</div>}
      <div className="card overflow-hidden">
        <table className="table-base">
          <thead><tr><th>Job</th><th>Date</th><th>Rate</th><th>Status</th><th>Interest</th><th>Offers</th><th></th></tr></thead>
          <tbody>
            {jobs.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-ink-500">No jobs yet.</td></tr>}
            {jobs.map((job) => (
              <tr key={job.id}>
                <td><div className="font-medium text-ink-950">{job.name}</div><div className="text-xs text-ink-500">{job.location}</div></td>
                <td>{formatJobDate(job.workDate)}</td>
                <td>{formatJobRate(job)}</td>
                <td>{job.jobStatus}</td>
                <td>{job._count.interests}</td>
                <td>{job._count.offers}</td>
                <td className="text-right"><Link href={`/employer/jobs/${job.id}`} className="text-brand-700 hover:underline">Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}