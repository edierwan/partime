import { prisma } from '@/lib/db';
import { currentAdminTenantId } from '@/lib/tenant';

export default async function EmployerResponsesPage() {
  const tenantId = await currentAdminTenantId();
  const responses = await prisma.jobOfferRecipient.findMany({ where: { offer: tenantId ? { tenantId } : {}, status: { in: ['INTERESTED', 'NOT_INTERESTED', 'NO_RESPONSE'] } }, include: { partTimer: true, offer: { include: { job: true } } }, orderBy: { updatedAt: 'desc' }, take: 100 });
  return <div className="space-y-5"><div><h1 className="sectiontitle">Responses</h1><p className="subtitle">Replies from WhatsApp offers.</p></div><div className="card overflow-hidden"><table className="table-base"><thead><tr><th>Part-timer</th><th>Job</th><th>Reply</th><th>Status</th></tr></thead><tbody>{responses.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-ink-500">No responses yet.</td></tr>}{responses.map((response) => <tr key={response.id}><td>{response.partTimer.fullName}</td><td>{response.offer.job.name}</td><td>{response.replyText || '-'}</td><td>{response.status}</td></tr>)}</tbody></table></div></div>;
}