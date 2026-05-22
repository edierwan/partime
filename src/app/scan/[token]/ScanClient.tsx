'use client';

import { useState } from 'react';

interface LookupResult {
  ok: boolean;
  error?: string;
  staff?: { id: string; fullName: string; payName: string; alias: string };
  openSession?: { id: string; clockInAt: string };
}

interface ActionResult {
  ok: boolean;
  error?: string;
  action?: 'CLOCK_IN' | 'CLOCK_OUT';
  data?: {
    clockInAt: string;
    clockOutAt?: string;
    grossMinutes?: number;
    breakDeductMinutes?: number;
    payableMinutes?: number;
    totalPayCents?: number;
  };
}

export function ScanClient({ token, eventName }: { token: string; eventName: string }) {
  const [input, setInput] = useState('');
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [done, setDone] = useState<ActionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  function askGeo() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setGeo({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {}, { enableHighAccuracy: false, timeout: 5000 }
    );
  }

  async function onFind(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setDone(null);
    askGeo();
    const res = await fetch(`/api/scan/${token}/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: input }),
    });
    const data: LookupResult = await res.json();
    setLookup(data);
    setLoading(false);
  }

  async function onAction(action: 'CLOCK_IN' | 'CLOCK_OUT') {
    if (!lookup?.staff) return;
    setLoading(true);
    const res = await fetch(`/api/scan/${token}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: lookup.staff.id, action, lat: geo?.lat, lng: geo?.lng }),
    });
    const data: ActionResult = await res.json();
    setDone(data);
    setLoading(false);
  }

  function reset() {
    setInput(''); setLookup(null); setDone(null);
  }

  if (done?.ok) {
    return (
      <div className="card card-pad">
        <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-1">
          ✓ {done.action === 'CLOCK_OUT' ? 'Clock Out' : 'Clock In'} successful
        </div>
        <div className="text-xs text-ink-500 mb-3">{eventName}</div>

        <div className="space-y-2 text-sm">
          <Row label="Clock In Time"  value={fmtTime(done.data?.clockInAt)} />
          {done.data?.clockOutAt && <Row label="Clock Out Time" value={fmtTime(done.data?.clockOutAt)} />}
          {done.action === 'CLOCK_OUT' && (
            <>
              <Row label="Gross Hours"     value={`${hrs(done.data?.grossMinutes)} hrs`} />
              <Row label="Break Deduct"    value={`${hrs(done.data?.breakDeductMinutes)} hrs`} />
              <Row label="Payable Hours"   value={`${hrs(done.data?.payableMinutes)} hrs`} bold />
              <div className="border-t border-ink-200 pt-3 mt-3">
                <Row label="Estimated Total Pay" value={fmtMYR(done.data?.totalPayCents || 0)} bold />
              </div>
            </>
          )}
        </div>

        <button className="btn-ghost w-full mt-5" onClick={reset}>Done</button>
      </div>
    );
  }

  return (
    <div className="card card-pad">
      <form onSubmit={onFind} className="space-y-3">
        <label className="label">Enter your phone number or alias</label>
        <input
          autoFocus className="input"
          inputMode="tel"
          placeholder="012-345 6789 or your alias"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          required
        />
        <button type="submit" disabled={loading || !input} className="btn-primary w-full">
          {loading ? 'Searching…' : 'Find Me'}
        </button>
      </form>

      {lookup && !lookup.ok && (
        <div className="text-sm text-rose-600 mt-3">{lookup.error}</div>
      )}

      {lookup?.ok && lookup.staff && (
        <div className="mt-5 space-y-3">
          <div className="card card-pad bg-ink-50/50">
            <div className="text-xs text-emerald-700 mb-1">● Staff Found</div>
            <div className="font-semibold">{lookup.staff.fullName}</div>
            <div className="text-xs text-ink-500">Staff ID: {lookup.staff.alias}</div>
            {lookup.openSession && (
              <div className="text-xs text-emerald-700 mt-1">● Currently clocked in at {fmtTime(lookup.openSession.clockInAt)}</div>
            )}
          </div>

          {lookup.openSession ? (
            <button onClick={() => onAction('CLOCK_OUT')} disabled={loading}
              className="btn w-full bg-rose-500 text-white hover:bg-rose-600 py-3 text-base">
              {loading ? 'Working…' : '⏏ Clock Out'}
            </button>
          ) : (
            <button onClick={() => onAction('CLOCK_IN')} disabled={loading}
              className="btn w-full bg-brand-500 text-white hover:bg-brand-600 py-3 text-base">
              {loading ? 'Working…' : '▶ Clock In'}
            </button>
          )}

          {done && !done.ok && <div className="text-sm text-rose-600">{done.error}</div>}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-500">{label}</span>
      <span className={bold ? 'font-semibold text-ink-900' : 'text-ink-900'}>{value}</span>
    </div>
  );
}

function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kuala_Lumpur' });
}
function hrs(min?: number | null) {
  if (min == null) return '—';
  return (min / 60).toFixed(2);
}
function fmtMYR(cents: number) {
  return `RM ${(cents / 100).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
