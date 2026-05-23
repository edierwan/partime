import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatJobDate, formatJobRate, jobPublicHref } from '@/lib/marketplace';

export default async function AdminJobsPage() {
  const jobs = await prisma.workEvent.findMany({ include: { tenant: true, _count: { select: { interests: true, offers: true, sessions: true } } }, orderBy: { createdAt: 'desc' }, take: 150 });
  return <div className="space-y-6"><div><h1 className="sectiontitle">Marketplace jobs</h1><p className="subtitle">Public jobs, QR events and attendance-linked sessions.</p></div><div className="card overflow-hidden"><table className="table-base"><thead><tr><th>Job</th><th>Tenant</th><th>Date</th><th>Rate</th><th>Status</th><th>Interest</th><th>Offers</th><th></th></tr></thead><tbody>{jobs.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-ink-500">No jobs yet.</td></tr>}{jobs.map((job) => <tr key={job.id}><td><div className="font-medium text-ink-950">{job.name}</div><div className="text-xs text-ink-500">{job.location}</div></td><td>{job.tenant.name}</td><td>{formatJobDate(job.workDate)}</td><td>{formatJobRate(job)}</td><td>{job.jobStatus}</td><td>{job._count.interests}</td><td>{job._count.offers}</td><td className="text-right"><Link className="text-brand-700 hover:underline" href={jobPublicHref(job)}>View</Link></td></tr>)}</tbody></table></div></div>;
}