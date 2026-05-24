import Link from 'next/link';
import { employerStatusMeta, requireEmployerPortalContext } from '@/lib/employer-portal';

export default async function EmployerSettingsPage() {
  const context = await requireEmployerPortalContext();
  const statusMeta = employerStatusMeta(context.accountStatus);

  return (
    <div className="space-y-5">
      <div><h1 className="sectiontitle">Settings</h1><p className="subtitle">Tenant profile, approval status, and portal preferences.</p></div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card card-pad space-y-4 text-sm">
          <div><span className="font-medium">Tenant:</span> {context.tenant.name}</div>
          <div><span className="font-medium">Status:</span> {statusMeta.label}</div>
          <div><span className="font-medium">Contact email:</span> {context.tenant.email || context.registration?.contactEmail || 'Not set'}</div>
          <div><span className="font-medium">Phone:</span> {context.tenant.phoneE164}</div>
          <div className="text-ink-500">Logo upload uses the same private S3 media layer as portfolio and job media.</div>
        </div>
        <div className="card card-pad space-y-4">
          <div className="text-sm font-semibold text-ink-900">Quick links</div>
          <Link href="/employer/profile" className="rounded-xl border border-ink-200 px-4 py-3 text-sm font-semibold text-ink-700 hover:bg-ink-50">Company Profile</Link>
          <Link href="/employer/jobs" className="rounded-xl border border-ink-200 px-4 py-3 text-sm font-semibold text-ink-700 hover:bg-ink-50">My Jobs</Link>
          <Link href="/employer/messages" className="rounded-xl border border-ink-200 px-4 py-3 text-sm font-semibold text-ink-700 hover:bg-ink-50">Messages / WhatsApp Leads</Link>
        </div>
      </div>
    </div>
  );
}