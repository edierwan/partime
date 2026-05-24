import { type JobStatus, type Prisma } from '@prisma/client';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireEmployerPortalContext } from '@/lib/employer-portal';
import { formatJobDate, formatJobRate, JOB_STATUS_LABELS } from '@/lib/marketplace';
import { duplicateEmployerJob, setEmployerJobStatus } from './actions';

const PUBLISHED_JOB_STATUSES: JobStatus[] = ['OPEN', 'OFFERING', 'FULL'];
const CLOSED_JOB_STATUSES: JobStatus[] = ['CLOSED', 'COMPLETED', 'CANCELLED'];

export default async function EmployerJobsPage(props: { searchParams: Promise<{ error?: string; tab?: string }> }) {
  const searchParams = await props.searchParams;
  const context = await requireEmployerPortalContext();
  const currentTab = searchParams.tab || 'all';
  const tenantId = context.tenant.id;
  const where = employerJobsWhere(currentTab, tenantId, context.accountStatus === 'PENDING_REVIEW');

  const [jobs, counts] = await Promise.all([
    prisma.workEvent.findMany({
      where,
      include: { _count: { select: { interests: true, offers: true, sessions: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    Promise.all([
      prisma.workEvent.count({ where: { tenantId } }),
      prisma.workEvent.count({ where: { tenantId, jobStatus: 'DRAFT' } }),
      prisma.workEvent.count({ where: { tenantId, jobStatus: { in: PUBLISHED_JOB_STATUSES } } }),
      prisma.workEvent.count({ where: { tenantId, jobStatus: { in: CLOSED_JOB_STATUSES } } }),
    ]),
  ]);

  const tabs = [
    ['all', 'All', counts[0]],
    ['draft', 'Draft', counts[1]],
    ['pending-review', 'Pending Review', context.accountStatus === 'PENDING_REVIEW' ? counts[1] : 0],
    ['published', 'Published', counts[2]],
    ['closed', 'Closed', counts[3]],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="sectiontitle">My Jobs</h1>
          <p className="subtitle">Pantau semua kerja, draft, dan status publish untuk syarikat anda.</p>
        </div>
        <Link href="/employer/jobs/new" className="btn-primary">Post a Job</Link>
      </div>
      {!context.canPublishJobs ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Job boleh disimpan sebagai draft. Publish hanya dibenarkan selepas akaun majikan diluluskan.</div> : null}
      {searchParams.error === 'no-tenant' && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">No tenant context is available.</div>}
      <div className="flex flex-wrap gap-2">
        {tabs.map(([tab, label, count]) => (
          <Link key={tab} href={`/employer/jobs?tab=${tab}`} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${currentTab === tab ? 'bg-brand-600 text-white' : 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50'}`}>
            {label} ({count})
          </Link>
        ))}
      </div>
      <div className="card overflow-hidden">
        <table className="table-base">
          <thead><tr><th>Job</th><th>Date</th><th>Rate</th><th>Status</th><th>Interest</th><th>Offers</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="text-base font-semibold text-ink-900">Belum ada kerja dipost.</div>
                  <Link href="/employer/jobs/new" className="mt-3 inline-flex rounded-xl bg-[#075bf2] px-4 py-2 text-sm font-black text-white">Post a Job</Link>
                </td>
              </tr>
            )}
            {jobs.map((job) => (
              <tr key={job.id}>
                <td><div className="font-medium text-ink-950">{job.name}</div><div className="text-xs text-ink-500">{job.location}</div></td>
                <td>{formatJobDate(job.workDate)}</td>
                <td>{formatJobRate(job)}</td>
                <td>{JOB_STATUS_LABELS[job.jobStatus] || job.jobStatus}</td>
                <td>{job._count.interests}</td>
                <td>{job._count.offers}</td>
                <td className="text-right">
                  <div className="flex justify-end gap-2 text-sm">
                    <Link href={`/employer/jobs/${job.id}`} className="font-semibold text-brand-700 hover:underline">View</Link>
                    <Link href={`/employer/jobs/${job.id}`} className="font-semibold text-brand-700 hover:underline">Edit</Link>
                    <form action={duplicateEmployerJob}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <button type="submit" className="font-semibold text-brand-700 hover:underline">Duplicate</button>
                    </form>
                    <form action={setEmployerJobStatus}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="status" value="CLOSED" />
                      <button type="submit" className="font-semibold text-rose-600 hover:underline">Close</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function employerJobsWhere(tab: string, tenantId: string, pendingAccount: boolean): Prisma.WorkEventWhereInput {
  if (tab === 'draft') return { tenantId, jobStatus: 'DRAFT' as const };
  if (tab === 'pending-review') return pendingAccount ? { tenantId, jobStatus: 'DRAFT' as const } : { tenantId, id: '__never__' };
  if (tab === 'published') return { tenantId, jobStatus: { in: PUBLISHED_JOB_STATUSES } };
  if (tab === 'closed') return { tenantId, jobStatus: { in: CLOSED_JOB_STATUSES } };
  return { tenantId };
}