'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { normalizeMalaysiaPhone } from '@/lib/staff';
import { savePartTimerPortfolioMedia } from '@/lib/uploads';

export async function uploadPortfolioMedia(formData: FormData) {
  const phone = normalizeMalaysiaPhone(String(formData.get('phone') || ''));
  if (!phone) redirect('/part-timer/portfolio?error=invalid-phone');
  const partTimer = await prisma.staff.findUnique({ where: { phoneE164: phone }, select: { id: true } });
  if (!partTimer) redirect(`/register/part-timer?phone=${encodeURIComponent(phone)}`);
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) redirect(`/part-timer/portfolio?phone=${encodeURIComponent(phone)}&error=file-required`);
  try {
    const saved = await savePartTimerPortfolioMedia({ partTimerId: partTimer.id, file });
    await prisma.partTimerPortfolioMedia.create({
      data: {
        partTimerId: partTimer.id,
        mediaType: saved.mediaType,
        title: String(formData.get('title') || '').trim() || null,
        description: String(formData.get('description') || '').trim() || null,
        url: saved.url,
        key: saved.key,
        filename: saved.filename,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'upload-failed';
    redirect(`/part-timer/portfolio?phone=${encodeURIComponent(phone)}&error=${encodeURIComponent(message)}`);
  }
  revalidatePath('/part-timer/portfolio');
  redirect(`/part-timer/portfolio?phone=${encodeURIComponent(phone)}&uploaded=1`);
}