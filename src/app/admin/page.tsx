import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/Badge';
import { mytStartOfDay, mytEndOfDay, mytStartOfWeek, mytEndOfWeek, formatTime } from '@/lib/time';
import { formatMYR, formatHours } from '@/lib/money';
import { isMissingClockOut } from '@/lib/calc';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const now = new Date();
  const dayStart = mytStartOfDay(now);
  const dayEnd = mytEndOfDay(now);
  const weekStart = mytStartOfWeek(now);
  const weekEnd = mytEndOfWeek(now);

  const [openToday, allOpen, weekSessions, weekStaff, activeEvents] = await Promise.all([
    prisma.attendanceSession.count({ where: { status: 'OPEN', workDate: { gte: dayStart, lte: dayEnd } } }),
    prisma.attendanceSession.findMany({ where: { status: 'OPEN' }, select: { clockInAt: true } }),
    prisma.attendanceSession.findMany({
      where: { workDate: { gte: weekStart, lte: weekEnd }, status: { in: ['COMPLETED', 'MANUAL_ADJUSTED'] } },
      select: { payableMinutes: true, totalPayCents: true, staffId: true },
    }),
    prisma.attendanceSession.findMany({
      where: { workDate: { gte: weekStart, lte: weekEnd } },
      select: { staffId: true }, distinct: ['staffId'],
    }),
    prisma.workEvent.count({ where: { active: true, workDate: { gte: dayStart, lte: dayEnd } } }),
  ]);

  const missing = allOpen.filter((s) => isMissingClockOut(now, s.clockInAt, null)).length;
  const totalPayable = weekSessions.reduce((a, s) => a + (s.payableMinutes ?? 0), 0);
  const totalPay = weekSessions.reduce((a, s) => a + (s.totalPayCents ?? 0), 0);

  const todaysStaff = await prisma.attendanceSession.findMany({
    where: { workDate: { gte: dayStart, lte: dayEnd } },
    include: { staff: true, event: true },
    orderBy: { clockInAt: 'desc' },
    take: 6,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sectiontitle">Dashboard</h1>
        <p className="subtitle">Track attendance, hours, and weekly payout at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Active Clock-ins Today"     value={openToday}                          icon="👥" accent="green" />
        <StatCard label="Missing Clock-outs"          value={missing}                            icon="⚠️" accent="red"   hint={missing ? 'Needs attention' : 'All good'} />
        <StatCard label="Total Payable Hours (Week)"  value={formatHours(totalPayable)}          icon="⏱"  accent="blue" />
        <StatCard label="Estimated Weekly Payout"     value={formatMYR(totalPay)}                icon="💼" accent="violet" />
        <StatCard label="Staff Worked (Week)"         value={weekStaff.length}                   icon="🧑‍🤝‍🧑" accent="sky" />
        <StatCard label="Active Events Today"         value={activeEvents}                       icon="📅" accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-5 py-4 flex items-center justify-between border-b border-ink-200">
            <div className="font-semibold">Today’s Active Staff</div>
            <Link href="/admin/attendance" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          {todaysStaff.length === 0 ? (
            <div className="p-6 text-sm text-ink-500">No attendance recorded yet today.</div>
          ) : (
            <table className="table-base">
              <thead>
                <tr><th>Staff Name</th><th>Event</th><th>Clock In</th><th>Status</th></tr>
              </thead>
              <tbody>
                {todaysStaff.map((s) => {
                  const missingNow = isMissingClockOut(now, s.clockInAt, s.clockOutAt);
                  const status = missingNow ? 'MISSING_CLOCK_OUT' : s.status;
                  return (
                    <tr key={s.id}>
                      <td className="font-medium">{s.staff.fullName}</td>
                      <td className="text-ink-600">{s.event.name}</td>
                      <td>{formatTime(s.clockInAt)}</td>
                      <td><StatusBadge status={status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="card card-pad">
          <div className="font-semibold mb-3">Quick Actions</div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/staff" className="card card-pad hover:bg-ink-50 transition-colors text-center">
              <div className="text-2xl mb-1">👤</div>
              <div className="text-sm font-medium">Add Staff</div>
            </Link>
            <Link href="/admin/events" className="card card-pad hover:bg-ink-50 transition-colors text-center">
              <div className="text-2xl mb-1">🎫</div>
              <div className="text-sm font-medium">Create Event</div>
            </Link>
            <Link href="/admin/events" className="card card-pad hover:bg-ink-50 transition-colors text-center">
              <div className="text-2xl mb-1">🖨️</div>
              <div className="text-sm font-medium">Print QR</div>
            </Link>
            <Link href="/admin/reports/weekly-payroll" className="card card-pad hover:bg-ink-50 transition-colors text-center">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-sm font-medium">Weekly Report</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
