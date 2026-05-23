import { prisma } from '@/lib/db';
import { generateScanToken } from '@/lib/token';
import { formatMYR } from '@/lib/money';

export const JOB_CATEGORIES = [
  'Events',
  'Promotions',
  'F&B',
  'Warehouse',
  'Cleaning',
  'Retail',
  'Admin',
  'Technical',
] as const;

export const MALAYSIA_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Kuala Lumpur',
  'Labuan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Pulau Pinang',
  'Perak',
  'Perlis',
  'Putrajaya',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
] as const;

export const JOB_PAY_TYPE_LABELS: Record<string, string> = {
  HOURLY: 'Hourly',
  DAILY: 'Daily',
  FIXED: 'Fixed',
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  OFFERING: 'Offering',
  FULL: 'Full',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  CLOSED: 'Closed',
};

export const OFFER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  OFFER_SENT: 'Offer sent',
  DELIVERED: 'Delivered',
  INTERESTED: 'Interested',
  NOT_INTERESTED: 'Not interested',
  NO_RESPONSE: 'No response',
  SHORTLISTED: 'Shortlisted',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  FAILED: 'Failed',
};

export function slugifyJobTitle(input: string): string {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'job';
}

export async function uniqueJobSlug(title: string): Promise<string> {
  const base = slugifyJobTitle(title);
  let slug = base;
  let counter = 2;
  while (await prisma.workEvent.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

export function jobPublicHref(job: { id: string; slug: string | null }): string {
  return `/jobs/${job.slug || job.id}`;
}

export function formatJobDate(date: Date): string {
  return new Intl.DateTimeFormat('en-MY', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Kuala_Lumpur',
  }).format(date);
}

export function formatJobRate(job: { defaultRateCents: number; minRateCents: number | null; maxRateCents: number | null; payType: string }): string {
  const suffix = JOB_PAY_TYPE_LABELS[job.payType] ? `/${JOB_PAY_TYPE_LABELS[job.payType].toLowerCase()}` : '';
  if (job.minRateCents && job.maxRateCents && job.minRateCents !== job.maxRateCents) {
    return `${formatMYR(job.minRateCents)} - ${formatMYR(job.maxRateCents)}${suffix}`;
  }
  return `${formatMYR(job.defaultRateCents || job.minRateCents || 0)}${suffix}`;
}

export function publicJobWhere(searchParams: {
  q?: string;
  location?: string;
  stateCode?: string;
  state?: string;
  city?: string;
  category?: string;
  skill?: string;
  date?: string;
  payType?: string;
  minRate?: string;
  openOnly?: string;
}) {
  const q = (searchParams.q || '').trim();
  const location = (searchParams.location || '').trim();
  const stateCode = (searchParams.stateCode || '').trim().toUpperCase();
  const state = (searchParams.state || '').trim();
  const city = (searchParams.city || '').trim();
  const category = (searchParams.category || '').trim();
  const skill = (searchParams.skill || '').trim();
  const date = (searchParams.date || '').trim();
  const payType = (searchParams.payType || '').trim();
  const minRate = Number(searchParams.minRate || '0');
  const where: any = {
    active: true,
    publicVisible: true,
    jobStatus: { in: ['OPEN', 'OFFERING'] },
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { summary: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { location: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (location) {
    where.OR = [
      ...(where.OR || []),
      { location: { contains: location, mode: 'insensitive' } },
      { city: { contains: location, mode: 'insensitive' } },
      { state: { contains: location, mode: 'insensitive' } },
    ];
  }
  if (stateCode) where.stateCode = stateCode;
  if (state) where.state = state;
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (category) where.category = category;
  if (skill) {
    where.skills = {
      some: {
        skill: {
          OR: [
            { slug: skill },
            { nameEn: { contains: skill, mode: 'insensitive' } },
            { nameMs: { contains: skill, mode: 'insensitive' } },
            { nameId: { contains: skill, mode: 'insensitive' } },
          ],
        },
      },
    };
  }
  if (date) {
    const start = new Date(`${date}T00:00:00.000+08:00`);
    const end = new Date(`${date}T23:59:59.999+08:00`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) where.workDate = { gte: start, lte: end };
  }
  if (payType && ['HOURLY', 'DAILY', 'FIXED'].includes(payType)) where.payType = payType;
  if (searchParams.openOnly === 'on' || searchParams.openOnly === 'true') where.jobStatus = 'OPEN';
  if (Number.isFinite(minRate) && minRate > 0) where.defaultRateCents = { gte: Math.round(minRate * 100) };

  return where;
}

export function marketplaceJobInclude() {
  return {
    tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
    skills: { include: { skill: true }, orderBy: { createdAt: 'asc' as const } },
    media: { orderBy: { sortOrder: 'asc' as const } },
    _count: { select: { interests: true, offers: true, sessions: true } },
  };
}

export async function listPublicJobs(searchParams: Parameters<typeof publicJobWhere>[0], take = 30) {
  return prisma.workEvent.findMany({
    where: publicJobWhere(searchParams),
    include: marketplaceJobInclude(),
    orderBy: [{ workDate: 'asc' }, { createdAt: 'desc' }],
    take,
  });
}

export async function getPublicJobBySlugOrId(value: string) {
  return prisma.workEvent.findFirst({
    where: {
      OR: [{ id: value }, { slug: value }],
      active: true,
      publicVisible: true,
    },
    include: marketplaceJobInclude(),
  });
}

export async function createMarketplaceJob(data: {
  tenantId: string;
  name: string;
  summary?: string | null;
  description?: string | null;
  dressCode?: string | null;
  toolsNeeded?: string | null;
  category?: string | null;
  location: string;
  stateCode?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  addressLine2?: string | null;
  postcode?: string | null;
  workDate: Date;
  endDate?: Date | null;
  startTime?: string | null;
  endTime?: string | null;
  headcount: number;
  payType: 'HOURLY' | 'DAILY' | 'FIXED';
  defaultRateCents: number;
  minRateCents?: number | null;
  maxRateCents?: number | null;
  publicVisible?: boolean;
  active?: boolean;
  jobStatus?: 'DRAFT' | 'OPEN';
  notes?: string | null;
  skillIds?: string[];
}) {
  const slug = await uniqueJobSlug(data.name);
  const job = await prisma.workEvent.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      slug,
      summary: data.summary || null,
      description: data.description || null,
      dressCode: data.dressCode || null,
      toolsNeeded: data.toolsNeeded || null,
      category: data.category || null,
      location: data.location,
      stateCode: data.stateCode || null,
      state: data.state || null,
      city: data.city || null,
      address: data.address || null,
      addressLine2: data.addressLine2 || null,
      postcode: data.postcode || null,
      workDate: data.workDate,
      endDate: data.endDate || null,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      headcount: data.headcount,
      payType: data.payType,
      defaultRateCents: data.defaultRateCents,
      minRateCents: data.minRateCents ?? null,
      maxRateCents: data.maxRateCents ?? null,
      publicVisible: data.publicVisible ?? true,
      active: data.active ?? true,
      jobStatus: data.jobStatus || 'OPEN',
      notes: data.notes || null,
      scanToken: generateScanToken(),
      skills: data.skillIds?.length
        ? { create: data.skillIds.map((skillId) => ({ skillId })) }
        : undefined,
    },
  });
  return job;
}