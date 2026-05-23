import { prisma } from '@/lib/db';
import { normalizeMalaysiaPhone, formatMalaysiaPhoneDisplay } from '@/lib/staff';
import { PartTimerLookup } from '../PartTimerLookup';

export default async function PartTimerProfilePage({ searchParams }: { searchParams: { phone?: string } }) {
  const phone = normalizeMalaysiaPhone(searchParams.phone || '');
  const partTimer = phone ? await prisma.staff.findUnique({ where: { phoneE164: phone }, include: { skills: { include: { skill: true } } } }) : null;
  return <PartTimerLookup phone={phone || searchParams.phone}>{!partTimer ? <div className="card card-pad text-sm text-ink-500">Enter your WhatsApp number to view profile.</div> : <div className="card card-pad space-y-4"><div><h1 className="sectiontitle">Profile</h1><p className="subtitle">{partTimer.status} - {partTimer.approvalStatus}</p></div><div className="grid gap-3 md:grid-cols-2"><Row label="Full name" value={partTimer.fullName} /><Row label="Phone" value={formatMalaysiaPhoneDisplay(partTimer.phoneE164)} /><Row label="Email" value={partTimer.email || '-'} /><Row label="Location" value={partTimer.preferredLocation || partTimer.city || '-'} /><Row label="Nationality" value={partTimer.nationality} /><Row label="Availability" value={partTimer.availability ? JSON.stringify(partTimer.availability) : '-'} /></div><div><h2 className="text-sm font-semibold text-ink-950">Skills</h2><div className="mt-2 flex flex-wrap gap-2">{partTimer.skills.map(({ skill }) => <span key={skill.id} className="rounded-md bg-brand-50 px-2 py-1 text-xs text-brand-700">{skill.nameEn}</span>)}</div></div></div>}</PartTimerLookup>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-ink-50 p-3"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</div><div className="mt-1 text-sm font-medium text-ink-950">{value}</div></div>;
}