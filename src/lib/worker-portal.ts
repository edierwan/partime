import { getSession, requireSession, type SessionPayload } from '@/lib/auth';
import { prisma } from '@/lib/db';

export type WorkerAccountStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'INCOMPLETE';

export async function getWorkerPortalContext(session?: SessionPayload | null) {
  const activeSession = session ?? await getSession();
  if (!activeSession || activeSession.role !== 'WORKER') return null;

  const profile = await prisma.staff.findFirst({
    where: {
      OR: [
        { userId: activeSession.sub },
        ...(activeSession.phoneE164 ? [{ phoneE164: activeSession.phoneE164 }] : []),
      ],
    },
    include: {
      skills: { include: { skill: true }, orderBy: { skill: { nameMs: 'asc' } } },
      jobInterests: { include: { job: true }, orderBy: { createdAt: 'desc' }, take: 5 },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!profile) return null;

  return {
    session: activeSession,
    profile,
    accountStatus: resolveWorkerAccountStatus(profile.status, profile.approvalStatus),
    profileCompletionPercentage: calculateWorkerProfileCompletion(profile),
  };
}

export async function requireWorkerPortalContext() {
  const session = await requireSession();
  if (session.role !== 'WORKER') throw new Error('FORBIDDEN');
  const context = await getWorkerPortalContext(session);
  if (!context) throw new Error('WORKER_PROFILE_REQUIRED');
  return context;
}

export function workerDashboardPath(): string {
  return '/worker/dashboard';
}

function resolveWorkerAccountStatus(status: string, approvalStatus: string): WorkerAccountStatus {
  if (status === 'SUSPENDED') return 'SUSPENDED';
  if (status === 'REJECTED' || approvalStatus === 'REJECTED') return 'REJECTED';
  if (status === 'PENDING_REVIEW' || approvalStatus === 'PENDING_REVIEW') return 'PENDING_REVIEW';
  return 'ACTIVE';
}

function calculateWorkerProfileCompletion(profile: {
  fullName: string;
  payName: string;
  phoneE164: string;
  email: string | null;
  state: string | null;
  city: string | null;
  postcode: string | null;
  bankCode: string | null;
  bankAccountNumber: string | null;
  profileImageUrl: string | null;
}) {
  const fields = [profile.fullName, profile.payName, profile.phoneE164, profile.email, profile.state, profile.city, profile.postcode, profile.bankCode, profile.bankAccountNumber, profile.profileImageUrl];
  const filled = fields.filter((value) => String(value || '').trim()).length;
  return Math.round((filled / fields.length) * 100);
}
