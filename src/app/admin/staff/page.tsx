import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StatCard } from '@/components/StatCard';
import { Badge, StatusBadge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { StaffClient } from './StaffClient';
import { formatMalaysiaPhoneDisplay, maskBankAccountNumber, maskIcNumber, resolveBankName } from '@/lib/staff';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StaffPage({
  searchParams,
}: { searchParams: { q?: string; filter?: string } }) {
  const q = (searchParams.q || '').trim();
  const filter = searchParams.filter || 'all';

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
  if (filter === 'active') where.active = true;
  if (filter === 'inactive') where.active = false;
  if (filter === 'pending-review') where.approvalStatus = 'PENDING_REVIEW';
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

  const [staff, total, active, pendingReview, missingBank] = await Promise.all([
    prisma.staff.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.staff.count(),
    prisma.staff.count({ where: { active: true } }),
    prisma.staff.count({ where: { approvalStatus: 'PENDING_REVIEW' } }),
    prisma.staff.count({ where: { OR: [{ bankCode: null }, { bankCode: '' }, { bankAccountNumber: null }, { bankAccountNumber: '' }] } }),
  ]);

  const filterChip = (key: string, label: string, count?: number) => {
    const active = filter === key || (key === 'all' && !searchParams.filter);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (key !== 'all') params.set('filter', key);
    return (
      <Link
        href={`/admin/staff${params.toString() ? `?${params.toString()}` : ''}`}
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
          <h1 className="sectiontitle">Staff Management</h1>
          <p className="subtitle">Manage part-time worker profiles and payment details.</p>
        </div>
        <StaffClient mode="addButton" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Staff"        value={total}                                  icon="👥" accent="blue" />
        <StatCard label="Active Staff"       value={active}                                 icon="✓"  accent="green" />
        <StatCard label="Pending Review"     value={pendingReview}                          icon="🕒" accent="amber" hint={pendingReview ? 'Needs approval' : '—'} />
        <StatCard label="Missing Bank Info"  value={missingBank}                            icon="⚠️" accent="amber" hint={missingBank ? 'Needs attention' : '—'} />
      </div>

      <div className="card">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-ink-200">
          <form className="flex-1 min-w-[220px]" action="/admin/staff" method="get">
            {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
            <input className="input" name="q" defaultValue={q} placeholder="Search by name, alias, phone, or email…" />
          </form>
          <div className="flex flex-wrap gap-2">
            {filterChip('all', 'All', total)}
            {filterChip('active', 'Active', active)}
            {filterChip('inactive', 'Inactive', total - active)}
            {filterChip('pending-review', 'Pending Review', pendingReview)}
            {filterChip('missing-bank', 'Missing Bank Info', missingBank)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Staff</th><th>Alias / Match Key</th><th>IC</th>
                <th>Phone</th><th>Email</th><th>Bank</th>
                <th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-ink-500">No staff found.</td></tr>
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
                  <td className="text-ink-600">{maskIcNumber(s.icNumberNormalized || s.icNumberDisplay)}</td>
                  <td className="text-ink-600">{s.phoneDisplay || formatMalaysiaPhoneDisplay(s.phoneE164)}</td>
                  <td className="text-ink-600">{s.email || '—'}</td>
                  <td>
                    <div className="space-y-1">
                      <div>{resolveBankName(s.bankCode, s.bankName, s.customBankName) || '—'}</div>
                      <div className="text-xs text-ink-500">{maskBankAccountNumber(s.bankAccountNumber)}</div>
                      {(!s.bankCode || !s.bankAccountNumber) && <Badge variant="amber">Missing Bank Info</Badge>}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={s.active ? 'ACTIVE' : 'INACTIVE'} />
                      {s.approvalStatus === 'PENDING_REVIEW' && <Badge variant="amber">Pending Review</Badge>}
                      {s.approvalStatus === 'REJECTED' && <Badge variant="red">Rejected</Badge>}
                      {s.approvalStatus === 'APPROVED' && <Badge variant="green">Approved</Badge>}
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
                      phoneDisplay: s.phoneDisplay || s.phoneE164,
                      email: s.email,
                      bankCode: s.bankCode,
                      bankName: s.bankName,
                      customBankName: s.customBankName,
                      bankAccountNumber: s.bankAccountNumber,
                      profileImageUrl: s.profileImageUrl,
                      approvalStatus: s.approvalStatus,
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
