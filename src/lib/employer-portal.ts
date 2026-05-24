import { type EmployerRegistration, type Tenant, type TenantMembership, type TenantRole } from '@prisma/client';
import { getSession, requireSession, type SessionPayload } from '@/lib/auth';
import { prisma } from '@/lib/db';

export type EmployerAccountStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface EmployerPortalContext {
  session: SessionPayload;
  membership: TenantMembership;
  tenant: Tenant;
  registration: EmployerRegistration | null;
  accountStatus: EmployerAccountStatus;
  canPublishJobs: boolean;
  canCreateDraftJobs: boolean;
  profileCompletionPercentage: number;
}

export async function getEmployerPortalContext(session?: SessionPayload | null): Promise<EmployerPortalContext | null> {
  const activeSession = session ?? await getSession();
  if (!activeSession || activeSession.role !== 'EMPLOYER') return null;

  const membership = await prisma.tenantMembership.findFirst({
    where: {
      ...(activeSession.tenantId ? { tenantId: activeSession.tenantId } : {}),
      OR: [
        { userId: activeSession.sub },
        { adminUserId: activeSession.sub },
      ],
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'asc' },
  });
  if (!membership) return null;

  const [tenant, registration] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: membership.tenantId } }),
    prisma.employerRegistration.findFirst({ where: { tenantId: membership.tenantId }, orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }] }),
  ]);
  if (!tenant) return null;

  const accountStatus = resolveEmployerAccountStatus(tenant.status, registration?.status || null);
  return {
    session: activeSession,
    membership,
    tenant,
    registration,
    accountStatus,
    canPublishJobs: accountStatus === 'APPROVED',
    canCreateDraftJobs: accountStatus !== 'SUSPENDED',
    profileCompletionPercentage: calculateEmployerProfileCompletion(tenant, registration),
  };
}

export async function requireEmployerPortalContext(): Promise<EmployerPortalContext> {
  const session = await requireSession();
  if (session.role !== 'EMPLOYER') throw new Error('FORBIDDEN');

  const context = await getEmployerPortalContext(session);
  if (!context) throw new Error('EMPLOYER_PROFILE_REQUIRED');
  return context;
}

export function employerDashboardPath(): string {
  return '/employer/dashboard';
}

export function canManageEmployerPortalRole(role: TenantRole): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER' || role === 'VIEWER';
}

export function resolveEmployerAccountStatus(tenantStatus: Tenant['status'], registrationStatus: EmployerRegistration['status'] | null): EmployerAccountStatus {
  if (tenantStatus === 'SUSPENDED') return 'SUSPENDED';
  if (tenantStatus === 'REJECTED' || registrationStatus === 'REJECTED') return 'REJECTED';
  if (tenantStatus === 'ACTIVE' || registrationStatus === 'APPROVED') return 'APPROVED';
  return 'PENDING_REVIEW';
}

export function employerStatusMeta(status: EmployerAccountStatus): { label: string; tone: 'amber' | 'green' | 'rose' | 'ink'; description: string } {
  if (status === 'APPROVED') {
    return {
      label: 'Approved',
      tone: 'green',
      description: 'Akaun majikan anda aktif. Anda boleh post dan publish kerja seperti biasa.',
    };
  }
  if (status === 'REJECTED') {
    return {
      label: 'Rejected / Need Update',
      tone: 'rose',
      description: 'Profil syarikat anda perlu dikemas kini sebelum kelulusan boleh diteruskan.',
    };
  }
  if (status === 'SUSPENDED') {
    return {
      label: 'Suspended',
      tone: 'ink',
      description: 'Akaun majikan anda digantung sementara. Sila hubungi admin Partime.',
    };
  }
  return {
    label: 'Pending Approval',
    tone: 'amber',
    description: 'Akaun majikan anda sedang disemak. Anda boleh lengkapkan profil syarikat, tetapi kerja hanya boleh diterbitkan selepas diluluskan.',
  };
}

function calculateEmployerProfileCompletion(tenant: Tenant, registration: EmployerRegistration | null): number {
  const fields = [
    tenant.name,
    tenant.logoUrl,
    tenant.registrationNo || registration?.businessRegistrationNo,
    tenant.addressLine1 || registration?.addressLine1,
    tenant.stateCode || registration?.stateCode,
    tenant.city || registration?.city,
    tenant.postcode || registration?.postcode,
    registration?.contactPersonName,
    tenant.phoneE164 || registration?.contactPhoneE164,
    tenant.email || registration?.contactEmail,
  ];
  const filled = fields.filter((value) => String(value || '').trim()).length;
  return Math.round((filled / fields.length) * 100);
}