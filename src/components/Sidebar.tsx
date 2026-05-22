'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/admin',                          label: 'Dashboard',       icon: '🏠' },
  { href: '/admin/staff',                    label: 'Staff',           icon: '👥' },
  { href: '/admin/events',                   label: 'Events & QR',     icon: '🎫' },
  { href: '/admin/attendance',               label: 'Attendance Logs', icon: '📅' },
  { href: '/admin/reports/daily',            label: 'Daily Report',    icon: '📊' },
  { href: '/admin/reports/weekly-payroll',   label: 'Weekly Payroll',  icon: '💰' },
  { href: '/admin/reports/exceptions',       label: 'Exceptions',      icon: '⚠️' },
  { href: '/admin/settings',                 label: 'Settings',        icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-ink-200 h-screen sticky top-0 no-print">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-ink-200">
        <span className="h-7 w-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold">P</span>
        <span className="text-lg font-semibold tracking-tight">Partime</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const active = it.href === '/admin' ? pathname === '/admin' : pathname.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href} className={cn('nav-item', active && 'nav-active')}>
              <span className="text-base">{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-ink-200 text-xs text-ink-500">
        Partime · Standalone MVP
      </div>
    </aside>
  );
}
