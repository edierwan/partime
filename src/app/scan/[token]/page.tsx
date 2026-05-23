import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { mytStartOfDay, mytEndOfDay, formatDate } from '@/lib/time';
import { formatMYR } from '@/lib/money';
import { ScanClient } from './ScanClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ScanPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const event = await prisma.workEvent.findUnique({ where: { scanToken: params.token } });
  if (!event) notFound();

  const now = new Date();
  const inactive = !event.active;
  const isToday = event.workDate >= mytStartOfDay(now) && event.workDate <= mytEndOfDay(now);

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="max-w-md mx-auto p-4 pb-10">
        <div className="flex items-center gap-2 py-3">
          <span className="h-7 w-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold">P</span>
          <span className="text-base font-semibold">Partime</span>
        </div>

        <div className="card card-pad mb-4">
          <div className="text-xs text-ink-500 mb-1">📅 Event</div>
          <div className="text-lg font-semibold">{event.name}</div>
          <div className="text-sm text-ink-600">📍 {event.location}</div>
          <div className="text-sm text-ink-600">🗓 {formatDate(event.workDate)}</div>
          <div className="text-sm text-emerald-700 font-medium mt-1">
            Hourly Rate: {formatMYR(event.defaultRateCents)}
          </div>
        </div>

        {inactive ? (
          <div className="card card-pad text-center">
            <div className="text-rose-600 font-semibold">Event is not active.</div>
            <div className="text-sm text-ink-500 mt-1">Please contact your admin.</div>
          </div>
        ) : !isToday ? (
          <div className="card card-pad text-center">
            <div className="text-amber-700 font-semibold">This QR is for {formatDate(event.workDate)}.</div>
            <div className="text-sm text-ink-500 mt-1">Attendance can only be recorded on the event date.</div>
          </div>
        ) : (
          <ScanClient token={event.scanToken} eventName={event.name} />
        )}

        <p className="text-xs text-ink-500 text-center mt-6">
          ⓘ Break is auto-deducted based on company policy.
        </p>
      </div>
    </div>
  );
}
