import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';
import { PrintButton } from '@/components/PrintButton';
import { formatDate, formatTime, mytStartOfWeek, mytEndOfWeek, parseDateInput } from '@/lib/time';
import { formatMYR, formatHours } from '@/lib/money';
import { WeeklyExpand } from './WeeklyExpand';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SP = { week?: string; eventId?: string; staffId?: string };

export default async function WeeklyPayrollPage({ searchParams }: { searchParams: SP }) {
  const now = new Date();
  const base = searchParams.week ? parseDateInput(searchParams.week) : now;
  const weekStart = mytStartOfWeek(base);
  const weekEnd = mytEndOfWeek(base);

  const where: any = { workDate: { gte: weekStart, lte: weekEnd } };
  if (searchParams.eventId && searchParams.eventId !== 'all') where.eventId = searchParams.eventId;
  if (searchParams.staffId && searchParams.staffId !== 'all') where.staffId = searchParams.staffId;

  const [sessions, events, staffList] = await Promise.all([
    prisma.attendanceSession.findMany({
      where,
      include: { staff: true, event: true },
      orderBy: [{ staffId: 'asc' }, { workDate: 'asc' }],
    }),
    prisma.workEvent.findMany({ orderBy: { workDate: 'desc' }, take: 100 }),
    prisma.staff.findMany({ orderBy: { fullName: 'asc' } }),
  ]);

  // Group by staff
  const byStaff = new Map<string, { staff: any; rows: typeof sessions; totals: { gross: number; deduct: number; payable: number; pay: number; days: Set<string>; hasMissing: boolean } }>();
  for (const s of sessions) {
    if (s.status === 'CANCELLED') continue;
    const g = byStaff.get(s.staffId) || {
      staff: s.staff,
      rows: [] as any[],
      totals: { gross: 0, deduct: 0, payable: 0, pay: 0, days: new Set<string>(), hasMissing: false },
    };
    g.rows.push(s);
    if (s.status === 'COMPLETED' || s.status === 'MANUAL_ADJUSTED') {
      g.totals.gross   += s.grossMinutes        ?? 0;
      g.totals.deduct  += s.breakDeductMinutes  ?? 0;
      g.totals.payable += s.payableMinutes      ?? 0;
      g.totals.pay     += s.totalPayCents       ?? 0;
      g.totals.days.add(s.workDate.toISOString());
    }
    if (s.status === 'OPEN' || s.status === 'MISSING_CLOCK_OUT') g.totals.hasMissing = true;
    byStaff.set(s.staffId, g);
  }
  const groups = Array.from(byStaff.values());

  const summary = {
    totalStaff: groups.length,
    gross:   groups.reduce((a, g) => a + g.totals.gross,   0),
    deduct:  groups.reduce((a, g) => a + g.totals.deduct,  0),
    payable: groups.reduce((a, g) => a + g.totals.payable, 0),
    pay:     groups.reduce((a, g) => a + g.totals.pay,     0),
    missing: groups.filter((g) => g.totals.hasMissing).length,
    missingBank: groups.filter((g) => !g.staff.bankCode || !g.staff.bankAccountNumber).length,
  };

  const csvParams = new URLSearchParams({ week: searchParams.week || isoDate(weekStart) });
  if (searchParams.eventId) csvParams.set('eventId', searchParams.eventId);
  if (searchParams.staffId) csvParams.set('staffId', searchParams.staffId);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3 no-print">
        <div>
          <h1 className="sectiontitle">Weekly Payroll Report</h1>
          <p className="subtitle">Review payable hours and total payout before manual payment.</p>
        </div>
        <div className="flex gap-2">
          <PrintButton label="🖨 Print Report" />
          <a href={`/api/reports/weekly-payroll.csv?${csvParams.toString()}`} className="btn-ghost">⬇ Export CSV</a>
          <Link href="/admin/reports/exceptions" className="btn-ghost">⚠ Review Exceptions</Link>
        </div>
      </div>

      <form className="card card-pad grid grid-cols-1 md:grid-cols-4 gap-3 no-print" action="/admin/reports/weekly-payroll" method="get">
        <div>
          <label className="label">Week (pick any date)</label>
          <input className="input" type="date" name="week" defaultValue={searchParams.week || isoDate(weekStart)} />
        </div>
        <div>
          <label className="label">Event</label>
          <select className="input" name="eventId" defaultValue={searchParams.eventId || 'all'}>
            <option value="all">All Events</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name} — {formatDate(e.workDate)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Staff</label>
          <select className="input" name="staffId" defaultValue={searchParams.staffId || 'all'}>
            <option value="all">All Staff</option>
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
        </div>
        <div className="flex items-end"><button className="btn-primary w-full">Apply</button></div>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Staff"        value={summary.totalStaff}             icon="👥" />
        <StatCard label="Gross Hours"        value={formatHours(summary.gross)}     icon="⏱" />
        <StatCard label="Break Deduct"       value={formatHours(summary.deduct)}    icon="🍱" accent="amber" />
        <StatCard label="Payable Hours"      value={formatHours(summary.payable)}   icon="✓"  accent="green" />
        <StatCard label="Estimated Payout"   value={formatMYR(summary.pay)}         icon="💼" accent="violet" />
        <StatCard label="Missing Clock-outs" value={summary.missing}                icon="⚠️" accent="red" hint={summary.missing ? 'Needs attention' : 'All clear'} />
      </div>

      <div className="text-sm text-ink-500 no-print">
        Week: <span className="font-medium text-ink-700">{formatDate(weekStart)}</span> –{' '}
        <span className="font-medium text-ink-700">{formatDate(weekEnd)}</span> (Asia/Kuala_Lumpur)
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th></th>
              <th>Pay Name</th><th>Alias</th><th>Full Name</th><th>Phone</th>
              <th>Bank</th><th>Account No.</th>
              <th className="text-right">Days</th>
              <th className="text-right">Gross</th>
              <th className="text-right">Deduct</th>
              <th className="text-right">Payable</th>
              <th className="text-right">Total Pay</th>
              <th>Warnings</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr><td colSpan={13} className="text-center py-10 text-ink-500">No attendance for this week.</td></tr>
            )}
            {groups.map((g) => (
              <WeeklyExpand
                key={g.staff.id}
                staff={g.staff}
                rows={g.rows.map((r) => ({
                  id: r.id, workDate: r.workDate, eventName: r.event.name,
                  clockInAt: r.clockInAt, clockOutAt: r.clockOutAt,
                  grossMinutes: r.grossMinutes, breakDeductMinutes: r.breakDeductMinutes,
                  payableMinutes: r.payableMinutes, hourlyRateSnapshotCents: r.hourlyRateSnapshotCents,
                  totalPayCents: r.totalPayCents, status: r.status,
                }))}
                totals={{
                  days: g.totals.days.size,
                  gross: g.totals.gross, deduct: g.totals.deduct,
                  payable: g.totals.payable, pay: g.totals.pay,
                  hasMissing: g.totals.hasMissing,
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function isoDate(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
