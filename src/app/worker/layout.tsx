import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalLogoutButton } from '@/components/PortalLogoutButton';
import { getSession, resolveAuthenticatedHomePath } from '@/lib/auth';
import { getWorkerPortalContext, workerDashboardPath } from '@/lib/worker-portal';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(workerDashboardPath())}`);
  if (session.role !== 'WORKER') redirect(resolveAuthenticatedHomePath(session));

  const context = await getWorkerPortalContext(session);
  if (!context) redirect('/worker/onboarding');

  return (
    <div className="min-h-screen bg-ink-50 text-ink-950">
      <header className="border-b border-ink-200 bg-white px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/worker/dashboard" className="flex items-center gap-3 text-lg font-semibold text-ink-950">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-sm font-black text-white">P</span>
            <span>
              <span className="block text-base font-black">Partime</span>
              <span className="block text-xs font-semibold text-ink-500">Worker Portal</span>
            </span>
          </Link>
          <PortalLogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
