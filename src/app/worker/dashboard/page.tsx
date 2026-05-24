import Link from 'next/link';
import { StatusBadge } from '@/components/Badge';
import { formatJobDate } from '@/lib/marketplace';
import { requireWorkerPortalContext } from '@/lib/worker-portal';

export default async function WorkerDashboardPage() {
  const context = await requireWorkerPortalContext();
  const profile = context.profile;

  return (
    <div className="space-y-6">
      <section className="card card-pad flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-brand-700">Worker Dashboard</div>
          <h1 className="mt-2 text-3xl font-black text-ink-950">Selamat datang, {profile.fullName}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-600">Semak status profil, permohonan kerja, dan lengkapkan maklumat pekerja anda.</p>
        </div>
        <Link href={`/part-timer/profile?phone=${encodeURIComponent(profile.phoneE164)}`} className="btn-primary">View public profile</Link>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Approval Status" value={context.accountStatus.replace(/_/g, ' ')} />
        <Metric label="Profile Completion" value={`${context.profileCompletionPercentage}%`} />
        <Metric label="Applications" value={String(profile.jobInterests.length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="card card-pad space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-ink-950">Profile status</h2>
            <StatusBadge status={profile.approvalStatus} />
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${context.profileCompletionPercentage}%` }} />
          </div>
          <div className="grid gap-3 text-sm">
            <Row label="Phone" value={profile.phoneDisplay || profile.phoneE164} />
            <Row label="Email" value={profile.email || 'Missing'} />
            <Row label="Preferred location" value={[profile.city, profile.state].filter(Boolean).join(', ') || profile.preferredLocation || 'Missing'} />
            <Row label="Bank details" value={profile.bankCode && profile.bankAccountNumber ? 'Added' : 'Missing'} />
          </div>
        </section>

        <section className="card card-pad">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-ink-950">Recent applications</h2>
            <Link href="/jobs" className="text-sm font-semibold text-brand-700 hover:underline">Browse jobs</Link>
          </div>
          <div className="space-y-3">
            {profile.jobInterests.length === 0 ? (
              <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4 text-sm text-ink-500">Belum ada permohonan kerja.</div>
            ) : profile.jobInterests.map((interest) => (
              <div key={interest.id} className="rounded-2xl border border-ink-200 p-4 text-sm">
                <div className="font-semibold text-ink-950">{interest.job.name}</div>
                <div className="mt-1 text-ink-500">{interest.job.location} · {formatJobDate(interest.job.workDate)}</div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">{interest.status}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="card card-pad"><div className="text-sm font-semibold text-ink-500">{label}</div><div className="mt-2 text-2xl font-black text-ink-950">{value}</div></div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl bg-ink-50 px-3 py-2"><span className="font-medium text-ink-600">{label}</span><span className="text-right font-semibold text-ink-950">{value}</span></div>;
}
