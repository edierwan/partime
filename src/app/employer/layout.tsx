import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

const nav = [
  { href: '/employer', label: 'Dashboard' },
  { href: '/employer/jobs', label: 'Jobs' },
  { href: '/employer/part-timers', label: 'Part-timers' },
  { href: '/employer/offers', label: 'Offers' },
  { href: '/employer/responses', label: 'Responses' },
  { href: '/employer/confirmed-workers', label: 'Confirmed workers' },
  { href: '/employer/reports', label: 'Reports' },
  { href: '/employer/settings', label: 'Settings' },
];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login?next=/employer');

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-white px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <Link href="/employer" className="flex items-center gap-2 text-lg font-semibold text-ink-950">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-xs text-white">P</span>
            Employer workspace
          </Link>
          <div className="text-sm text-ink-500">{session.email}</div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 md:grid-cols-[220px_1fr] md:px-6">
        <aside className="rounded-xl border border-ink-200 bg-white p-3 shadow-card md:sticky md:top-5 md:self-start">
          <nav className="grid gap-1">
            {nav.map((item) => <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50">{item.label}</Link>)}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}