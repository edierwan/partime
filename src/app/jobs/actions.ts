'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { normalizeMalaysiaPhone } from '@/lib/staff';
import { jobPublicHref } from '@/lib/marketplace';

export async function registerJobInterest(formData: FormData) {
  const jobId = String(formData.get('jobId') || '');
  const phone = normalizeMalaysiaPhone(String(formData.get('phone') || ''));
  const note = String(formData.get('note') || '').trim().slice(0, 500);
  const job = await prisma.workEvent.findUnique({ where: { id: jobId }, select: { id: true, slug: true, active: true, publicVisible: true, jobStatus: true } });
  if (!job || !job.active || !job.publicVisible) redirect('/jobs?interest=job-unavailable');
  const href = jobPublicHref(job);
  if (!phone) redirect(`${href}?interest=invalid-phone`);

  const partTimer = await prisma.staff.findUnique({ where: { phoneE164: phone }, select: { id: true } });
  if (!partTimer) redirect(`/register/part-timer?phone=${encodeURIComponent(phone)}&job=${encodeURIComponent(job.id)}`);

  await prisma.jobInterest.upsert({
    where: { jobId_partTimerId: { jobId: job.id, partTimerId: partTimer.id } },
    update: { status: 'INTERESTED', note: note || null },
    create: { jobId: job.id, partTimerId: partTimer.id, note: note || null },
  });
  redirect(`${href}?interest=registered`);
}