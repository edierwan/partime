import Link from 'next/link';
import { prisma } from '@/lib/db';

export default async function PlatformAdminPage() {
  const [tenants, jobs, partTimers, offers, inbound, outbound] = await Promise.all([
    prisma.tenant.count(),
    prisma.workEvent.count(),
    prisma.staff.count(),
    prisma.jobOffer.count(),
    prisma.whatsAppInboundMessage.count(),
    prisma.whatsAppOutboundMessage.count(),
  ]);
  return <div className="space-y-6"><div><h1 className="sectiontitle">Platform</h1><p className="subtitle">Multi-tenant marketplace, WhatsApp and media overview.</p></div><div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6"><Metric label="Tenants" value={tenants} /><Metric label="Jobs" value={jobs} /><Metric label="Part-timers" value={partTimers} /><Metric label="Offers" value={offers} /><Metric label="Inbound WA" value={inbound} /><Metric label="Outbound WA" value={outbound} /></div><div className="grid gap-4 md:grid-cols-3"><Link className="card card-pad hover:bg-ink-50" href="/admin/jobs"><div className="font-semibold">Marketplace jobs</div><div className="mt-1 text-sm text-ink-500">Review public job listings and statuses.</div></Link><Link className="card card-pad hover:bg-ink-50" href="/admin/whatsapp"><div className="font-semibold">WhatsApp logs</div><div className="mt-1 text-sm text-ink-500">Audit offer messages and inbound replies.</div></Link><Link className="card card-pad hover:bg-ink-50" href="/admin/media"><div className="font-semibold">Media</div><div className="mt-1 text-sm text-ink-500">Monitor portfolio and job uploads.</div></Link></div></div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="card card-pad"><div className="text-sm text-ink-500">{label}</div><div className="mt-2 text-3xl font-semibold text-ink-950">{value}</div></div>;
}