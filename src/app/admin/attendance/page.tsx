import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { formatDate, formatTime, mytStartOfDay, mytEndOfDay, parseDateInput } from '@/lib/time';
import { formatMYR, formatHours } from '@/lib/money';
import { isMissingClockOut } from '@/lib/calc';
import { formatMalaysiaPhoneDisplay } from '@/lib/staff';
import { AdjustClient } from './AdjustClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SP = { from?: string; to?: string; eventId?: string; status?: string; q?: string; tenantId?: string };

export default async function AttendancePage(props: { searchParams: Promise<SP> }) {
  const searchParams = await props.searchParams;
  const now = new Date();
  const fromDate = searchParams.from ? parseDateInput(searchParams.from) : new Date(mytStartOfDay(now).getTime() - 6 * 24 * 60 * 60 * 1000);
  const toDate   = searchParams.to   ? new Date(mytEndOfDay(parseDateInput(searchParams.to)).getTime()) : mytEndOfDay(now);

  const where: any = { workDate: { gte: fromDate, lte: toDate } };
  if (searchParams.tenantId && searchParams.tenantId !== 'all') where.tenantId = searchParams.tenantId;
  if (searchParams.eventId && searchParams.eventId !== 'all') where.eventId = searchParams.eventId;
  if (searchParams.status && searchParams.status !== 'all') where.status = searchParams.status;
  if (searchParams.q) {
    where.staff = { OR: [
      { fullName: { contains: searchParams.q, mode: 'insensitive' } },
      { payName:  { contains: searchParams.q, mode: 'insensitive' } },
      { aliasPanggilan: { contains: searchParams.q, mode: 'insensitive' } },
      { phoneE164: { contains: searchParams.q.replace(/\s+/g, '') } },
      { email: { contains: searchParams.q, mode: 'insensitive' } },
    ]};
  }

  const tenantWhere = searchParams.tenantId && searchParams.tenantId !== 'all' ? { tenantId: searchParams.tenantId } : undefined;
  const [sessions, events, tenants, openCount, completedToday, manualToday, allOpenSessions] = await Promise.all([
    prisma.attendanceSession.findMany({
      where, include: { staff: true, event: true },
      orderBy: [{ workDate: 'desc' }, { clockInAt: 'desc' }], take: 300,
    }),
    prisma.workEvent.findMany({ where: tenantWhere, orderBy: { workDate: 'desc' }, take: 100 }),
    prisma.tenant.findMany({ orderBy: { name: 'asc' } }),
    prisma.attendanceSession.count({ where: { ...(tenantWhere || {}), status: 'OPEN' } }),
    prisma.attendanceSession.count({ where: { ...(tenantWhere || {}), status: 'COMPLETED', workDate: { gte: mytStartOfDay(now), lte: mytEndOfDay(now) } } }),
    prisma.attendanceSession.count({ where: { ...(tenantWhere || {}), status: 'MANUAL_ADJUSTED', workDate: { gte: mytStartOfDay(now), lte: mytEndOfDay(now) } } }),
    prisma.attendanceSession.findMany({ where: { ...(tenantWhere || {}), status: 'OPEN' }, select: { clockInAt: true } }),
  ]);

  const missingCount = allOpenSessions.filter(s => isMissingClockOut(now, s.clockInAt, null)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sectiontitle">Attendance Logs</h1>
        <p className="subtitle">Review clock-ins, clock-outs, and manual adjustments.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Open Sessions"    value={openCount}      icon="⏱" accent="green" />
        <StatCard label="Completed Today"  value={completedToday} icon="✓" accent="blue" />
        <StatCard label="Missing Clock-outs" value={missingCount} icon="⚠️" accent="red" />
        <StatCard label="Manual Adjustments (Today)" value={manualToday} icon="✏️" accent="amber" />
      </div>

      <form className="card card-pad grid grid-cols-1 md:grid-cols-6 gap-3" action="/admin/attendance" method="get">
        <div>
          <label className="label">From</label>
          <input type="date" name="from" className="input" defaultValue={searchParams.from || isoDate(fromDate)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" name="to" className="input" defaultValue={searchParams.to || isoDate(toDate)} />
        </div>
        <div>
          <label className="label">Employer</label>
          <select name="tenantId" className="input" defaultValue={searchParams.tenantId || 'all'}>
            <option value="all">All Employers</option>
            {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Event</label>
          <select name="eventId" className="input" defaultValue={searchParams.eventId || 'all'}>
            <option value="all">All Events</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name} — {formatDate(e.workDate)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" className="input" defaultValue={searchParams.status || 'all'}>
            {['all','OPEN','COMPLETED','MISSING_CLOCK_OUT','MANUAL_ADJUSTED','CANCELLED'].map((s) =>
              <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <input name="q" className="input flex-1" defaultValue={searchParams.q || ''} placeholder="Search part-timer…" />
          <button className="btn-primary" type="submit">Filter</button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th><th>Event</th><th>Part-timer</th><th>Phone</th>
              <th>Clock In</th><th>Clock Out</th>
              <th className="text-right">Gross</th><th className="text-right">Deduct</th>
              <th className="text-right">Payable</th><th className="text-right">Rate</th>
              <th className="text-right">Total Pay</th>
              <th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr><td colSpan={13} className="text-center py-10 text-ink-500">No attendance found for this filter.</td></tr>
            )}
            {sessions.map((s) => {
              const status = isMissingClockOut(now, s.clockInAt, s.clockOutAt) && s.status === 'OPEN' ? 'MISSING_CLOCK_OUT' : s.status;
              return (
                <tr key={s.id}>
                  <td>{formatDate(s.workDate)}</td>
                  <td className="text-ink-600">{s.event.name}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={s.staff.fullName} src={s.staff.profileImageUrl} className="h-8 w-8 text-[10px]" />
                      <div>
                        <div className="font-medium">{s.staff.fullName}</div>
                        <div className="text-xs text-ink-500 uppercase tracking-wide">{s.staff.aliasPanggilan}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-ink-600">{s.staff.phoneDisplay || formatMalaysiaPhoneDisplay(s.staff.phoneE164)}</td>
                  <td>{formatTime(s.clockInAt)}</td>
                  <td>{s.clockOutAt ? formatTime(s.clockOutAt) : '–'}</td>
                  <td className="text-right">{formatHours(s.grossMinutes)}</td>
                  <td className="text-right">{formatHours(s.breakDeductMinutes)}</td>
                  <td className="text-right">{formatHours(s.payableMinutes)}</td>
                  <td className="text-right">{formatMYR(s.hourlyRateSnapshotCents)}</td>
                  <td className="text-right">{s.totalPayCents != null ? formatMYR(s.totalPayCents) : '–'}</td>
                  <td><StatusBadge status={status} /></td>
                  <td className="text-right">
                    <AdjustClient session={{
                      id: s.id,
                      staffName: s.staff.fullName,
                      eventName: s.event.name,
                      workDate: s.workDate,
                      clockInAt: s.clockInAt,
                      clockOutAt: s.clockOutAt,
                      breakDeductMinutes: s.breakDeductMinutes,
                      breakOverridden: s.breakOverridden,
                      hourlyRateSnapshotCents: s.hourlyRateSnapshotCents,
                      adminNotes: s.adminNotes,
                      status: status,
                      autoBreakRule: s.event.autoBreakRule,
                    }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function isoDate(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
