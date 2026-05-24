import Link from 'next/link';
import { PortalLogoutButton } from '@/components/PortalLogoutButton';

export default async function BlockedAccountPage(props: { searchParams: Promise<{ status?: string }> }) {
  const searchParams = await props.searchParams;
  const status = String(searchParams.status || 'blocked').toUpperCase();

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 p-6">
      <div className="card card-pad max-w-lg space-y-4">
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-700">Partime</div>
        <h1 className="text-2xl font-semibold text-ink-950">Akaun tidak boleh digunakan</h1>
        <p className="text-sm leading-6 text-ink-600">Status akaun: {status}. Sila hubungi admin Partime jika anda perlukan bantuan untuk mengaktifkan semula akaun.</p>
        <div className="flex flex-wrap gap-3">
          <PortalLogoutButton />
          <Link href="/" className="btn-ghost">Kembali ke laman utama</Link>
        </div>
      </div>
    </div>
  );
}
