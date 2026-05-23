'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { currentAdminTenantId } from '@/lib/tenant';
import { parseRateInputToCents } from '@/lib/money';
import { validateMalaysiaLocation } from '@/lib/malaysia-locations';
import { parseDateInput } from '@/lib/time';
import { createMarketplaceJob } from '@/lib/marketplace';
import { prisma } from '@/lib/db';
import { saveJobMedia } from '@/lib/uploads';

const jobSchema = z.object({
  name: z.string().min(3),
  summary: z.string().optional(),
  description: z.string().optional(),
  dressCode: z.string().optional(),
  toolsNeeded: z.string().optional(),
  category: z.string().optional(),
  location: z.string().min(2),
  stateCode: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  addressLine2: z.string().optional(),
  postcode: z.string().optional(),
  workDate: z.string().min(8),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  headcount: z.coerce.number().int().min(1).max(500),
  payType: z.enum(['HOURLY', 'DAILY', 'FIXED']),
  defaultRate: z.string().min(1),
  publicVisible: z.boolean(),
  jobStatus: z.enum(['DRAFT', 'OPEN']),
  skillIds: z.array(z.string()),
});

export async function createEmployerJob(formData: FormData) {
  await requireSession();
  const tenantId = await currentAdminTenantId();
  if (!tenantId) redirect('/employer/jobs?error=no-tenant');
  const parsed = jobSchema.safeParse({
    name: String(formData.get('name') || ''),
    summary: String(formData.get('summary') || ''),
    description: String(formData.get('description') || ''),
    dressCode: String(formData.get('dressCode') || ''),
    toolsNeeded: String(formData.get('toolsNeeded') || ''),
    category: String(formData.get('category') || ''),
    location: String(formData.get('location') || ''),
    stateCode: String(formData.get('stateCode') || ''),
    state: String(formData.get('state') || ''),
    city: String(formData.get('city') || ''),
    address: String(formData.get('address') || ''),
    addressLine2: String(formData.get('addressLine2') || ''),
    postcode: String(formData.get('postcode') || ''),
    workDate: String(formData.get('workDate') || ''),
    startTime: String(formData.get('startTime') || ''),
    endTime: String(formData.get('endTime') || ''),
    headcount: formData.get('headcount') || '1',
    payType: String(formData.get('payType') || 'HOURLY'),
    defaultRate: String(formData.get('defaultRate') || ''),
    publicVisible: formData.get('publicVisible') === 'on',
    jobStatus: String(formData.get('jobStatus') || 'OPEN'),
    skillIds: formData.getAll('skillIds').map(String).filter(Boolean),
  });
  if (!parsed.success) redirect('/employer/jobs/new?error=invalid');

  const normalizedLocation = await validateMalaysiaLocation({
    stateCode: parsed.data.stateCode,
    stateName: parsed.data.state,
    cityName: parsed.data.city,
    postcode: parsed.data.postcode,
    requireState: true,
    requireCity: true,
    requirePostcode: true,
    allowCustomCity: true,
  });
  if (!normalizedLocation.ok) redirect('/employer/jobs/new?error=invalid');

  const job = await createMarketplaceJob({
    tenantId,
    name: parsed.data.name,
    summary: parsed.data.summary,
    description: parsed.data.description,
    dressCode: parsed.data.dressCode,
    toolsNeeded: parsed.data.toolsNeeded,
    category: parsed.data.category,
    location: parsed.data.location,
    stateCode: normalizedLocation.data.stateCode,
    state: normalizedLocation.data.stateName,
    city: normalizedLocation.data.cityName,
    address: parsed.data.address,
    addressLine2: parsed.data.addressLine2,
    postcode: normalizedLocation.data.postcode,
    workDate: parseDateInput(parsed.data.workDate),
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    headcount: parsed.data.headcount,
    payType: parsed.data.payType,
    defaultRateCents: parseRateInputToCents(parsed.data.defaultRate),
    publicVisible: parsed.data.publicVisible,
    jobStatus: parsed.data.jobStatus,
    skillIds: parsed.data.skillIds,
  });

  const coverImage = formData.get('coverImage');
  if (coverImage instanceof File && coverImage.size > 0) {
    const saved = await saveJobMedia({ jobId: job.id, file: coverImage, role: 'cover' });
    await prisma.workEvent.update({ where: { id: job.id }, data: { coverImageUrl: saved.url, coverImageKey: saved.key } });
  }

  const galleryFiles = formData.getAll('galleryMedia').filter((file): file is File => file instanceof File && file.size > 0).slice(0, 8);
  if (galleryFiles.length > 0) {
    const uploads = [];
    for (const [index, file] of galleryFiles.entries()) {
      const saved = await saveJobMedia({ jobId: job.id, file, role: 'gallery' });
      uploads.push({
        jobId: job.id,
        mediaType: saved.mediaType,
        url: saved.url,
        key: saved.key,
        filename: saved.filename,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        sortOrder: index + 1,
      });
    }
    await prisma.jobMedia.createMany({ data: uploads });
  }
  revalidatePath('/employer/jobs');
  revalidatePath('/jobs');
  redirect(`/employer/jobs/${job.id}`);
}

export async function setEmployerJobStatus(formData: FormData) {
  await requireSession();
  const jobId = String(formData.get('jobId') || '');
  const status = String(formData.get('status') || 'DRAFT');
  if (!['DRAFT', 'OPEN', 'OFFERING', 'FULL', 'COMPLETED', 'CANCELLED', 'CLOSED'].includes(status)) return;
  await prisma.workEvent.update({ where: { id: jobId }, data: { jobStatus: status as any, publicVisible: status === 'OPEN' || status === 'OFFERING' } });
  revalidatePath('/employer/jobs');
  revalidatePath(`/employer/jobs/${jobId}`);
  revalidatePath('/jobs');
}