'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { deleteStoredProfileImage, saveStaffProfileImage } from '@/lib/uploads';
import { parseStaffProfileForm } from '@/lib/staff-profile';

export type StaffFormState = { ok: boolean; error?: string; fieldErrors?: Record<string, string> };

export async function saveStaff(_: StaffFormState, fd: FormData): Promise<StaffFormState> {
  await requireSession();

  const parsed = await parseStaffProfileForm(fd, { defaultApprovalStatus: 'APPROVED', defaultActive: true });
  if (!parsed.ok) return parsed;

  const value = parsed.data;

  try {
    const existing = value.id
      ? await prisma.staff.findUnique({
          where: { id: value.id },
          select: { id: true, profileImageKey: true },
        })
      : null;

    const saved = value.id
      ? await prisma.staff.update({
          where: { id: value.id },
          data: {
            payName: value.payName,
            aliasPanggilan: value.aliasPanggilan,
            fullName: value.fullName,
            icNumberNormalized: value.icNumberNormalized,
            icNumberDisplay: value.icNumberDisplay,
            gender: value.gender,
            phoneE164: value.phoneE164,
            phoneDisplay: value.phoneDisplay,
            email: value.email,
            bankCode: value.bankCode,
            bankName: value.bankName,
            customBankName: value.customBankName,
            bankAccountNumber: value.bankAccountNumber,
            approvalStatus: value.approvalStatus,
            active: value.active,
            notes: value.notes,
          },
          select: { id: true, profileImageKey: true },
        })
      : await prisma.staff.create({
        data: {
          payName: value.payName,
          aliasPanggilan: value.aliasPanggilan,
          fullName: value.fullName,
          icNumberNormalized: value.icNumberNormalized,
          icNumberDisplay: value.icNumberDisplay,
          gender: value.gender,
          phoneE164: value.phoneE164,
          phoneDisplay: value.phoneDisplay,
          email: value.email,
          bankCode: value.bankCode,
          bankName: value.bankName,
          customBankName: value.customBankName,
          bankAccountNumber: value.bankAccountNumber,
          approvalStatus: value.approvalStatus,
          active: value.active,
          notes: value.notes,
        },
        select: { id: true, profileImageKey: true },
      });

    if (value.profileImage) {
      try {
        const uploaded = await saveStaffProfileImage({ staffId: saved.id, file: value.profileImage });
        await prisma.staff.update({
          where: { id: saved.id },
          data: {
            profileImageKey: uploaded.key,
            profileImageUrl: uploaded.url,
          },
        });
        if (existing?.profileImageKey) {
          await deleteStoredProfileImage(existing.profileImageKey);
        }
      } catch (error) {
        if (!value.id) {
          await prisma.staff.delete({ where: { id: saved.id } }).catch(() => undefined);
        }
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Profile image upload failed',
          fieldErrors: { profileImage: error instanceof Error ? error.message : 'Profile image upload failed' },
        };
      }
    } else if (value.removeProfileImage && existing?.profileImageKey) {
      await prisma.staff.update({
        where: { id: saved.id },
        data: {
          profileImageKey: null,
          profileImageUrl: null,
        },
      });
      await deleteStoredProfileImage(existing.profileImageKey);
    }
  } catch (e: any) {
    if (String(e.code) === 'P2002') {
      const target = String(e.meta?.target || '');
      if (target.includes('alias')) return { ok: false, error: 'Alias already exists' };
      if (target.includes('phone')) return { ok: false, error: 'Phone number already exists' };
      if (target.includes('email')) return { ok: false, error: 'Email already exists' };
      if (target.includes('icNumberNormalized')) return { ok: false, error: 'IC number already exists' };
      return { ok: false, error: 'Duplicate value' };
    }
    return { ok: false, error: 'Save failed' };
  }
  revalidatePath('/admin/staff');
  revalidatePath('/admin/attendance');
  revalidatePath('/admin/reports/daily');
  revalidatePath('/admin/reports/weekly-payroll');
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

export async function setStaffApprovalStatus(id: string, approvalStatus: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED') {
  await requireSession();
  await prisma.staff.update({ where: { id }, data: { approvalStatus } });
  revalidatePath('/admin/staff');
  revalidatePath('/admin/attendance');
}
