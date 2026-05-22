'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { normalizeAlias, normalizePhone } from '@/lib/utils';
import { parseRateInputToCents } from '@/lib/money';

const schema = z.object({
  id: z.string().optional(),
  payName: z.string().min(1, 'Pay name required'),
  alias: z.string().min(2, 'Alias too short'),
  fullName: z.string().min(1, 'Full name required'),
  phone: z.string().min(7, 'Phone too short'),
  bankName: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  hourlyRate: z.string().optional(),
  active: z.coerce.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export type StaffFormState = { ok: boolean; error?: string; fieldErrors?: Record<string, string> };

export async function saveStaff(_: StaffFormState, fd: FormData): Promise<StaffFormState> {
  await requireSession();

  const data = {
    id: (fd.get('id') as string) || undefined,
    payName: (fd.get('payName') as string) || '',
    alias: normalizeAlias((fd.get('alias') as string) || ''),
    fullName: (fd.get('fullName') as string) || '',
    phone: normalizePhone((fd.get('phone') as string) || ''),
    bankName: (fd.get('bankName') as string) || null,
    bankAccount: (fd.get('bankAccount') as string) || null,
    hourlyRate: (fd.get('hourlyRate') as string) || '0',
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
  const hourlyRateCents = parseRateInputToCents(v.hourlyRate || '0');

  try {
    if (v.id) {
      await prisma.staff.update({
        where: { id: v.id },
        data: {
          payName: v.payName, alias: v.alias, fullName: v.fullName, phone: v.phone,
          bankName: v.bankName || null, bankAccount: v.bankAccount || null,
          hourlyRateCents, active: !!v.active, notes: v.notes || null,
        },
      });
    } else {
      await prisma.staff.create({
        data: {
          payName: v.payName, alias: v.alias, fullName: v.fullName, phone: v.phone,
          bankName: v.bankName || null, bankAccount: v.bankAccount || null,
          hourlyRateCents, active: v.active ?? true, notes: v.notes || null,
        },
      });
    }
  } catch (e: any) {
    if (String(e.code) === 'P2002') {
      const target = String(e.meta?.target || '');
      return { ok: false, error: target.includes('alias') ? 'Alias already exists' : target.includes('phone') ? 'Phone already exists' : 'Duplicate value' };
    }
    return { ok: false, error: 'Save failed' };
  }
  revalidatePath('/admin/staff');
  revalidatePath('/admin');
  return { ok: true };
}

export async function deactivateStaff(id: string) {
  await requireSession();
  await prisma.staff.update({ where: { id }, data: { active: false } });
  revalidatePath('/admin/staff');
}

export async function activateStaff(id: string) {
  await requireSession();
  await prisma.staff.update({ where: { id }, data: { active: true } });
  revalidatePath('/admin/staff');
}
