import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession, resolveAuthenticatedHomePath } from '@/lib/auth';
import { PortalLogoutButton } from '@/components/PortalLogoutButton';
import { PublicLanguageSelector } from '@/components/PublicLanguageSelector';
import { Badge } from '@/components/Badge';
import { employerDashboardPath, employerStatusMeta, getEmployerPortalContext } from '@/lib/employer-portal';
import { normalizeLocale } from '@/lib/public-i18n';

const nav = [
  { href: '/employer/dashboard', label: 'Dashboard' },
  { href: '/employer/jobs/new', label: 'Post a Job' },
  { href: '/employer/jobs', label: 'My Jobs' },
  { href: '/employer/applicants', label: 'Applicants' },
  { href: '/employer/profile', label: 'Company Profile' },
  { href: '/employer/messages', label: 'Messages / WhatsApp Leads' },
  { href: '/employer/settings', label: 'Settings' },
];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(employerDashboardPath())}`);
  if (session.role !== 'EMPLOYER') redirect(resolveAuthenticatedHomePath(session));

  const context = await getEmployerPortalContext(session);
  if (!context) redirect('/register/employer');

  const statusMeta = employerStatusMeta(context.accountStatus);
  const locale = normalizeLocale((await cookies()).get('partime_public_lang')?.value);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f9ff_0%,#f9fbff_50%,#ffffff_100%)] text-ink-950">
      <header className="sticky top-0 z-30 border-b border-blue-950/10 bg-white/95 px-4 py-4 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/employer/dashboard" className="flex items-center gap-3 text-lg font-semibold text-ink-950">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b63f6] text-sm font-black text-white shadow-sm">P</span>
            <span className="leading-tight">
              <span className="block text-base font-black text-[#092152]">Partime</span>
              <span className="block text-xs font-semibold text-ink-500">Employer Portal</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <PublicLanguageSelector locale={locale} />
            <PortalLogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
        <details className="mb-4 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm md:hidden">
          <summary className="cursor-pointer list-none text-sm font-semibold text-ink-900">Menu</summary>
          <div className="mt-4 grid gap-2">
            {nav.map((item) => <Link key={item.href} href={item.href} className="rounded-xl border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50">{item.label}</Link>)}
          </div>
        </details>
        <div className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden rounded-3xl border border-ink-200 bg-white p-4 shadow-[0_18px_40px_rgba(20,65,130,0.08)] md:block md:sticky md:top-24 md:self-start">
            <div className="rounded-2xl bg-[#eef5ff] p-4">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-[#075bf2]">Employer</div>
              <div className="mt-2 text-xl font-black text-[#092152]">{context.tenant.name}</div>
              <div className="mt-2 text-xs text-ink-600">{context.registration?.contactPersonName || session.name || session.email}</div>
              <div className="mt-3"><Badge variant={statusMeta.tone === 'amber' ? 'amber' : statusMeta.tone === 'green' ? 'green' : statusMeta.tone === 'rose' ? 'red' : 'zinc'}>{statusMeta.label}</Badge></div>
              <p className="mt-3 text-xs leading-5 text-ink-600">{statusMeta.description}</p>
            </div>
            <nav className="mt-4 grid gap-1">
              {nav.map((item) => <Link key={item.href} href={item.href} className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-50">{item.label}</Link>)}
            </nav>
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}