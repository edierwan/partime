'use client';

import { useRouter } from 'next/navigation';

export function TopBar({ adminName, adminEmail }: { adminName?: string; adminEmail?: string }) {
  const router = useRouter();
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-ink-200 no-print">
      <div className="px-6 h-16 flex items-center gap-4">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <input className="input pl-9" placeholder="Search staff, events, logs…" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">🔎</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium text-ink-900 leading-tight">{adminName || 'Admin'}</div>
            <div className="text-xs text-ink-500">{adminEmail}</div>
          </div>
          <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
            {(adminName || adminEmail || 'A').slice(0, 1).toUpperCase()}
          </div>
          <button onClick={logout} className="btn-ghost text-xs">Logout</button>
        </div>
      </div>
    </header>
  );
}
