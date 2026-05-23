import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mytStartOfDay, mytEndOfDay } from '@/lib/time';
import { getBooleanAppSetting, ALLOW_PENDING_CLOCK_IN_KEY } from '@/lib/app-settings';
import { normalizeAliasPanggilan, normalizeMalaysiaPhone } from '@/lib/staff';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const event = await prisma.workEvent.findUnique({ where: { scanToken: params.token }, include: { tenant: true } });
  if (!event || !event.active) {
    return NextResponse.json({ ok: false, error: 'Event not available' }, { status: 200 });
  }
  const now = new Date();
  if (event.workDate < mytStartOfDay(now) || event.workDate > mytEndOfDay(now)) {
    return NextResponse.json({ ok: false, error: 'Event is not on today’s date' }, { status: 200 });
  }

  const body = await req.json().catch(() => ({}));
  const q = String(body?.q || '').trim();
  if (!q) return NextResponse.json({ ok: false, error: 'Enter phone, email, or alias' });

  const phoneE164 = normalizeMalaysiaPhone(q);
  const aliasPanggilan = normalizeAliasPanggilan(q);
  const email = q.toLowerCase();

  const staff = await prisma.staff.findFirst({
    where: {
      active: true,
      OR: [
        ...(phoneE164 ? [{ phoneE164 }] : []),
        { aliasPanggilan },
        { email: { equals: email, mode: 'insensitive' } },
      ],
    },
  });

  if (!staff) {
    await prisma.scanLog.create({
      data: { tenantId: event.tenantId, eventId: event.id, action: 'LOOKUP', message: 'Part-timer not found', userAgent: req.headers.get('user-agent')?.slice(0, 250) },
    });
    return NextResponse.json({ ok: false, error: 'Part-timer not found. Check your phone number, email, or alias.' });
  }

  const allowPendingClockIn = await getBooleanAppSetting(ALLOW_PENDING_CLOCK_IN_KEY, false);
  const tenantApproval = await prisma.tenantPartTimerApproval.findUnique({
    where: { tenantId_partTimerId: { tenantId: event.tenantId, partTimerId: staff.id } },
    select: { status: true },
  });

  const openSession = await prisma.attendanceSession.findFirst({
    where: { eventId: event.id, staffId: staff.id, status: 'OPEN', workDate: { gte: mytStartOfDay(now), lte: mytEndOfDay(now) } },
    select: { id: true, clockInAt: true },
  });

  const warning = staff.status === 'PENDING_REVIEW'
    ? 'Your profile is pending admin approval.'
    : staff.status === 'REJECTED' || staff.status === 'SUSPENDED'
      ? 'Your profile is not currently allowed to clock in. Please contact admin.'
      : tenantApproval?.status === 'BLOCKED'
        ? `This part-timer is blocked for ${event.tenant.name}. Please contact admin.`
        : tenantApproval?.status === 'PENDING'
          ? `This part-timer is pending approval for ${event.tenant.name}.`
      : null;

  const canClockIn = (
    staff.status === 'ACTIVE' || (staff.status === 'PENDING_REVIEW' && allowPendingClockIn)
  ) && tenantApproval?.status !== 'BLOCKED' && tenantApproval?.status !== 'PENDING';

  return NextResponse.json({
    ok: true,
    staff: {
      id: staff.id,
      fullName: staff.fullName,
      payName: staff.payName,
      aliasPanggilan: staff.aliasPanggilan,
      approvalStatus: staff.approvalStatus,
      status: staff.status,
      profileImageUrl: staff.profileImageUrl,
    },
    openSession: openSession ? { id: openSession.id, clockInAt: openSession.clockInAt.toISOString() } : null,
    canClockIn,
    warning,
  });
}
