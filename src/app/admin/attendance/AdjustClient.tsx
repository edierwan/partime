'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SlideOver } from '@/components/SlideOver';
import { adjustAttendance } from './actions';
import { toDateInputValue, toTimeInputValue } from '@/lib/time';
import { recalc } from '@/lib/calc';

interface SessionData {
  id: string;
  staffName: string; eventName: string;
  workDate: Date; clockInAt: Date; clockOutAt: Date | null;
  breakDeductMinutes: number | null;
  breakOverridden: boolean;
  hourlyRateSnapshotCents: number;
  adminNotes: string | null;
  status: string;
  autoBreakRule: boolean;
}

export function AdjustClient({ session }: { session: SessionData }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button className="text-brand-600 text-sm hover:underline" onClick={() => setOpen(true)}>Adjust</button>
      {open && <AdjustForm session={session} onClose={() => { setOpen(false); router.refresh(); }} />}
    </>
  );
}

function AdjustForm({ session, onClose }: { session: SessionData; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [clockInDate, setClockInDate] = useState(toDateInputValue(session.clockInAt));
  const [clockInTime, setClockInTime] = useState(toTimeInputValue(session.clockInAt));
  const [clockOutDate, setClockOutDate] = useState(toDateInputValue(session.clockOutAt) || toDateInputValue(session.clockInAt));
  const [clockOutTime, setClockOutTime] = useState(toTimeInputValue(session.clockOutAt));
  const [breakOverridden, setBreakOverridden] = useState(session.breakOverridden);
  const [breakDeductHours, setBreakDeductHours] = useState(((session.breakDeductMinutes ?? 0) / 60).toFixed(2));
  const [hourlyRate, setHourlyRate] = useState((session.hourlyRateSnapshotCents / 100).toFixed(2));
  const [adminNotes, setAdminNotes] = useState(session.adminNotes || '');
  const [reason, setReason] = useState('Correct clock-out time');

  // Live recalc preview
  const preview = useMemo(() => {
    try {
      const ciDate = parseDate(clockInDate);
      const cIn = parseTime(ciDate, clockInTime);
      const cOut = clockOutDate && clockOutTime ? parseTime(parseDate(clockOutDate), clockOutTime) : null;
      const rateCents = Math.round(Number(hourlyRate || '0') * 100);
      const breakMin = breakOverridden ? Math.max(0, Math.round(Number(breakDeductHours || '0') * 60)) : null;
      return recalc({
        clockInAt: cIn, clockOutAt: cOut,
        breakOverridden,
        breakDeductOverrideMinutes: breakMin,
        hourlyRateSnapshotCents: rateCents,
        autoBreakRule: session.autoBreakRule,
      });
    } catch { return null; }
  }, [clockInDate, clockInTime, clockOutDate, clockOutTime, hourlyRate, breakDeductHours, breakOverridden, session.autoBreakRule]);

  async function doSubmit(extra?: Record<string, string>) {
    setErr(null);
    const fd = new FormData();
    fd.set('id', session.id);
    fd.set('clockInDate', clockInDate);
    fd.set('clockInTime', clockInTime);
    fd.set('clockOutDate', clockOutDate);
    fd.set('clockOutTime', clockOutTime);
    fd.set('breakDeductHours', breakDeductHours);
    if (breakOverridden) fd.set('breakOverridden', 'true');
    fd.set('hourlyRate', hourlyRate);
    fd.set('adminNotes', adminNotes);
    fd.set('reason', reason);
    if (extra) for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    start(async () => {
      const res = await adjustAttendance({ ok: false }, fd);
      if (!res.ok) { setErr(res.error || 'Failed'); return; }
      onClose();
    });
  }

  async function onCancelSession() {
    if (!confirm('Cancel this attendance session? It will be excluded from payroll.')) return;
    await doSubmit({ cancel: 'true', reason: reason || 'Cancelled' });
  }

  return (
    <SlideOver
      open
      onClose={onClose}
      title="Adjust Attendance"
      subtitle={`${session.staffName} · ${session.eventName}`}
      width="w-[480px]"
      footer={
        <div className="flex items-center justify-between">
          <button onClick={onCancelSession} disabled={pending} className="text-rose-600 text-sm hover:underline">Cancel Session</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={() => doSubmit()} disabled={pending} className="btn-primary">{pending ? 'Saving…' : 'Save Adjustment'}</button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Clock In Date</label>
            <input type="date" className="input" value={clockInDate} onChange={(e) => setClockInDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Clock In Time</label>
            <input type="time" className="input" value={clockInTime} onChange={(e) => setClockInTime(e.target.value)} />
          </div>
          <div>
            <label className="label">Clock Out Date</label>
            <input type="date" className="input" value={clockOutDate} onChange={(e) => setClockOutDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Clock Out Time</label>
            <input type="time" className="input" value={clockOutTime} onChange={(e) => setClockOutTime(e.target.value)} />
          </div>
        </div>

        <div className="border-t border-ink-200 pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={breakOverridden} onChange={(e) => setBreakOverridden(e.target.checked)} />
            Override Break Deduct
          </label>
          <div className="mt-2">
            <label className="label">Break Deduct (hours)</label>
            <input className="input" value={breakDeductHours} onChange={(e) => setBreakDeductHours(e.target.value)} disabled={!breakOverridden} />
            {!breakOverridden && <p className="text-xs text-ink-500 mt-1">Auto break rule will apply.</p>}
          </div>
        </div>

        <div className="card card-pad bg-brand-50/40">
          <div className="text-xs text-ink-500 mb-1">Hourly Rate Snapshot</div>
          <input className="input" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
        </div>

        <div>
          <label className="label">Admin Notes</label>
          <textarea className="input min-h-[80px]" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} maxLength={250} />
          <div className="text-xs text-ink-400 text-right">{adminNotes.length} / 250</div>
        </div>

        <div>
          <label className="label">Reason for Adjustment</label>
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Correct clock-out time</option>
            <option>Correct clock-in time</option>
            <option>Forgot to clock out</option>
            <option>Manual entry by admin</option>
            <option>Other</option>
          </select>
        </div>

        {preview && (
          <div className="card card-pad bg-emerald-50/30">
            <div className="text-xs font-medium text-ink-700 mb-2">Recalculation Preview</div>
            <PreviewRow label="Gross Hours"   value={fmtHrs(preview.grossMinutes)} />
            <PreviewRow label="Break Deduct"  value={fmtHrs(preview.breakDeductMinutes)} />
            <PreviewRow label="Payable Hours" value={fmtHrs(preview.payableMinutes)} />
            <PreviewRow label="Total Pay"     value={preview.totalPayCents != null ? `RM ${(preview.totalPayCents/100).toFixed(2)}` : '–'} bold />
          </div>
        )}

        {err && <div className="text-sm text-rose-600">{err}</div>}
      </div>
    </SlideOver>
  );
}

function PreviewRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-ink-500">{label}</span>
      <span className={bold ? 'font-semibold' : ''}>{value}</span>
    </div>
  );
}

function fmtHrs(min: number | null) { return min == null ? '–' : (min / 60).toFixed(2); }
function parseDate(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, (m||1)-1, d||1) - 8*60*60_000); }
function parseTime(base: Date, t: string) { const [h, mi] = t.split(':').map(Number); const start = new Date(base); return new Date(start.getTime() + ((h||0)*60 + (mi||0))*60_000); }
