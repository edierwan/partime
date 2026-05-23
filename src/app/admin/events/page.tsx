import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/Badge';
import { formatDate } from '@/lib/time';
import { formatMYR } from '@/lib/money';
import { mytStartOfDay, mytEndOfDay } from '@/lib/time';
import { EventClient, EventToggle } from './EventClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EventsPage(
  props: { searchParams: Promise<{ q?: string; status?: string; selected?: string }> }
) {
  const searchParams = await props.searchParams;
  const q = (searchParams.q || '').trim();
  const status = searchParams.status || 'all';
  const where: any = {};
  if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { location: { contains: q, mode: 'insensitive' } }];
  if (status === 'active')   where.active = true;
  if (status === 'inactive') where.active = false;

  const now = new Date();
  const [events, tenants, activeCnt, upcomingCnt, rateAgg] = await Promise.all([
    prisma.workEvent.findMany({ where, include: { tenant: { select: { id: true, name: true } } }, orderBy: { workDate: 'desc' }, take: 100 }),
    prisma.tenant.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.workEvent.count({ where: { active: true } }),
    prisma.workEvent.count({ where: { active: true, workDate: { gt: mytEndOfDay(now) } } }),
    prisma.workEvent.aggregate({ _avg: { defaultRateCents: true } }),
  ]);

  const selected =
    (searchParams.selected && events.find((e) => e.id === searchParams.selected)) || events[0] || null;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="sectiontitle">Events &amp; QR</h1>
          <p className="subtitle">Create attendance sessions and generate public QR codes.</p>
        </div>
        <EventClient mode="addButton" tenants={tenants} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Events"   value={activeCnt}                                       icon="📅" accent="green" />
        <StatCard label="Upcoming Events" value={upcomingCnt}                                     icon="⏭"  accent="amber" />
        <StatCard label="Total Events"    value={events.length}                                   icon="📊" accent="blue" />
        <StatCard label="Avg Rate"        value={formatMYR(Math.round(rateAgg._avg.defaultRateCents || 0))} icon="💼" accent="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="p-4 flex flex-wrap gap-3 items-center border-b border-ink-200">
            <form className="flex-1 min-w-[220px]" action="/admin/events" method="get">
              {status !== 'all' && <input type="hidden" name="status" value={status} />}
              <input className="input" name="q" defaultValue={q} placeholder="Search events…" />
            </form>
            <div className="flex gap-2">
              {(['all', 'active', 'inactive'] as const).map((s) => (
                <Link key={s}
                  href={`/admin/events${s !== 'all' ? `?status=${s}` : ''}`}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border ${ (status === s || (s === 'all' && status === 'all')) ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-white border-ink-200 text-ink-700 hover:bg-ink-50'}`}
                >{s[0].toUpperCase() + s.slice(1)}</Link>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>Event Name</th><th>Employer</th><th>Location</th><th>Date</th><th>Hourly Rate</th><th>Status</th><th>Active</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {events.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-ink-500">No events yet.</td></tr>
                )}
                {events.map((e) => (
                  <tr key={e.id} className={selected?.id === e.id ? 'bg-brand-50/40' : ''}>
                    <td className="font-medium">
                      <Link href={`/admin/events?selected=${e.id}`} className="hover:underline">{e.name}</Link>
                    </td>
                    <td className="text-ink-600">{e.tenant.name}</td>
                    <td className="text-ink-600">{e.location}</td>
                    <td>{formatDate(e.workDate)}</td>
                    <td>{formatMYR(e.defaultRateCents)}</td>
                    <td><StatusBadge status={e.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                    <td><EventToggle id={e.id} active={e.active} /></td>
                    <td className="text-right">
                      <EventClient mode="row" tenants={tenants} event={{
                        id: e.id, tenantId: e.tenantId, name: e.name, location: e.location, workDate: e.workDate,
                        defaultRateCents: e.defaultRateCents, autoBreakRule: e.autoBreakRule,
                        active: e.active, notes: e.notes,
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="card card-pad space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">QR Preview</div>
              <StatusBadge status={selected.active ? 'ACTIVE' : 'INACTIVE'} />
            </div>
            <div>
              <div className="text-lg font-semibold">{selected.name}</div>
              <div className="text-sm text-ink-500">Employer: {selected.tenant.name}</div>
              <div className="text-sm text-ink-500">{selected.location}</div>
              <div className="text-sm text-ink-500">{formatDate(selected.workDate)}</div>
              <div className="text-sm text-ink-500 mt-1">Default Rate: {formatMYR(selected.defaultRateCents)}</div>
            </div>
            <div className="text-xs text-ink-500 break-all">
              Scan URL: <code className="text-ink-700">{`${process.env.NEXT_PUBLIC_APP_URL || ''}/scan/${selected.scanToken}`}</code>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/events/${selected.id}/qr`} className="btn-primary flex-1">View / Print QR</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
