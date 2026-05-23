import { prisma } from '@/lib/db';
import { currentAdminTenantId } from '@/lib/tenant';

export default async function EmployerSettingsPage() {
  const tenantId = await currentAdminTenantId();
  const tenant = tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId } }) : null;
  return <div className="space-y-5"><div><h1 className="sectiontitle">Settings</h1><p className="subtitle">Tenant profile and marketplace media settings.</p></div><div className="card card-pad space-y-2 text-sm"><div><span className="font-medium">Tenant:</span> {tenant?.name || 'Not assigned'}</div><div><span className="font-medium">Status:</span> {tenant?.status || '-'}</div><div><span className="font-medium">Logo:</span> {tenant?.logoUrl ? 'Uploaded' : 'Not uploaded'}</div><div className="text-ink-500">Logo upload uses the same private S3 media layer as portfolio and job media.</div></div></div>;
}