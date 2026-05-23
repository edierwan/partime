import Link from 'next/link';

const nav = [
  { href: '/part-timer', label: 'Overview' },
  { href: '/part-timer/profile', label: 'Profile' },
  { href: '/part-timer/portfolio', label: 'Portfolio' },
  { href: '/part-timer/jobs', label: 'Jobs' },
  { href: '/part-timer/offers', label: 'Offers' },
  { href: '/part-timer/history', label: 'History' },
];

export function PartTimerLookup({ phone, children }: { phone?: string; children: React.ReactNode }) {
  const query = phone ? `?phone=${encodeURIComponent(phone)}` : '';
  return (
    <main className="min-h-screen bg-[#f7f3ea] px-4 py-5 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-ink-950"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 text-sm text-white">P</span>Partime</Link>
          <form className="flex w-full gap-2 sm:w-auto" action="/part-timer" method="get">
            <input className="input bg-white" name="phone" defaultValue={phone || ''} placeholder="WhatsApp number" />
            <button className="btn-primary bg-ink-900 hover:bg-ink-700" type="submit">Open</button>
          </form>
        </header>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {nav.map((item) => <Link key={item.href} href={`${item.href}${query}`} className="shrink-0 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-medium text-ink-700">{item.label}</Link>)}
        </nav>
        {children}
      </div>
    </main>
  );
}