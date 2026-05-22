import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const s = await getSession();
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="sectiontitle">Settings</h1>
        <p className="subtitle">System defaults and read-only configuration.</p>
      </div>

      <div className="card card-pad space-y-4">
        <Row label="Admin Email" value={s?.email || '—'} />
        <Row label="Admin Name"  value={s?.name || '—'} />
        <Row label="Public App URL" value={process.env.NEXT_PUBLIC_APP_URL || '—'} />
        <Row label="Timezone" value="Asia/Kuala_Lumpur" />
      </div>

      <div className="card card-pad space-y-4">
        <div className="font-semibold">Break Deduct Rule</div>
        <p className="text-sm text-ink-500">Auto-deduct applies on clock-out when the event has Auto Break Rule enabled. Admin can override per session in Attendance Logs.</p>
        <ul className="text-sm space-y-1 text-ink-700">
          <li>• Gross less than 5 hours → <b>0 minutes</b> deduct</li>
          <li>• Gross 5h to 7h 59min  → <b>30 minutes</b> deduct</li>
          <li>• Gross 8 hours or more → <b>60 minutes</b> deduct</li>
        </ul>
      </div>

      <div className="card card-pad space-y-2">
        <div className="font-semibold">About Partime</div>
        <div className="text-sm text-ink-500">Standalone part-time attendance + weekly payroll system. No external payroll, bank, or finance integration.</div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 pb-2 last:border-0 last:pb-0">
      <div className="text-sm text-ink-500">{label}</div>
      <div className="text-sm font-medium text-ink-900">{value}</div>
    </div>
  );
}
