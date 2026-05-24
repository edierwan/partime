import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireEmployerPortalContext } from '@/lib/employer-portal';
import { formatMalaysiaPhoneDisplay } from '@/lib/staff';

export default async function EmployerApplicantsPage() {
  const context = await requireEmployerPortalContext();
  const applicants = await prisma.jobInterest.findMany({
    where: { job: { tenantId: context.tenant.id } },
    include: { job: true, partTimer: true },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="sectiontitle">Applicants</h1>
          <p className="subtitle">Part-timers who have shown interest in your jobs.</p>
        </div>
        <Link href="/employer/jobs" className="text-sm font-semibold text-brand-700 hover:underline">View jobs</Link>
      </div>
      <div className="card overflow-hidden">
        <table className="table-base">
          <thead><tr><th>Applicant</th><th>Phone</th><th>Job</th><th>Status</th><th>Updated</th><th></th></tr></thead>
          <tbody>
            {applicants.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-ink-500">No applicants yet.</td></tr> : applicants.map((row) => (
              <tr key={row.id}>
                <td>{row.partTimer.fullName}</td>
                <td>{formatMalaysiaPhoneDisplay(row.partTimer.phoneE164)}</td>
                <td>{row.job.name}</td>
                <td>{row.status}</td>
                <td>{row.updatedAt.toLocaleDateString('en-MY')}</td>
                <td className="text-right"><Link href={`/employer/jobs/${row.jobId}`} className="text-brand-700 hover:underline">View job</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}