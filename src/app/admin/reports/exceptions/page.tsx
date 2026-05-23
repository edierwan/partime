import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StatCard } from '@/components/StatCard';
import { StatusBadge, Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { formatDateTime, formatDate, formatTime } from '@/lib/time';
import { isMissingClockOut } from '@/lib/calc';
import { formatMalaysiaPhoneDisplay } from '@/lib/staff';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ExceptionsPage() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [openSessions, manualSessions, cancelledSessions, staffMissingBank, duplicateScans] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: { status: 'OPEN' },
      include: { staff: true, event: true },
      orderBy: { clockInAt: 'asc' }, take: 100,
    }),
    prisma.attendanceSession.findMany({
      where: { status: 'MANUAL_ADJUSTED', updatedAt: { gte: sevenDaysAgo } },
      include: { staff: true, event: true },
      orderBy: { updatedAt: 'desc' }, take: 50,
    }),
    prisma.attendanceSession.findMany({
      where: { status: 'CANCELLED', updatedAt: { gte: sevenDaysAgo } },
      include: { staff: true, event: true },
      orderBy: { updatedAt: 'desc' }, take: 50,
    }),
    prisma.staff.findMany({
      where: { active: true, OR: [{ bankCode: null }, { bankCode: '' }, { bankAccountNumber: null }, { bankAccountNumber: '' }] },
      orderBy: { fullName: 'asc' }, take: 100,
    }),
    prisma.scanLog.findMany({
      where: { action: 'DUPLICATE', createdAt: { gte: sevenDaysAgo } },
      include: { staff: true, event: true }, orderBy: { createdAt: 'desc' }, take: 50,
    }),
  ]);

  const missingClockOuts = openSessions.filter((s) => isMissingClockOut(now, s.clockInAt, null));
  const oldOpen = openSessions.filter((s) => !isMissingClockOut(now, s.clockInAt, null) && (now.getTime() - s.clockInAt.getTime()) > 12 * 60 * 60 * 1000);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sectiontitle">Exceptions</h1>
        <p className="subtitle">Items that need admin review before payroll.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Missing Clock-outs" value={missingClockOuts.length} icon="⚠️" accent="red" />
        <StatCard label="Old Open Sessions" value={oldOpen.length} icon="⏳" accent="amber" />
        <StatCard label="Manual Adjusted (7d)" value={manualSessions.length} icon="✏️" accent="amber" />
        <StatCard label="Cancelled (7d)" value={cancelledSessions.length} icon="✕" accent="red" />
        <StatCard label="Staff No Bank Info" value={staffMissingBank.length} icon="🏦" accent="amber" />
      </div>

      <Section title="Missing Clock-outs" hint="Open sessions older than 16 hours">
        {missingClockOuts.length === 0 ? empty('All clock-outs accounted for.') : (
          <table className="table-base">
            <thead><tr><th>Date</th><th>Event</th><th>Staff</th><th>Clock In</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {missingClockOuts.map((s) => (
                <tr key={s.id}>
                  <td>{formatDate(s.workDate)}</td>
                  <td className="text-ink-600">{s.event.name}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={s.staff.fullName} src={s.staff.profileImageUrl} className="h-8 w-8 text-[10px]" />
                      <span>{s.staff.fullName}</span>
                    </div>
                  </td>
                  <td>{formatTime(s.clockInAt)}</td>
                  <td><StatusBadge status="MISSING_CLOCK_OUT" /></td>
                  <td><Link href={`/admin/attendance?status=OPEN`} className="text-brand-600 text-sm hover:underline">Adjust →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Old Open Sessions" hint="Open more than 12 hours but under 16h">
        {oldOpen.length === 0 ? empty('No old open sessions.') : (
          <table className="table-base">
            <thead><tr><th>Date</th><th>Event</th><th>Staff</th><th>Clock In</th></tr></thead>
            <tbody>
              {oldOpen.map((s) => (
                <tr key={s.id}>
                  <td>{formatDate(s.workDate)}</td><td className="text-ink-600">{s.event.name}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={s.staff.fullName} src={s.staff.profileImageUrl} className="h-8 w-8 text-[10px]" />
                      <span>{s.staff.fullName}</span>
                    </div>
                  </td><td>{formatTime(s.clockInAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Manual Adjusted Sessions (last 7 days)">
        {manualSessions.length === 0 ? empty('No manual adjustments in the last week.') : (
          <table className="table-base">
            <thead><tr><th>Date</th><th>Event</th><th>Staff</th><th>Updated</th><th>Notes</th></tr></thead>
            <tbody>
              {manualSessions.map((s) => (
                <tr key={s.id}>
                  <td>{formatDate(s.workDate)}</td><td>{s.event.name}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={s.staff.fullName} src={s.staff.profileImageUrl} className="h-8 w-8 text-[10px]" />
                      <span>{s.staff.fullName}</span>
                    </div>
                  </td><td className="text-ink-600">{formatDateTime(s.updatedAt)}</td>
                  <td className="text-ink-600">{s.adminNotes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Cancelled Sessions (last 7 days)">
        {cancelledSessions.length === 0 ? empty('No cancelled sessions.') : (
          <table className="table-base">
            <thead><tr><th>Date</th><th>Event</th><th>Staff</th><th>Updated</th></tr></thead>
            <tbody>
              {cancelledSessions.map((s) => (
                <tr key={s.id}><td>{formatDate(s.workDate)}</td><td>{s.event.name}</td><td><div className="flex items-center gap-2"><Avatar name={s.staff.fullName} src={s.staff.profileImageUrl} className="h-8 w-8 text-[10px]" /><span>{s.staff.fullName}</span></div></td><td className="text-ink-600">{formatDateTime(s.updatedAt)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Staff Without Bank Info">
        {staffMissingBank.length === 0 ? empty('All active staff have bank info.') : (
          <table className="table-base">
            <thead><tr><th>Pay Name</th><th>Full Name</th><th>Phone</th><th></th></tr></thead>
            <tbody>
              {staffMissingBank.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.payName}</td>
                  <td>{s.fullName}</td><td className="text-ink-600">{s.phoneDisplay || formatMalaysiaPhoneDisplay(s.phoneE164)}</td>
                  <td><Badge variant="amber">Missing Bank Info</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Duplicate Scan Attempts (last 7 days)">
        {duplicateScans.length === 0 ? empty('No duplicate scans logged.') : (
          <table className="table-base">
            <thead><tr><th>When</th><th>Event</th><th>Staff</th><th>Reason</th><th>IP</th></tr></thead>
            <tbody>
              {duplicateScans.map((l) => (
                <tr key={l.id}>
                  <td>{formatDateTime(l.createdAt)}</td>
                  <td className="text-ink-600">{l.event?.name || '—'}</td>
                  <td>{l.staff?.fullName || '—'}</td>
                  <td className="text-ink-600">{l.message || '—'}</td>
                  <td className="text-ink-500 text-xs">{l.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="px-5 py-3 border-b border-ink-200">
        <div className="font-semibold">{title}</div>
        {hint && <div className="text-xs text-ink-500">{hint}</div>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function empty(msg: string) {
  return <div className="p-6 text-sm text-ink-500 text-center">{msg}</div>;
}
