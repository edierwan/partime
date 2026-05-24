import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireEmployerPortalContext } from '@/lib/employer-portal';

export default async function EmployerMessagesPage() {
  const context = await requireEmployerPortalContext();
  const [outbound, leads] = await Promise.all([
    prisma.whatsAppOutboundMessage.findMany({
      where: { tenantId: context.tenant.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.jobOfferRecipient.findMany({
      where: { offer: { tenantId: context.tenant.id }, status: { in: ['INTERESTED', 'NOT_INTERESTED', 'NO_RESPONSE'] } },
      include: { partTimer: true, offer: { include: { job: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="sectiontitle">Messages / WhatsApp Leads</h1>
          <p className="subtitle">Track outbound WhatsApp activity and recent lead replies.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/employer/offers" className="font-semibold text-brand-700 hover:underline">Offers</Link>
          <Link href="/employer/responses" className="font-semibold text-brand-700 hover:underline">Responses</Link>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-ink-200 p-4 font-semibold">Recent outbound messages</div>
          <table className="table-base">
            <thead><tr><th>Phone</th><th>Status</th><th>Message</th></tr></thead>
            <tbody>
              {outbound.length === 0 ? <tr><td colSpan={3} className="py-10 text-center text-ink-500">No outbound messages yet.</td></tr> : outbound.map((item) => (
                <tr key={item.id}><td>{item.toPhone}</td><td>{item.status}</td><td className="max-w-sm truncate">{item.body}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card overflow-hidden">
          <div className="border-b border-ink-200 p-4 font-semibold">Recent leads</div>
          <table className="table-base">
            <thead><tr><th>Part-timer</th><th>Job</th><th>Reply</th></tr></thead>
            <tbody>
              {leads.length === 0 ? <tr><td colSpan={3} className="py-10 text-center text-ink-500">No replies yet.</td></tr> : leads.map((item) => (
                <tr key={item.id}><td>{item.partTimer.fullName}</td><td>{item.offer.job.name}</td><td>{item.replyText || item.status}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}