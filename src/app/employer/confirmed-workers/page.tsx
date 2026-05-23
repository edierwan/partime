import { prisma } from '@/lib/db';
import { currentAdminTenantId } from '@/lib/tenant';

export default async function EmployerConfirmedWorkersPage() {
  const tenantId = await currentAdminTenantId();
  const confirmed = await prisma.jobOfferRecipient.findMany({ where: { offer: tenantId ? { tenantId } : {}, status: 'CONFIRMED' }, include: { partTimer: true, offer: { include: { job: true } } }, orderBy: { confirmedAt: 'desc' }, take: 100 });
  return <div className="space-y-5"><div><h1 className="sectiontitle">Confirmed workers</h1><p className="subtitle">Part-timers confirmed for attendance and payroll.</p></div><div className="grid gap-4 md:grid-cols-2">{confirmed.length === 0 && <div className="card card-pad text-sm text-ink-500">No confirmed part-timers yet.</div>}{confirmed.map((row) => <div key={row.id} className="card card-pad"><div className="font-semibold text-ink-950">{row.partTimer.fullName}</div><div className="text-sm text-ink-500">{row.offer.job.name}</div><div className="mt-2 text-sm">{row.partTimer.phoneDisplay || row.partTimer.phoneE164}</div></div>)}</div></div>;
}