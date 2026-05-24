'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/auth';
import { recalc } from '@/lib/calc';
import { parseDateInput, parseTimeOnDate } from '@/lib/time';
import { parseRateInputToCents } from '@/lib/money';

const schema = z.object({
  id: z.string(),
  clockInDate: z.string(),
  clockInTime: z.string(),
  clockOutDate: z.string().optional(),
  clockOutTime: z.string().optional(),
  breakDeductHours: z.string().optional(),
  breakOverridden: z.coerce.boolean().optional(),
  hourlyRate: z.string().optional(),
  adminNotes: z.string().optional().nullable(),
  reason: z.string().min(1, 'Reason required'),
  cancel: z.coerce.boolean().optional(),
});

export type AdjustState = { ok: boolean; error?: string };

export async function adjustAttendance(_: AdjustState, fd: FormData): Promise<AdjustState> {
  const session = await requireAdminSession();
  const data = {
    id: fd.get('id') as string,
    clockInDate: (fd.get('clockInDate') as string) || '',
    clockInTime: (fd.get('clockInTime') as string) || '',
    clockOutDate: (fd.get('clockOutDate') as string) || '',
    clockOutTime: (fd.get('clockOutTime') as string) || '',
    breakDeductHours: (fd.get('breakDeductHours') as string) || '',
    breakOverridden: fd.get('breakOverridden') === 'on' || fd.get('breakOverridden') === 'true',
    hourlyRate: (fd.get('hourlyRate') as string) || '',
    adminNotes: (fd.get('adminNotes') as string) || null,
    reason: (fd.get('reason') as string) || '',
    cancel: fd.get('cancel') === 'true',
  };
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
  const v = parsed.data;

  const sess = await prisma.attendanceSession.findUnique({ where: { id: v.id }, include: { event: true } });
  if (!sess) return { ok: false, error: 'Session not found' };
  const before = serialize(sess);

  if (v.cancel) {
    await prisma.attendanceSession.update({
      where: { id: v.id },
      data: { status: 'CANCELLED', adminNotes: v.adminNotes ?? sess.adminNotes },
    });
    await audit(v.id, legacyAdminIdForSession(session.sub), v.reason, before, { ...before, status: 'CANCELLED' });
    revalidatePath('/admin/attendance');
    revalidatePath('/admin/reports/exceptions');
    return { ok: true };
  }

  const dateBase = parseDateInput(v.clockInDate);
  const clockInAt = parseTimeOnDate(dateBase, v.clockInTime);
  const clockOutAt =
    v.clockOutDate && v.clockOutTime
      ? parseTimeOnDate(parseDateInput(v.clockOutDate), v.clockOutTime)
      : null;

  if (clockOutAt && clockOutAt < clockInAt) {
    return { ok: false, error: 'Clock out must be after clock in.' };
  }

  const breakOverridden = !!v.breakOverridden;
  const breakDeductOverrideMinutes = breakOverridden && v.breakDeductHours
    ? Math.max(0, Math.round(Number(v.breakDeductHours) * 60))
    : null;
  const hourlyRateSnapshotCents = v.hourlyRate
    ? parseRateInputToCents(v.hourlyRate)
    : sess.hourlyRateSnapshotCents;

  const r = recalc({
    clockInAt, clockOutAt,
    breakOverridden,
    breakDeductOverrideMinutes,
    hourlyRateSnapshotCents,
    autoBreakRule: sess.event.autoBreakRule,
  });

  const updated = await prisma.attendanceSession.update({
    where: { id: v.id },
    data: {
      clockInAt, clockOutAt,
      grossMinutes: r.grossMinutes,
      breakDeductMinutes: r.breakDeductMinutes,
      payableMinutes: r.payableMinutes,
      totalPayCents: r.totalPayCents,
      hourlyRateSnapshotCents,
      breakOverridden,
      adminNotes: v.adminNotes,
      status: clockOutAt ? 'MANUAL_ADJUSTED' : sess.status,
      workDate: parseDateInput(v.clockInDate),
    },
  });
  await audit(v.id, legacyAdminIdForSession(session.sub), v.reason, before, serialize(updated));
  revalidatePath('/admin/attendance');
  revalidatePath('/admin/reports/exceptions');
  revalidatePath('/admin/reports/weekly-payroll');
  revalidatePath('/admin/reports/daily');
  return { ok: true };
}

function serialize(s: any) {
  return {
    clockInAt: s.clockInAt?.toISOString?.() ?? s.clockInAt,
    clockOutAt: s.clockOutAt?.toISOString?.() ?? s.clockOutAt,
    grossMinutes: s.grossMinutes,
    breakDeductMinutes: s.breakDeductMinutes,
    payableMinutes: s.payableMinutes,
    totalPayCents: s.totalPayCents,
    hourlyRateSnapshotCents: s.hourlyRateSnapshotCents,
    status: s.status,
    adminNotes: s.adminNotes,
  };
}

async function audit(sessionId: string, adminId: string, reason: string, before: any, after: any) {
  await prisma.attendanceAdjustmentAudit.create({
    data: { sessionId, adminId, reason, beforeJson: before, afterJson: after },
  });
}

function legacyAdminIdForSession(userId: string): string {
  return userId.startsWith('user_admin_') ? userId.slice('user_admin_'.length) : userId;
}
