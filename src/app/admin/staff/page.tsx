import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StatCard } from '@/components/StatCard';
import { Badge, StatusBadge } from '@/components/Badge';
import { formatMYR, maskAccount } from '@/lib/money';
import { StaffClient } from './StaffClient';

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
      { alias:   { contains: q, mode: 'insensitive' } },
      { fullName:{ contains: q, mode: 'insensitive' } },
      { phone:   { contains: q } },
    ];
  }
  if (filter === 'active')   where.active = true;
  if (filter === 'inactive') where.active = false;
  if (filter === 'missing-bank') where.AND = [{ OR: [{ bankAccount: null }, { bankAccount: '' }] }];

  const [staff, total, active, missingBank, rateAgg] = await Promise.all([
    prisma.staff.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.staff.count(),
    prisma.staff.count({ where: { active: true } }),
    prisma.staff.count({ where: { OR: [{ bankAccount: null }, { bankAccount: '' }] } }),
    prisma.staff.aggregate({ _avg: { hourlyRateCents: true } }),
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
        <StatCard label="Missing Bank Info"  value={missingBank}                            icon="⚠️" accent="amber" hint={missingBank ? 'Needs attention' : '—'} />
        <StatCard label="Average Hourly Rate" value={formatMYR(Math.round(rateAgg._avg.hourlyRateCents || 0))} icon="💼" accent="violet" />
      </div>

      <div className="card">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-ink-200">
          <form className="flex-1 min-w-[220px]" action="/admin/staff" method="get">
            {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
            <input className="input" name="q" defaultValue={q} placeholder="Search by name, alias, phone or bank…" />
          </form>
          <div className="flex flex-wrap gap-2">
            {filterChip('all', 'All', total)}
            {filterChip('active', 'Active', active)}
            {filterChip('inactive', 'Inactive', total - active)}
            {filterChip('missing-bank', 'Missing Bank Info', missingBank)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Pay Name</th><th>Alias / Match Key</th><th>Full Name</th>
                <th>Phone</th><th>Bank</th><th>Account Number</th>
                <th>Hourly Rate</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-ink-500">No staff found.</td></tr>
              )}
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-semibold">{s.payName.slice(0,1).toUpperCase()}</span>
                      <span className="font-medium">{s.payName}</span>
                    </div>
                  </td>
                  <td className="text-ink-600 uppercase text-xs tracking-wide">{s.alias}</td>
                  <td>{s.fullName}</td>
                  <td className="text-ink-600">{s.phone}</td>
                  <td>{s.bankName || (!s.bankAccount && <Badge variant="amber">⚠ Missing Bank Info</Badge>) || '—'}</td>
                  <td className="text-ink-600">{s.bankAccount ? maskAccount(s.bankAccount) : '—'}</td>
                  <td>{formatMYR(s.hourlyRateCents)}</td>
                  <td><StatusBadge status={s.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                  <td className="text-right">
                    <StaffClient mode="row" staff={{
                      id: s.id, payName: s.payName, alias: s.alias, fullName: s.fullName,
                      phone: s.phone, bankName: s.bankName, bankAccount: s.bankAccount,
                      hourlyRateCents: s.hourlyRateCents, active: s.active, notes: s.notes,
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
