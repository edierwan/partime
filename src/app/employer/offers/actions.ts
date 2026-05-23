'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { defaultOfferMessage } from '@/lib/offer-messages';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function sendJobOffer(formData: FormData) {
  const session = await requireSession();
  const jobId = String(formData.get('jobId') || '');
  const selectedIds = Array.from(new Set(formData.getAll('partTimerId').map(String).filter(Boolean)));
  if (!jobId || selectedIds.length === 0) redirect('/employer/offers?error=missing-recipients');

  const [job, partTimers] = await Promise.all([
    prisma.workEvent.findUnique({ where: { id: jobId }, include: { tenant: true } }),
    prisma.staff.findMany({ where: { id: { in: selectedIds }, active: true, status: 'ACTIVE' }, orderBy: { fullName: 'asc' } }),
  ]);
  if (!job) redirect('/employer/offers?error=job-not-found');
  if (partTimers.length === 0) redirect(`/employer/jobs/${jobId}?error=no-active-recipients`);

  const title = String(formData.get('title') || '').trim() || `Offer: ${job.name}`;
  const messageTemplate = String(formData.get('message') || '').trim() || defaultOfferMessage(job);
  const providerTenant = process.env.BAILEYS_TENANT || 'partime';

  const offer = await prisma.jobOffer.create({
    data: {
      tenantId: job.tenantId,
      jobId: job.id,
      title,
      message: messageTemplate,
      status: 'DRAFT',
      createdByEmail: session.email,
      recipients: { create: partTimers.map((partTimer) => ({ partTimerId: partTimer.id })) },
    },
    include: { recipients: { include: { partTimer: true } } },
  });

  let sentCount = 0;
  for (const recipient of offer.recipients) {
    const body = messageTemplate.replace(/\{name\}/g, recipient.partTimer.fullName);
    const outbound = await prisma.whatsAppOutboundMessage.create({
      data: {
        tenantId: job.tenantId,
        offerId: offer.id,
        offerRecipientId: recipient.id,
        providerTenant,
        toPhone: recipient.partTimer.phoneE164.replace(/^\+/, ''),
        body,
        status: 'QUEUED',
      },
    });
    const result = await sendWhatsAppMessage({ toPhoneE164: recipient.partTimer.phoneE164, text: body, tenant: providerTenant });
    await prisma.whatsAppOutboundMessage.update({
      where: { id: outbound.id },
      data: {
        status: result.ok ? 'SENT' : 'FAILED',
        providerMessageId: result.messageId || null,
        payload: result.payload as object | undefined,
        errorCode: result.error || null,
        errorMessage: result.detail || null,
      },
    });
    await prisma.jobOfferRecipient.update({
      where: { id: recipient.id },
      data: {
        status: result.ok ? 'OFFER_SENT' : 'FAILED',
        sentAt: result.ok ? new Date() : null,
        lastMessageId: result.messageId || null,
      },
    });
    if (result.ok) sentCount += 1;
  }

  await prisma.jobOffer.update({
    where: { id: offer.id },
    data: { status: sentCount > 0 ? 'OFFER_SENT' : 'FAILED', sentAt: sentCount > 0 ? new Date() : null },
  });
  if (sentCount > 0) {
    await prisma.workEvent.update({ where: { id: job.id }, data: { jobStatus: 'OFFERING' } });
  }

  revalidatePath('/employer/offers');
  revalidatePath(`/employer/jobs/${job.id}`);
  redirect(`/employer/offers?sent=${sentCount}&total=${partTimers.length}`);
}
