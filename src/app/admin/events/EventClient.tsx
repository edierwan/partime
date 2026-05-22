'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SlideOver } from '@/components/SlideOver';
import { saveEvent, setEventActive } from './actions';
import { toDateInputValue } from '@/lib/time';

interface EventData {
  id?: string;
  name: string; location: string; workDate: Date;
  defaultRateCents: number; autoBreakRule: boolean; active: boolean; notes: string | null;
}

export function EventClient({ mode, event }: { mode: 'addButton' | 'row'; event?: EventData }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  function close() { setOpen(false); router.refresh(); }
  return (
    <>
      {mode === 'addButton'
        ? <button className="btn-primary" onClick={() => setOpen(true)}>+ Create Event</button>
        : <button className="text-brand-600 text-sm hover:underline" onClick={() => setOpen(true)}>Edit</button>}
      {open && <EventForm initial={event} onClose={close} />}
    </>
  );
}

function EventForm({ initial, onClose }: { initial?: EventData; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null); setFieldErrs({});
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await saveEvent({ ok: false }, fd);
      if (!res.ok) { setErr(res.error || 'Failed'); setFieldErrs(res.fieldErrors || {}); return; }
      onClose();
    });
  }

  return (
    <SlideOver
      open
      onClose={onClose}
      title={initial?.id ? 'Edit Event' : 'Create Event'}
      subtitle="Generate a public QR for staff attendance."
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button form="event-form" type="submit" disabled={pending} className="btn-primary">{pending ? 'Saving…' : initial?.id ? 'Save Event' : 'Create Event'}</button>
        </div>
      }
    >
      <form id="event-form" onSubmit={onSubmit} className="space-y-4">
        {initial?.id && <input type="hidden" name="id" value={initial.id} />}
        <Field name="name" label="Event Name *" placeholder="e.g. Mid Valley Promo" defaultValue={initial?.name} error={fieldErrs.name} />
        <Field name="location" label="Location *" placeholder="e.g. Mid Valley, Kuala Lumpur" defaultValue={initial?.location} error={fieldErrs.location} />
        <div>
          <label className="label">Work Date *</label>
          <input className="input" type="date" name="workDate" defaultValue={toDateInputValue(initial?.workDate)} />
          {fieldErrs.workDate && <p className="text-xs text-rose-600 mt-1">{fieldErrs.workDate}</p>}
        </div>
        <Field name="defaultRate" label="Default Hourly Rate (RM) *" placeholder="e.g. 15.00" defaultValue={initial ? (initial.defaultRateCents/100).toFixed(2) : ''} />
        <Toggle name="autoBreakRule" label="Auto Break Rule" hint="Automatically deduct break time based on company policy." defaultChecked={initial?.autoBreakRule ?? true} />
        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-[70px]" name="notes" placeholder="e.g. Bring your staff ID and arrive 15 minutes early." defaultValue={initial?.notes || ''} />
        </div>
        <Toggle name="active" label="Active" hint="Event is active and visible to staff." defaultChecked={initial?.active ?? true} />
        {err && <div className="text-sm text-rose-600">{err}</div>}
      </form>
    </SlideOver>
  );
}

function Field({ name, label, placeholder, defaultValue, error }: { name: string; label: string; placeholder?: string; defaultValue?: string; error?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" name={name} placeholder={placeholder} defaultValue={defaultValue || ''} />
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between border-t border-ink-200 pt-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-ink-500">{hint}</div>}
      </div>
      <label className="inline-flex items-center cursor-pointer">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="sr-only peer" />
        <span className="w-10 h-6 bg-ink-200 rounded-full relative peer-checked:bg-brand-500 transition after:absolute after:content-[''] after:h-5 after:w-5 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 peer-checked:after:translate-x-4 after:transition" />
      </label>
    </div>
  );
}

export function EventToggle({ id, active }: { id: string; active: boolean }) {
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <label className="inline-flex items-center cursor-pointer">
      <input type="checkbox" defaultChecked={active}
        onChange={(e) => start(async () => { await setEventActive(id, e.target.checked); router.refresh(); })}
        className="sr-only peer"
      />
      <span className="w-10 h-6 bg-ink-200 rounded-full relative peer-checked:bg-emerald-500 transition after:absolute after:content-[''] after:h-5 after:w-5 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 peer-checked:after:translate-x-4 after:transition" />
    </label>
  );
}
