'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdminSession } from '@/lib/auth';

export async function approveEmployerRegistration(id: string) {
  await requireAdminSession();
  const registration = await prisma.employerRegistration.update({
    where: { id },
    data: { status: 'APPROVED', rejectionReason: null },
    select: { tenantId: true },
  });
  if (registration.tenantId) {
    await prisma.tenant.update({ where: { id: registration.tenantId }, data: { status: 'ACTIVE' } });
  }
  revalidatePath('/admin/employers');
}

export async function rejectEmployerRegistration(id: string, reason?: string) {
  await requireAdminSession();
  const registration = await prisma.employerRegistration.update({
    where: { id },
    data: { status: 'REJECTED', rejectionReason: reason || null },
    select: { tenantId: true },
  });
  if (registration.tenantId) {
    await prisma.tenant.update({ where: { id: registration.tenantId }, data: { status: 'REJECTED' } });
  }
  revalidatePath('/admin/employers');
}