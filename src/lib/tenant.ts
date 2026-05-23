import { prisma } from '@/lib/db';

export const PLATFORM_TENANT_SLUG = 'platform-default';

export async function ensureDefaultTenant() {
  return prisma.tenant.upsert({
    where: { slug: PLATFORM_TENANT_SLUG },
    update: {},
    create: {
      name: 'Partime Platform Default',
      slug: PLATFORM_TENANT_SLUG,
      phoneE164: '+60000000000',
      email: 'admin@partime.local',
      country: 'Malaysia',
      status: 'ACTIVE',
    },
  });
}

export async function currentAdminTenantId(): Promise<string | null> {
  const tenant = await ensureDefaultTenant();
  return tenant.id;
}

export function slugifyTenantName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 54) || 'tenant';
}

export async function uniqueTenantSlug(name: string): Promise<string> {
  const base = slugifyTenantName(name);
  let slug = base;
  let counter = 2;
  while (await prisma.tenant.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}