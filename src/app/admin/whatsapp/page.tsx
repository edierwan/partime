import { prisma } from '@/lib/db';

export default async function AdminWhatsAppPage() {
  const [outbound, inbound] = await Promise.all([
    prisma.whatsAppOutboundMessage.findMany({ include: { tenant: true, offerRecipient: { include: { partTimer: true } } }, orderBy: { createdAt: 'desc' }, take: 80 }),
    prisma.whatsAppInboundMessage.findMany({ include: { tenant: true, offerRecipient: { include: { partTimer: true } } }, orderBy: { receivedAt: 'desc' }, take: 80 }),
  ]);
  return <div className="space-y-6"><div><h1 className="sectiontitle">WhatsApp</h1><p className="subtitle">Baileys tenant partime message logs and webhook replies.</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Gateway webhook registration is env-based in the current Baileys runtime: set WAPI_WEBHOOK_URL to https://partime.getouch.co/api/webhooks/baileys/inbound and use the same secret for gateway WAPI_SECRET and Partime BAILEYS_WEBHOOK_SECRET.</div><LogTable title="Outbound" rows={outbound.map((row) => ({ id: row.id, time: row.createdAt, tenant: row.tenant?.name || '-', phone: row.toPhone, status: row.status, body: row.body }))} /><LogTable title="Inbound" rows={inbound.map((row) => ({ id: row.id, time: row.receivedAt, tenant: row.tenant?.name || '-', phone: row.fromPhone || '-', status: row.interpretedReply || row.eventType, body: row.body || row.eventType }))} /></div>;
}

function LogTable({ title, rows }: { title: string; rows: Array<{ id: string; time: Date; tenant: string; phone: string; status: string; body: string }> }) {
  return <div className="card overflow-hidden"><div className="border-b border-ink-200 p-4 font-semibold">{title}</div><table className="table-base"><thead><tr><th>Time</th><th>Tenant</th><th>Phone</th><th>Status</th><th>Body</th></tr></thead><tbody>{rows.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-ink-500">No logs yet.</td></tr>}{rows.map((row) => <tr key={row.id}><td>{row.time.toLocaleString('en-MY')}</td><td>{row.tenant}</td><td>{row.phone}</td><td>{row.status}</td><td className="max-w-sm truncate">{row.body}</td></tr>)}</tbody></table></div>;
}