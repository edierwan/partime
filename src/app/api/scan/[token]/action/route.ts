import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mytStartOfDay, mytEndOfDay } from '@/lib/time';
import { recalc } from '@/lib/calc';
import { ALLOW_PENDING_CLOCK_IN_KEY, getBooleanAppSetting } from '@/lib/app-settings';

export const dynamic = 'force-dynamic';

function clientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

export async function POST(req: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const event = await prisma.workEvent.findUnique({ where: { scanToken: params.token } });
  if (!event || !event.active) {
    return NextResponse.json({ ok: false, error: 'Event not available' });
  }
  const now = new Date();
  if (event.workDate < mytStartOfDay(now) || event.workDate > mytEndOfDay(now)) {
    return NextResponse.json({ ok: false, error: 'Event is not on today’s date' });
  }

  const body = await req.json().catch(() => ({}));
  const staffId = String(body?.staffId || '');
  const action = String(body?.action || '');
  const lat = typeof body?.lat === 'number' ? body.lat : null;
  const lng = typeof body?.lng === 'number' ? body.lng : null;
  const ip = clientIp(req);
  const userAgent = req.headers.get('user-agent')?.slice(0, 250) || null;

  if (!staffId || !['CLOCK_IN', 'CLOCK_OUT'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'Invalid request' });
  }

  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff || !staff.active) return NextResponse.json({ ok: false, error: 'Part-timer not found' });

  const allowPendingClockIn = await getBooleanAppSetting(ALLOW_PENDING_CLOCK_IN_KEY, false);
  if (action === 'CLOCK_IN') {
    const tenantApproval = await prisma.tenantPartTimerApproval.findUnique({
      where: { tenantId_partTimerId: { tenantId: event.tenantId, partTimerId: staff.id } },
      select: { status: true },
    });
    if (staff.status === 'REJECTED' || staff.status === 'SUSPENDED') {
      await prisma.scanLog.create({
        data: { tenantId: event.tenantId, eventId: event.id, staffId: staff.id, action: 'BLOCKED', ip, userAgent, lat, lng, message: 'Part-timer rejected or suspended' },
      });
      return NextResponse.json({ ok: false, error: 'Your profile is not currently allowed to clock in. Please contact admin.' });
    }
    if (staff.status === 'PENDING_REVIEW' && !allowPendingClockIn) {
      await prisma.scanLog.create({
        data: { tenantId: event.tenantId, eventId: event.id, staffId: staff.id, action: 'BLOCKED', ip, userAgent, lat, lng, message: 'Pending review part-timer blocked from clock-in' },
      });
      return NextResponse.json({ ok: false, error: 'Your registration is pending review. You can clock in after admin approval.' });
    }
    if (tenantApproval?.status === 'BLOCKED' || tenantApproval?.status === 'PENDING') {
      await prisma.scanLog.create({
        data: { tenantId: event.tenantId, eventId: event.id, staffId: staff.id, action: 'BLOCKED', ip, userAgent, lat, lng, message: `Tenant approval ${tenantApproval.status}` },
      });
      return NextResponse.json({ ok: false, error: 'Your profile is not approved for this employer yet.' });
    }
  }

  const workDate = mytStartOfDay(now);
  const dayEnd = mytEndOfDay(now);

  if (action === 'CLOCK_IN') {
    const existing = await prisma.attendanceSession.findFirst({
      where: { eventId: event.id, staffId: staff.id, workDate: { gte: workDate, lte: dayEnd } },
    });
    if (existing) {
      await prisma.scanLog.create({
        data: { tenantId: event.tenantId, eventId: event.id, staffId: staff.id, action: 'DUPLICATE', ip, userAgent, lat, lng,
                message: existing.status === 'OPEN' ? 'Already clocked in' : 'Already completed today' },
      });
      return NextResponse.json({
        ok: false,
        error: existing.status === 'OPEN' ? 'You are already clocked in. Tap Clock Out instead.' : 'You have already completed attendance for today.',
      });
    }

    const session = await prisma.attendanceSession.create({
      data: {
        eventId: event.id, staffId: staff.id, workDate,
        tenantId: event.tenantId,
        clockInAt: now, hourlyRateSnapshotCents: event.defaultRateCents,
        status: 'OPEN',
      },
    });
    await prisma.scanLog.create({
      data: { tenantId: event.tenantId, eventId: event.id, staffId: staff.id, action: 'CLOCK_IN', ip, userAgent, lat, lng },
    });
    return NextResponse.json({
      ok: true, action: 'CLOCK_IN',
      data: { clockInAt: session.clockInAt.toISOString() },
    });
  }

  // CLOCK_OUT
  const session = await prisma.attendanceSession.findFirst({
    where: { eventId: event.id, staffId: staff.id, status: 'OPEN', workDate: { gte: workDate, lte: dayEnd } },
  });
  if (!session) {
    await prisma.scanLog.create({
      data: { tenantId: event.tenantId, eventId: event.id, staffId: staff.id, action: 'BLOCKED', ip, userAgent, message: 'No open session' },
    });
    return NextResponse.json({ ok: false, error: 'No open session to clock out.' });
  }

  const r = recalc({
    clockInAt: session.clockInAt,
    clockOutAt: now,
    breakOverridden: false,
    breakDeductOverrideMinutes: null,
    hourlyRateSnapshotCents: session.hourlyRateSnapshotCents,
    autoBreakRule: event.autoBreakRule,
  });

  const updated = await prisma.attendanceSession.update({
    where: { id: session.id },
    data: {
      clockOutAt: now,
      grossMinutes: r.grossMinutes,
      breakDeductMinutes: r.breakDeductMinutes,
      payableMinutes: r.payableMinutes,
      totalPayCents: r.totalPayCents,
      status: 'COMPLETED',
    },
  });
  await prisma.scanLog.create({
    data: { tenantId: event.tenantId, eventId: event.id, staffId: staff.id, action: 'CLOCK_OUT', ip, userAgent, lat, lng },
  });

  return NextResponse.json({
    ok: true, action: 'CLOCK_OUT',
    data: {
      clockInAt: updated.clockInAt.toISOString(),
      clockOutAt: updated.clockOutAt!.toISOString(),
      grossMinutes: updated.grossMinutes,
      breakDeductMinutes: updated.breakDeductMinutes,
      payableMinutes: updated.payableMinutes,
      totalPayCents: updated.totalPayCents,
    },
  });
}
