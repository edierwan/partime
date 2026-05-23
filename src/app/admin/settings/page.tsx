import { getSession } from '@/lib/auth';
import { ALLOW_PENDING_CLOCK_IN_KEY, getBooleanAppSetting } from '@/lib/app-settings';
import { saveScanSettings } from './actions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const s = await getSession();
  const allowPendingClockIn = await getBooleanAppSetting(ALLOW_PENDING_CLOCK_IN_KEY, false);
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

      <form action={saveScanSettings} className="card card-pad space-y-4">
        <div>
          <div className="font-semibold">Scan Access</div>
          <p className="text-sm text-ink-500 mt-1">Control whether self-registered staff in pending review can clock in before final admin approval.</p>
        </div>
        <label className="flex items-start gap-3 rounded-2xl border border-ink-200 px-4 py-3">
          <input type="checkbox" name="allowPendingClockIn" defaultChecked={allowPendingClockIn} className="mt-1 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
          <span>
            <span className="block text-sm font-medium text-ink-900">Allow pending-review staff to clock in</span>
            <span className="block text-xs text-ink-500 mt-1">When disabled, pending staff can still look up their profile on the scan page but clock-in remains blocked.</span>
          </span>
        </label>
        <button type="submit" className="btn-primary">Save Scan Settings</button>
      </form>

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
