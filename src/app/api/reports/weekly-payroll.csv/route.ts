import { prisma } from '@/lib/db';
import { mytStartOfWeek, mytEndOfWeek, parseDateInput, formatDate, formatTime } from '@/lib/time';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function csvCell(v: any): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  await requireSession();
  const { searchParams } = new URL(req.url);
  const base = searchParams.get('week') ? parseDateInput(searchParams.get('week')!) : new Date();
  const weekStart = mytStartOfWeek(base);
  const weekEnd = mytEndOfWeek(base);

  const where: any = { workDate: { gte: weekStart, lte: weekEnd }, status: { in: ['COMPLETED', 'MANUAL_ADJUSTED'] } };
  const eventId = searchParams.get('eventId');
  const staffId = searchParams.get('staffId');
  if (eventId && eventId !== 'all') where.eventId = eventId;
  if (staffId && staffId !== 'all') where.staffId = staffId;

  const sessions = await prisma.attendanceSession.findMany({
    where, include: { staff: true, event: true }, orderBy: [{ staff: { fullName: 'asc' } }, { workDate: 'asc' }],
  });

  const header = ['PayName','Alias','FullName','Phone','Bank','AccountNumber','Date','Event','ClockIn','ClockOut','GrossHours','BreakDeductHours','PayableHours','HourlyRate','TotalPay','Status'];
  const rows = sessions.map((s) => [
    s.staff.payName, s.staff.alias, s.staff.fullName, s.staff.phone,
    s.staff.bankName ?? '', s.staff.bankAccount ?? '',
    formatDate(s.workDate), s.event.name,
    formatTime(s.clockInAt), s.clockOutAt ? formatTime(s.clockOutAt) : '',
    s.grossMinutes != null ? (s.grossMinutes / 60).toFixed(2) : '',
    s.breakDeductMinutes != null ? (s.breakDeductMinutes / 60).toFixed(2) : '',
    s.payableMinutes != null ? (s.payableMinutes / 60).toFixed(2) : '',
    (s.hourlyRateSnapshotCents / 100).toFixed(2),
    s.totalPayCents != null ? (s.totalPayCents / 100).toFixed(2) : '',
    s.status,
  ]);

  const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
  const filename = `weekly-payroll-${formatDate(weekStart).replace(/\W+/g, '-')}.csv`;
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
