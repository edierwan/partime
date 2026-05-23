import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StatCard } from '@/components/StatCard';
import { Badge, StatusBadge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { StaffClient } from './StaffClient';
import { displayGender, formatMalaysiaPhoneDisplay, maskBankAccountNumber, resolveBankName } from '@/lib/staff';
import { listSkillCatalog } from '@/lib/skills';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StaffPage(
  props: { searchParams: Promise<{ q?: string; filter?: string; skillId?: string; nationality?: string }> }
) {
  const searchParams = await props.searchParams;
  const q = (searchParams.q || '').trim();
  const filter = searchParams.filter || 'all';
  const skillId = searchParams.skillId || 'all';
  const nationality = searchParams.nationality || 'all';

  const where: any = {};
  if (q) {
    where.OR = [
      { payName: { contains: q, mode: 'insensitive' } },
      { aliasPanggilan: { contains: q, mode: 'insensitive' } },
      { fullName: { contains: q, mode: 'insensitive' } },
      { phoneE164: { contains: q.replace(/\s+/g, '') } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (filter === 'active') where.status = 'ACTIVE';
  if (filter === 'inactive') where.status = 'INACTIVE';
  if (filter === 'pending-review') where.status = 'PENDING_REVIEW';
  if (filter === 'rejected') where.status = 'REJECTED';
  if (skillId !== 'all') where.skills = { some: { skillId } };
  if (nationality !== 'all') where.nationality = nationality;
  if (filter === 'missing-bank') {
    where.AND = [{
      OR: [
        { bankCode: null },
        { bankCode: '' },
        { bankAccountNumber: null },
        { bankAccountNumber: '' },
      ],
    }];
  }

  const [staff, total, active, pendingReview, missingBank, skillCatalog, nationalities] = await Promise.all([
    prisma.staff.findMany({
      where,
      include: { skills: { include: { skill: true }, take: 6 } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.staff.count(),
    prisma.staff.count({ where: { status: 'ACTIVE' } }),
    prisma.staff.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.staff.count({ where: { OR: [{ bankCode: null }, { bankCode: '' }, { bankAccountNumber: null }, { bankAccountNumber: '' }] } }),
    listSkillCatalog(),
    prisma.staff.findMany({ distinct: ['nationality'], select: { nationality: true }, orderBy: { nationality: 'asc' } }),
  ]);

  const filterChip = (key: string, label: string, count?: number) => {
    const active = filter === key || (key === 'all' && !searchParams.filter);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (skillId !== 'all') params.set('skillId', skillId);
    if (nationality !== 'all') params.set('nationality', nationality);
    if (key !== 'all') params.set('filter', key);
    return (
      <Link
        href={`/admin/part-timers${params.toString() ? `?${params.toString()}` : ''}`}
        className={`px-3 py-1.5 rounded-md text-xs font-medium border ${active ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-white border-ink-200 text-ink-700 hover:bg-ink-50'}`}
      >
        {label} {count != null && <span className="ml-1 text-ink-500">{count}</span>}
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="sectiontitle">Part-timer Management</h1>
          <p className="subtitle">Manage part-timer profiles, skills, approval status, and payment details.</p>
        </div>
        <StaffClient mode="addButton" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Part-timers"  value={total}                                  icon="👥" accent="blue" />
        <StatCard label="Active Part-timers" value={active}                                 icon="✓"  accent="green" />
        <StatCard label="Pending Review"     value={pendingReview}                          icon="🕒" accent="amber" hint={pendingReview ? 'Needs approval' : '—'} />
        <StatCard label="Missing Bank Info"  value={missingBank}                            icon="⚠️" accent="amber" hint={missingBank ? 'Needs attention' : '—'} />
      </div>

      <div className="card">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-ink-200">
          <form className="flex-1 min-w-[220px] grid grid-cols-1 md:grid-cols-3 gap-3" action="/admin/part-timers" method="get">
            {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
            <input className="input" name="q" defaultValue={q} placeholder="Search by name, alias, phone, or email…" />
            <select className="input" name="skillId" defaultValue={skillId}>
              <option value="all">All skills</option>
              {skillCatalog.flatMap((category) => category.skills).map((skill) => (
                <option key={skill.id} value={skill.id}>{skill.nameEn}</option>
              ))}
            </select>
            <select className="input" name="nationality" defaultValue={nationality}>
              <option value="all">All nationalities</option>
              {nationalities.map((item) => <option key={item.nationality} value={item.nationality}>{item.nationality}</option>)}
            </select>
          </form>
          <div className="flex flex-wrap gap-2">
            {filterChip('all', 'All', total)}
            {filterChip('active', 'Active', active)}
            {filterChip('inactive', 'Inactive', total - active)}
            {filterChip('pending-review', 'Pending Review', pendingReview)}
            {filterChip('rejected', 'Rejected')}
            {filterChip('missing-bank', 'Missing Bank Info', missingBank)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Part-timer</th><th>Alias / Panggilan</th><th>Phone</th><th>Email</th>
                <th>Jantina</th><th>Warganegara</th><th>Skills</th><th>Bank</th>
                <th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 && (
                <tr><td colSpan={10} className="text-center py-10 text-ink-500">No part-timers found.</td></tr>
              )}
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={s.fullName} src={s.profileImageUrl} className="h-9 w-9 text-[11px]" />
                      <div>
                        <div className="font-medium">{s.fullName}</div>
                        <div className="text-xs text-ink-500">{s.payName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-ink-600 uppercase text-xs tracking-wide">{s.aliasPanggilan}</td>
                  <td className="text-ink-600">{s.phoneDisplay || formatMalaysiaPhoneDisplay(s.phoneE164)}</td>
                  <td className="text-ink-600">{s.email || '—'}</td>
                  <td className="text-ink-600">{displayGender(s.gender)}</td>
                  <td className="text-ink-600">{s.nationality}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {s.skills.length === 0 ? '—' : s.skills.map((item) => <Badge key={item.skillId} variant="blue">{item.skill.nameEn}</Badge>)}
                    </div>
                  </td>
                  <td>
                    <div className="space-y-1">
                      <div>{resolveBankName(s.bankCode, s.bankName, s.customBankName) || '—'}</div>
                      <div className="text-xs text-ink-500">{maskBankAccountNumber(s.bankAccountNumber)}</div>
                      {(!s.bankCode || !s.bankAccountNumber) && <Badge variant="amber">Missing Bank Info</Badge>}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={s.status} />
                      {s.approvalStatus === 'PENDING_REVIEW' && <Badge variant="amber">Pending Review</Badge>}
                    </div>
                  </td>
                  <td className="text-right">
                    <StaffClient mode="row" staff={{
                      id: s.id,
                      payName: s.payName,
                      aliasPanggilan: s.aliasPanggilan,
                      fullName: s.fullName,
                      icNumberDisplay: s.icNumberDisplay,
                      gender: s.gender,
                      nationality: s.nationality,
                      otherNationality: s.otherNationality,
                      passportNumber: s.passportNumber,
                      phoneDisplay: s.phoneDisplay || s.phoneE164,
                      email: s.email,
                      bankCode: s.bankCode,
                      bankName: s.bankName,
                      customBankName: s.customBankName,
                      bankAccountNumber: s.bankAccountNumber,
                      profileImageUrl: s.profileImageUrl,
                      approvalStatus: s.approvalStatus,
                      status: s.status,
                      preferredLocation: s.preferredLocation,
                      active: s.active,
                      notes: s.notes,
                    }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
