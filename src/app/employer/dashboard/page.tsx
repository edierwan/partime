import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Badge } from '@/components/Badge';
import { employerStatusMeta, requireEmployerPortalContext } from '@/lib/employer-portal';
import { formatJobDate, JOB_STATUS_LABELS } from '@/lib/marketplace';
import { formatMYR } from '@/lib/money';
import { duplicateEmployerJob, setEmployerJobStatus } from '../jobs/actions';

export default async function EmployerDashboardPage(props: { searchParams: Promise<{ registered?: string }> }) {
  const searchParams = await props.searchParams;
  const context = await requireEmployerPortalContext();
  const statusMeta = employerStatusMeta(context.accountStatus);
  const tenantId = context.tenant.id;

  const [activeJobs, draftJobs, applicants, recentJobs] = await Promise.all([
    prisma.workEvent.count({ where: { tenantId, jobStatus: { in: ['OPEN', 'OFFERING', 'FULL'] } } }),
    prisma.workEvent.count({ where: { tenantId, jobStatus: 'DRAFT' } }),
    prisma.jobInterest.count({ where: { job: { tenantId } } }),
    prisma.workEvent.findMany({
      where: { tenantId },
      include: { _count: { select: { interests: true } } },
      orderBy: [{ createdAt: 'desc' }],
      take: 6,
    }),
  ]);

  const pendingReviewCount = context.accountStatus === 'PENDING_REVIEW' ? Math.max(1, draftJobs) : 0;
  const profileRows = [
    ['Company logo', context.tenant.logoUrl ? 'Added' : 'Missing'],
    ['Business registration no.', context.tenant.registrationNo || context.registration?.businessRegistrationNo || 'Missing'],
    ['Company address', context.tenant.addressLine1 || context.registration?.addressLine1 || 'Missing'],
    ['Contact person', context.registration?.contactPersonName || 'Missing'],
    ['Phone number', context.tenant.phoneE164 || context.registration?.contactPhoneE164 || 'Missing'],
    ['Email', context.tenant.email || context.registration?.contactEmail || 'Missing'],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_18px_40px_rgba(20,65,130,0.08)]">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#075bf2]">Majikan Dashboard</div>
          <h1 className="mt-2 text-3xl font-black text-[#092152]">Selamat datang, {context.tenant.name}</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-ink-600">Urus profil syarikat, post kerja, dan semak permohonan dari satu tempat.</p>
        </div>
        <Link href="/employer/jobs/new" className="rounded-2xl bg-[#075bf2] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#064bd0]">Post a Job</Link>
      </div>

      {searchParams.registered === '1' ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Pendaftaran majikan berjaya dihantar.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <section className="rounded-3xl border border-ink-200 bg-white p-5 shadow-[0_18px_40px_rgba(20,65,130,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-ink-500">Account status</div>
              <div className="mt-2 flex items-center gap-3">
                <Badge variant={statusMeta.tone === 'amber' ? 'amber' : statusMeta.tone === 'green' ? 'green' : statusMeta.tone === 'rose' ? 'red' : 'zinc'}>{statusMeta.label}</Badge>
                <span className="text-sm text-ink-500">{context.membership.role}</span>
              </div>
            </div>
            <Link href="/employer/profile" className="text-sm font-semibold text-brand-700 hover:underline">View company profile</Link>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink-600">{statusMeta.description}</p>
          {context.registration?.rejectionReason ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Sebab semakan: {context.registration.rejectionReason}</div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-blue-100 bg-[#eef5ff] p-5 shadow-[0_18px_40px_rgba(20,65,130,0.08)]">
          <div className="text-sm font-bold text-[#2c4b80]">Quick action</div>
          <h2 className="mt-2 text-2xl font-black text-[#092152]">Post a Job</h2>
          <p className="mt-3 text-sm leading-6 text-[#405b8d]">
            {context.canPublishJobs
              ? 'Akaun majikan anda telah diluluskan. Anda boleh create dan publish kerja terus dari portal ini.'
              : 'Akaun majikan anda sedang disemak. Anda boleh lengkapkan profil syarikat, tetapi kerja hanya boleh diterbitkan selepas diluluskan.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/employer/jobs/new" className="rounded-2xl bg-[#075bf2] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#064bd0]">Post a Job</Link>
            <Link href="/employer/jobs" className="rounded-2xl border border-blue-200 px-5 py-3 text-sm font-black text-[#075bf2]">My Jobs</Link>
          </div>
          {!context.canPublishJobs ? <div className="mt-4 text-xs font-semibold text-[#5372a8]">Job boleh disimpan sebagai draft. Publish hanya dibenarkan selepas akaun majikan diluluskan.</div> : null}
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Jobs" value={activeJobs} tone="blue" />
        <MetricCard label="Draft Jobs" value={draftJobs} tone="amber" />
        <MetricCard label="Applicants" value={applicants} tone="green" />
        <MetricCard label="Pending Review" value={pendingReviewCount} tone="violet" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-ink-200 bg-white p-5 shadow-[0_18px_40px_rgba(20,65,130,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-ink-500">Company profile completion</div>
              <div className="mt-2 text-3xl font-black text-[#092152]">{context.profileCompletionPercentage}%</div>
            </div>
            <Link href="/employer/profile" className="text-sm font-semibold text-brand-700 hover:underline">Update profile</Link>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-[#075bf2]" style={{ width: `${context.profileCompletionPercentage}%` }} />
          </div>
          <div className="mt-5 space-y-3">
            {profileRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 px-4 py-3 text-sm">
                <span className="font-semibold text-ink-700">{label}</span>
                <span className={`font-medium ${value === 'Missing' ? 'text-rose-600' : 'text-ink-900'}`}>{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-ink-200 bg-white p-5 shadow-[0_18px_40px_rgba(20,65,130,0.08)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-[#092152]">Recent jobs</h2>
              <p className="text-sm text-ink-500">Pantau kerja terbaru dan tindakan seterusnya.</p>
            </div>
            <Link href="/employer/jobs" className="text-sm font-semibold text-brand-700 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Job title</th><th>Location</th><th>Status</th><th>Applicants</th><th>Created date</th><th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-ink-500">Belum ada kerja dipost.</td></tr>
                ) : recentJobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <div className="font-medium text-ink-950">{job.name}</div>
                      <div className="text-xs text-ink-500">{formatMYR(job.defaultRateCents)}</div>
                    </td>
                    <td>{job.location}</td>
                    <td>{JOB_STATUS_LABELS[job.jobStatus] || job.jobStatus}</td>
                    <td>{job._count.interests}</td>
                    <td>{formatJobDate(job.createdAt)}</td>
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
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'amber' | 'green' | 'violet' }) {
  const accents = {
    blue: 'bg-[#eef5ff] text-[#075bf2]',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
  } as const;

  return (
    <div className="rounded-3xl border border-ink-200 bg-white p-5 shadow-[0_18px_40px_rgba(20,65,130,0.08)]">
      <div className={`inline-flex rounded-2xl px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${accents[tone]}`}>{label}</div>
      <div className="mt-4 text-4xl font-black text-[#092152]">{value}</div>
    </div>
  );
}