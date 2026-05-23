import { prisma } from '@/lib/db';
import { normalizeMalaysiaPhone } from '@/lib/staff';
import { formatDate } from '@/lib/time';
import { formatMYR } from '@/lib/money';
import { PartTimerLookup } from '../PartTimerLookup';

export default async function PartTimerHistoryPage(props: { searchParams: Promise<{ phone?: string }> }) {
  const searchParams = await props.searchParams;
  const phone = normalizeMalaysiaPhone(searchParams.phone || '');
  const partTimer = phone ? await prisma.staff.findUnique({ where: { phoneE164: phone }, include: { sessions: { include: { event: true }, orderBy: { workDate: 'desc' }, take: 100 } } }) : null;
  return <PartTimerLookup phone={phone || searchParams.phone}>{!partTimer ? <div className="card card-pad text-sm text-ink-500">Enter your WhatsApp number to view attendance history.</div> : <div className="space-y-5"><div><h1 className="sectiontitle">History</h1><p className="subtitle">Attendance and payout-ready records.</p></div><div className="card overflow-hidden"><table className="table-base"><thead><tr><th>Job</th><th>Date</th><th>Status</th><th>Pay</th></tr></thead><tbody>{partTimer.sessions.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-ink-500">No attendance history yet.</td></tr>}{partTimer.sessions.map((session) => <tr key={session.id}><td>{session.event.name}</td><td>{formatDate(session.workDate)}</td><td>{session.status}</td><td>{formatMYR(session.totalPayCents)}</td></tr>)}</tbody></table></div></div>}</PartTimerLookup>;
}