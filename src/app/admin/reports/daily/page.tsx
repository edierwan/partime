import { prisma } from '@/lib/db';
import { StatCard } from '@/components/StatCard';
import { PrintButton } from '@/components/PrintButton';
import { formatDate, formatTime, mytStartOfDay, mytEndOfDay, mytStartOfWeek, mytEndOfWeek, parseDateInput, formatDayShort } from '@/lib/time';
import { formatMYR, formatHours } from '@/lib/money';
import { Avatar } from '@/components/Avatar';
import { formatMalaysiaPhoneDisplay, maskBankAccountNumber, resolveBankName } from '@/lib/staff';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SP = { date?: string; eventId?: string };

export default async function DailyReportPage({ searchParams }: { searchParams: SP }) {
  const now = new Date();
  const date = searchParams.date ? parseDateInput(searchParams.date) : now;
  const dayStart = mytStartOfDay(date);
  const dayEnd = mytEndOfDay(date);

  const where: any = { workDate: { gte: dayStart, lte: dayEnd }, status: { in: ['COMPLETED', 'MANUAL_ADJUSTED', 'OPEN', 'MISSING_CLOCK_OUT'] } };
  if (searchParams.eventId && searchParams.eventId !== 'all') where.eventId = searchParams.eventId;

  const [sessions, events, weekSessions] = await Promise.all([
    prisma.attendanceSession.findMany({ where, include: { staff: true, event: true }, orderBy: { staff: { fullName: 'asc' } } }),
    prisma.workEvent.findMany({ orderBy: { workDate: 'desc' }, take: 100 }),
    prisma.attendanceSession.findMany({
      where: { workDate: { gte: mytStartOfWeek(date), lte: mytEndOfWeek(date) }, status: { in: ['COMPLETED','MANUAL_ADJUSTED'] } },
    }),
  ]);

  const payableSum = sessions.reduce((a, s) => a + (s.payableMinutes ?? 0), 0);
  const paySum = sessions.reduce((a, s) => a + (s.totalPayCents ?? 0), 0);
  const notesCount = sessions.filter((s) => s.adminNotes && s.adminNotes.length > 0).length;

  // Weekly side summary by day
  const weeklyByDay = new Map<string, { day: Date; hours: number; pay: number }>();
  for (const s of weekSessions) {
    const k = s.workDate.toISOString();
    const g = weeklyByDay.get(k) || { day: s.workDate, hours: 0, pay: 0 };
    g.hours += s.payableMinutes ?? 0;
    g.pay += s.totalPayCents ?? 0;
    weeklyByDay.set(k, g);
  }
  const weeklySummary = Array.from(weeklyByDay.values()).sort((a, b) => a.day.getTime() - b.day.getTime());

  // default hourly rate for top card = mode of session rates or first event
  const defaultRate = sessions[0]?.hourlyRateSnapshotCents ?? events[0]?.defaultRateCents ?? 0;

  const csvParams = new URLSearchParams({ date: searchParams.date || isoDate(date) });
  if (searchParams.eventId) csvParams.set('eventId', searchParams.eventId);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3 no-print">
        <div>
          <h1 className="sectiontitle">Daily Report</h1>
          <p className="subtitle">Daily attendance, hours, and payable totals.</p>
        </div>
        <div className="flex gap-2">
          <PrintButton label="🖨 Print Daily Report" />
          <a href={`/api/reports/daily.csv?${csvParams.toString()}`} className="btn-ghost">⬇ Export CSV</a>
        </div>
      </div>

      <form className="card card-pad grid grid-cols-1 md:grid-cols-3 gap-3 no-print" action="/admin/reports/daily" method="get">
        <div>
          <label className="label">Date</label>
          <input type="date" name="date" className="input" defaultValue={searchParams.date || isoDate(date)} />
        </div>
        <div>
          <label className="label">Event</label>
          <select name="eventId" className="input" defaultValue={searchParams.eventId || 'all'}>
            <option value="all">All Events</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name} — {formatDate(e.workDate)}</option>)}
          </select>
        </div>
        <div className="flex items-end"><button className="btn-primary w-full">Apply</button></div>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Hourly Rate (Default)" value={formatMYR(defaultRate)} icon="👤" accent="green" hint="Most recent rate" />
        <StatCard label="Total Payable"         value={formatMYR(paySum)}      icon="👥" accent="violet" hint={`For ${formatDate(date)}`} />
        <StatCard label="Total Hours"           value={formatHours(payableSum)} icon="⏱" accent="blue"  hint={`Across ${sessions.length} staff`} />
        <StatCard label="Review Notes Count"    value={notesCount}             icon="📝" accent="amber" hint={notesCount ? 'Requires attention' : '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1">
          <div className="px-5 py-3 border-b border-ink-200 font-semibold">Daily Summary (This Week)</div>
          <table className="table-base">
            <thead><tr><th>Date</th><th>Day</th><th className="text-right">Hours</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {weeklySummary.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-ink-500">No data</td></tr>}
              {weeklySummary.map((d) => (
                <tr key={d.day.toISOString()}>
                  <td>{formatDate(d.day)}</td>
                  <td>{formatDayShort(d.day)}</td>
                  <td className="text-right">{formatHours(d.hours)}</td>
                  <td className="text-right">{formatMYR(d.pay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card lg:col-span-2 overflow-x-auto">
          <div className="px-5 py-3 border-b border-ink-200 flex items-center justify-between">
            <div className="font-semibold">Daily Report — {formatDate(date)}</div>
            <div className="text-xs text-ink-500">{sessions.length} staff · {formatHours(payableSum)} hours · {formatMYR(paySum)}</div>
          </div>
          <table className="table-base">
            <thead>
              <tr>
                <th>Pay Name</th><th>Alias</th><th>Full Name</th><th>Phone</th>
                <th>Bank</th><th>Account</th>
                <th>Time In</th><th>Time Out</th>
                <th className="text-right">Deduct</th><th className="text-right">Hours</th><th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 && <tr><td colSpan={11} className="text-center py-10 text-ink-500">No attendance for this date.</td></tr>}
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={s.staff.fullName} src={s.staff.profileImageUrl} className="h-8 w-8 text-[10px]" />
                      <div>
                        <div className="font-medium">{s.staff.payName}</div>
                        <div className="text-xs text-ink-500">{s.staff.fullName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-ink-600 uppercase text-xs">{s.staff.aliasPanggilan}</td>
                  <td>{s.staff.fullName}</td>
                  <td className="text-ink-600">{s.staff.phoneDisplay || formatMalaysiaPhoneDisplay(s.staff.phoneE164)}</td>
                  <td>{resolveBankName(s.staff.bankCode, s.staff.bankName, s.staff.customBankName) || '—'}</td>
                  <td className="text-ink-600">{maskBankAccountNumber(s.staff.bankAccountNumber)}</td>
                  <td>{formatTime(s.clockInAt)}</td>
                  <td>{s.clockOutAt ? formatTime(s.clockOutAt) : '–'}</td>
                  <td className="text-right">{formatHours(s.breakDeductMinutes)}</td>
                  <td className="text-right">{formatHours(s.payableMinutes)}</td>
                  <td className="text-right">{s.totalPayCents != null ? formatMYR(s.totalPayCents) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-ink-500 no-print">ⓘ Note: Deduct hours are excluded from payable totals. Cancelled and open sessions are excluded.</div>
    </div>
  );
}

function isoDate(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
