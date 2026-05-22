import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizePhone, normalizeAlias } from '@/lib/utils';
import { mytStartOfDay, mytEndOfDay } from '@/lib/time';

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
  if (!q) return NextResponse.json({ ok: false, error: 'Enter phone or alias' });

  const phone = normalizePhone(q);
  const alias = normalizeAlias(q);
  const staff = await prisma.staff.findFirst({
    where: { active: true, OR: [{ phone }, { alias }] },
  });

  if (!staff) {
    await prisma.scanLog.create({
      data: { eventId: event.id, action: 'LOOKUP', message: 'Staff not found', userAgent: req.headers.get('user-agent')?.slice(0, 250) },
    });
    return NextResponse.json({ ok: false, error: 'Staff not found. Check your phone number or alias.' });
  }

  const openSession = await prisma.attendanceSession.findFirst({
    where: { eventId: event.id, staffId: staff.id, status: 'OPEN', workDate: { gte: mytStartOfDay(now), lte: mytEndOfDay(now) } },
    select: { id: true, clockInAt: true },
  });

  return NextResponse.json({
    ok: true,
    staff: { id: staff.id, fullName: staff.fullName, payName: staff.payName, alias: staff.alias },
    openSession: openSession ? { id: openSession.id, clockInAt: openSession.clockInAt.toISOString() } : null,
  });
}
