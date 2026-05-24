'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/auth';
import { generateScanToken } from '@/lib/token';
import { parseRateInputToCents } from '@/lib/money';
import { parseDateInput } from '@/lib/time';
import { currentAdminTenantId } from '@/lib/tenant';

const schema = z.object({
  id: z.string().optional(),
  tenantId: z.string().optional(),
  name: z.string().min(1),
  location: z.string().min(1),
  workDate: z.string().min(8),
  defaultRate: z.string().optional(),
  autoBreakRule: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export type EventFormState = { ok: boolean; error?: string; fieldErrors?: Record<string, string> };

export async function saveEvent(_: EventFormState, fd: FormData): Promise<EventFormState> {
  await requireAdminSession();
  const data = {
    id: (fd.get('id') as string) || undefined,
    tenantId: (fd.get('tenantId') as string) || undefined,
    name: (fd.get('name') as string) || '',
    location: (fd.get('location') as string) || '',
    workDate: (fd.get('workDate') as string) || '',
    defaultRate: (fd.get('defaultRate') as string) || '0',
    autoBreakRule: fd.get('autoBreakRule') === 'on' || fd.get('autoBreakRule') === 'true',
    active: fd.get('active') === 'on' || fd.get('active') === 'true',
    notes: (fd.get('notes') as string) || null,
  };
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.errors.forEach((e) => { if (e.path[0]) fieldErrors[String(e.path[0])] = e.message; });
    return { ok: false, error: 'Invalid input', fieldErrors };
  }
  const v = parsed.data;
  const workDate = parseDateInput(v.workDate);
  const defaultRateCents = parseRateInputToCents(v.defaultRate || '0');
  const tenantId = v.tenantId || await currentAdminTenantId();
  if (!tenantId) return { ok: false, error: 'No tenant context available' };

  if (v.id) {
    await prisma.$transaction([
      prisma.workEvent.update({
        where: { id: v.id },
        data: {
          tenantId, name: v.name, location: v.location, workDate, defaultRateCents,
          autoBreakRule: v.autoBreakRule ?? true, active: v.active ?? true, notes: v.notes || null,
        },
      }),
      prisma.attendanceSession.updateMany({ where: { eventId: v.id }, data: { tenantId } }),
      prisma.scanLog.updateMany({ where: { eventId: v.id }, data: { tenantId } }),
    ]);
  } else {
    await prisma.workEvent.create({
      data: {
        name: v.name, location: v.location, workDate, defaultRateCents,
        autoBreakRule: v.autoBreakRule ?? true, active: v.active ?? true, notes: v.notes || null,
        tenantId,
        scanToken: generateScanToken(),
      },
    });
  }
  revalidatePath('/admin/events');
  revalidatePath('/admin');
  return { ok: true };
}

export async function setEventActive(id: string, active: boolean) {
  await requireAdminSession();
  await prisma.workEvent.update({ where: { id }, data: { active } });
  revalidatePath('/admin/events');
}
