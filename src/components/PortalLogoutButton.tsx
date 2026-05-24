'use client';

import { useRouter } from 'next/navigation';

export function PortalLogoutButton({ redirectTo = '/' }: { redirectTo?: string }) {
  const router = useRouter();

  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button type="button" onClick={onLogout} className="rounded-xl border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-50">
      Logout
    </button>
  );
}