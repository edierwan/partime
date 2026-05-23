import { prisma } from '@/lib/db';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/Badge';
import { formatDate } from '@/lib/time';
import { EmployerActions } from './EmployerActions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EmployersPage(props: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const searchParams = await props.searchParams;
  const q = (searchParams.q || '').trim();
  const status = searchParams.status || 'all';
  const where: any = {};
  if (q) {
    where.OR = [
      { companyName: { contains: q, mode: 'insensitive' } },
      { contactPersonName: { contains: q, mode: 'insensitive' } },
      { contactEmail: { contains: q, mode: 'insensitive' } },
      { contactPhoneE164: { contains: q.replace(/\s+/g, '') } },
    ];
  }
  if (status !== 'all') where.status = status;

  const [rows, tenants, pending, activeTenants] = await Promise.all([
    prisma.employerRegistration.findMany({ where, include: { tenant: true }, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.tenant.count(),
    prisma.employerRegistration.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.tenant.count({ where: { status: 'ACTIVE' } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sectiontitle">Employers / Tenants</h1>
        <p className="subtitle">Review employer registrations and activate tenant workspaces.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tenants" value={tenants} icon="🏢" accent="blue" />
        <StatCard label="Active Tenants" value={activeTenants} icon="✓" accent="green" />
        <StatCard label="Pending Employers" value={pending} icon="🕒" accent="amber" />
        <StatCard label="Shown" value={rows.length} icon="📋" accent="violet" />
      </div>

      <div className="card">
        <div className="border-b border-ink-200 p-4">
          <form className="grid grid-cols-1 md:grid-cols-3 gap-3" action="/admin/employers" method="get">
            <input className="input md:col-span-2" name="q" defaultValue={q} placeholder="Search employer, contact, phone, or email..." />
            <select className="input" name="status" defaultValue={status}>
              <option value="all">All statuses</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Company Name</th><th>Contact Person</th><th>Phone</th><th>Email</th><th>Industry</th><th>Status</th><th>Created</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-ink-500">No employer registrations found.</td></tr>}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="font-medium">{row.companyName}</div>
                    <div className="text-xs text-ink-500">{row.tenant?.slug || 'No tenant'}</div>
                  </td>
                  <td>{row.contactPersonName}</td>
                  <td className="text-ink-600">{row.contactPhoneE164}</td>
                  <td className="text-ink-600">{row.contactEmail}</td>
                  <td>{row.industry || '—'}</td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>{formatDate(row.createdAt)}</td>
                  <td><EmployerActions id={row.id} status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}