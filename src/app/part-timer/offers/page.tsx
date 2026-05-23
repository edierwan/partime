import { prisma } from '@/lib/db';
import { normalizeMalaysiaPhone } from '@/lib/staff';
import { PartTimerLookup } from '../PartTimerLookup';

export default async function PartTimerOffersPage({ searchParams }: { searchParams: { phone?: string } }) {
  const phone = normalizeMalaysiaPhone(searchParams.phone || '');
  const partTimer = phone ? await prisma.staff.findUnique({ where: { phoneE164: phone }, include: { offerRecipients: { include: { offer: { include: { job: true } } }, orderBy: { updatedAt: 'desc' } } } }) : null;
  return <PartTimerLookup phone={phone || searchParams.phone}>{!partTimer ? <div className="card card-pad text-sm text-ink-500">Enter your WhatsApp number to view offers.</div> : <div className="space-y-5"><div><h1 className="sectiontitle">Offers</h1><p className="subtitle">Reply 1 for interested or 2 for not interested in WhatsApp.</p></div><div className="grid gap-4 md:grid-cols-2">{partTimer.offerRecipients.length === 0 && <div className="card card-pad text-sm text-ink-500">No offers yet.</div>}{partTimer.offerRecipients.map((recipient) => <div key={recipient.id} className="card card-pad"><div className="font-semibold text-ink-950">{recipient.offer.job.name}</div><div className="text-sm text-ink-500">{recipient.offer.job.location}</div><div className="mt-3 text-sm font-semibold">{recipient.status}</div><div className="mt-1 text-xs text-ink-500">Last reply: {recipient.replyText || '-'}</div></div>)}</div></div>}</PartTimerLookup>;
}