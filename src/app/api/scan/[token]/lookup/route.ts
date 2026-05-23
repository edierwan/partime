import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mytStartOfDay, mytEndOfDay } from '@/lib/time';
import { getBooleanAppSetting, ALLOW_PENDING_CLOCK_IN_KEY } from '@/lib/app-settings';
import { normalizeAliasPanggilan, normalizeMalaysiaPhone } from '@/lib/staff';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const event = await prisma.workEvent.findUnique({ where: { scanToken: params.token } });
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
      data: { eventId: event.id, action: 'LOOKUP', message: 'Staff not found', userAgent: req.headers.get('user-agent')?.slice(0, 250) },
    });
    return NextResponse.json({ ok: false, error: 'Staff not found. Check your phone number, email, or alias.' });
  }

  const allowPendingClockIn = await getBooleanAppSetting(ALLOW_PENDING_CLOCK_IN_KEY, false);

  const openSession = await prisma.attendanceSession.findFirst({
    where: { eventId: event.id, staffId: staff.id, status: 'OPEN', workDate: { gte: mytStartOfDay(now), lte: mytEndOfDay(now) } },
    select: { id: true, clockInAt: true },
  });

  const warning = staff.approvalStatus === 'PENDING_REVIEW'
    ? 'Your registration is pending admin review. Clock-in stays blocked until approval unless admin has enabled pending access.'
    : staff.approvalStatus === 'REJECTED'
      ? 'Your registration is currently rejected. Please contact admin.'
      : null;

  return NextResponse.json({
    ok: true,
    staff: {
      id: staff.id,
      fullName: staff.fullName,
      payName: staff.payName,
      aliasPanggilan: staff.aliasPanggilan,
      approvalStatus: staff.approvalStatus,
      profileImageUrl: staff.profileImageUrl,
    },
    openSession: openSession ? { id: openSession.id, clockInAt: openSession.clockInAt.toISOString() } : null,
    canClockIn: staff.approvalStatus === 'APPROVED' || allowPendingClockIn,
    warning,
  });
}
