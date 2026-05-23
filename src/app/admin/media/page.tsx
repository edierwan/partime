import { prisma } from '@/lib/db';

export default async function AdminMediaPage() {
  const [portfolio, jobMedia, tenantsWithLogos] = await Promise.all([
    prisma.partTimerPortfolioMedia.findMany({ include: { partTimer: true }, orderBy: { createdAt: 'desc' }, take: 80 }),
    prisma.jobMedia.findMany({ include: { job: { include: { tenant: true } } }, orderBy: { createdAt: 'desc' }, take: 80 }),
    prisma.tenant.findMany({ where: { logoUrl: { not: null } }, orderBy: { updatedAt: 'desc' }, take: 40 }),
  ]);
  return <div className="space-y-6"><div><h1 className="sectiontitle">Media</h1><p className="subtitle">Portfolio, job and employer logo uploads stored through S3/local storage.</p></div><div className="grid gap-4 md:grid-cols-3"><Metric label="Portfolio media" value={portfolio.length} /><Metric label="Job media" value={jobMedia.length} /><Metric label="Tenant logos" value={tenantsWithLogos.length} /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{portfolio.map((media) => <MediaCard key={media.id} title={media.title || media.partTimer.fullName} subtitle={`Part-timer - ${media.mediaType}`} url={media.url} mediaType={media.mediaType} />)}{jobMedia.map((media) => <MediaCard key={media.id} title={media.filename || media.job.name} subtitle={`${media.job.tenant.name} - ${media.mediaType}`} url={media.url} mediaType={media.mediaType} />)}{tenantsWithLogos.map((tenant) => <MediaCard key={tenant.id} title={tenant.name} subtitle="Employer logo" url={tenant.logoUrl || ''} mediaType="IMAGE" />)}</div></div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="card card-pad"><div className="text-sm text-ink-500">{label}</div><div className="mt-2 text-3xl font-semibold text-ink-950">{value}</div></div>;
}

function MediaCard({ title, subtitle, url, mediaType }: { title: string; subtitle: string; url: string; mediaType: string }) {
  return <div className="card overflow-hidden"><div className="aspect-video bg-ink-100">{mediaType === 'VIDEO' ? <video src={url} controls className="h-full w-full object-cover" /> : <img src={url} alt={title} className="h-full w-full object-cover" />}</div><div className="p-4"><div className="font-medium text-ink-950">{title}</div><div className="mt-1 text-sm text-ink-500">{subtitle}</div></div></div>;
}