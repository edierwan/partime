'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth';
import { ALLOW_PENDING_CLOCK_IN_KEY, setBooleanAppSetting } from '@/lib/app-settings';

export async function saveScanSettings(fd: FormData) {
  await requireAdminSession();
  const allowPendingClockIn = fd.get('allowPendingClockIn') === 'on' || fd.get('allowPendingClockIn') === 'true';
  await setBooleanAppSetting(ALLOW_PENDING_CLOCK_IN_KEY, allowPendingClockIn);
  revalidatePath('/admin/settings');
}