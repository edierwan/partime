import { prisma } from '@/lib/db';
import { mytStartOfDay, mytEndOfDay, parseDateInput, formatDate, formatTime } from '@/lib/time';
import { requireSession } from '@/lib/auth';
import { formatMalaysiaPhoneDisplay, resolveBankName } from '@/lib/staff';

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
  const base = searchParams.get('date') ? parseDateInput(searchParams.get('date')!) : new Date();
  const dayStart = mytStartOfDay(base);
  const dayEnd = mytEndOfDay(base);
  const where: any = { workDate: { gte: dayStart, lte: dayEnd } };
  const eventId = searchParams.get('eventId');
  if (eventId && eventId !== 'all') where.eventId = eventId;

  const sessions = await prisma.attendanceSession.findMany({
    where, include: { staff: true, event: true }, orderBy: { staff: { fullName: 'asc' } },
  });

  const header = ['PayName','Alias','FullName','Phone','Bank','AccountNumber','Event','TimeIn','TimeOut','DeductHours','PayableHours','HourlyRate','TotalPay','Status'];
  const rows = sessions.map((s) => [
    s.staff.payName,
    s.staff.aliasPanggilan,
    s.staff.fullName,
    s.staff.phoneDisplay || formatMalaysiaPhoneDisplay(s.staff.phoneE164),
    resolveBankName(s.staff.bankCode, s.staff.bankName, s.staff.customBankName) ?? '',
    s.staff.bankAccountNumber ?? '',
    s.event.name,
    formatTime(s.clockInAt), s.clockOutAt ? formatTime(s.clockOutAt) : '',
    s.breakDeductMinutes != null ? (s.breakDeductMinutes / 60).toFixed(2) : '',
    s.payableMinutes != null ? (s.payableMinutes / 60).toFixed(2) : '',
    (s.hourlyRateSnapshotCents / 100).toFixed(2),
    s.totalPayCents != null ? (s.totalPayCents / 100).toFixed(2) : '',
    s.status,
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
  const filename = `daily-report-${formatDate(base).replace(/\W+/g, '-')}.csv`;
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
