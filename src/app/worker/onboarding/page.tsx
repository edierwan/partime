import Link from 'next/link';

export default function WorkerOnboardingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 p-6">
      <div className="card card-pad max-w-lg space-y-4">
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">Partime</div>
        <h1 className="text-2xl font-semibold text-ink-950">Lengkapkan profil pekerja</h1>
        <p className="text-sm leading-6 text-ink-600">Akaun anda belum mempunyai profil pekerja yang lengkap. Sila daftar atau hubungi admin Partime untuk sambungkan profil sedia ada.</p>
        <Link href="/register/part-timer" className="btn-primary inline-flex">Daftar profil pekerja</Link>
      </div>
    </div>
  );
}
