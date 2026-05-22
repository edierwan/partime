'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SlideOver } from '@/components/SlideOver';
import { saveStaff, deactivateStaff, activateStaff } from './actions';

interface StaffData {
  id?: string;
  payName: string; alias: string; fullName: string; phone: string;
  bankName: string | null; bankAccount: string | null;
  hourlyRateCents: number; active: boolean; notes: string | null;
}

export function StaffClient({ mode, staff }: { mode: 'addButton' | 'row'; staff?: StaffData }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function close() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {mode === 'addButton' && (
        <button className="btn-primary" onClick={() => setOpen(true)}>+ Add Staff</button>
      )}
      {mode === 'row' && (
        <button className="text-brand-600 text-sm hover:underline" onClick={() => setOpen(true)}>Edit</button>
      )}
      {open && (
        <StaffForm initial={staff} onClose={close} />
      )}
    </>
  );
}

function StaffForm({ initial, onClose }: { initial?: StaffData; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});
  const isEdit = !!initial?.id;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null); setFieldErrs({});
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await saveStaff({ ok: false }, fd);
      if (!res.ok) {
        setErr(res.error || 'Failed');
        setFieldErrs(res.fieldErrors || {});
        return;
      }
      onClose();
    });
  }

  async function onDeactivate() {
    if (!initial?.id) return;
    if (!confirm('Deactivate this staff?')) return;
    start(async () => { await deactivateStaff(initial.id!); onClose(); });
  }
  async function onActivate() {
    if (!initial?.id) return;
    start(async () => { await activateStaff(initial.id!); onClose(); });
  }

  return (
    <SlideOver
      open
      onClose={onClose}
      title={isEdit ? 'Edit Staff' : 'Add Staff'}
      subtitle={isEdit ? 'Update details for this staff.' : 'Add a new staff to the system.'}
      footer={
        <div className="flex items-center justify-between">
          {isEdit ? (
            initial?.active ? (
              <button type="button" onClick={onDeactivate} disabled={pending} className="text-rose-600 text-sm hover:underline">Deactivate</button>
            ) : (
              <button type="button" onClick={onActivate} disabled={pending} className="text-emerald-600 text-sm hover:underline">Activate</button>
            )
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" form="staff-form" disabled={pending} className="btn-primary">{pending ? 'Saving…' : 'Save Staff'}</button>
          </div>
        </div>
      }
    >
      <form id="staff-form" onSubmit={onSubmit} className="space-y-4">
        {initial?.id && <input type="hidden" name="id" value={initial.id} />}
        <Field name="payName"   label="Pay Name"          placeholder="e.g. nur.sya"        defaultValue={initial?.payName}   error={fieldErrs.payName} />
        <Field name="alias"     label="Alias / Match Key" placeholder="e.g. NURSYA01"       defaultValue={initial?.alias}     error={fieldErrs.alias} />
        <Field name="fullName"  label="Full Name"         placeholder="e.g. Nur Syafiqah"   defaultValue={initial?.fullName}  error={fieldErrs.fullName} />
        <Field name="phone"     label="Phone Number"      placeholder="e.g. +60 12-345 6789" defaultValue={initial?.phone}    error={fieldErrs.phone} />
        <Field name="bankName"  label="Bank"              placeholder="Select bank"          defaultValue={initial?.bankName || ''} />
        <div>
          <label className="label">Account No.</label>
          <input className="input" name="bankAccount" placeholder="e.g. 123456789012" defaultValue={initial?.bankAccount || ''} />
          <p className="text-xs text-ink-500 mt-1">Required for payment processing reference.</p>
        </div>
        <Field
          name="hourlyRate" label="Default Hourly Rate (RM)" placeholder="e.g. 18.00"
          defaultValue={initial ? (initial.hourlyRateCents / 100).toFixed(2) : ''}
        />
        <div>
          <label className="label">Notes (Optional)</label>
          <textarea className="input min-h-[80px]" name="notes" placeholder="Add any notes about this staff…" defaultValue={initial?.notes || ''} />
        </div>
        <div className="flex items-center justify-between border-t border-ink-200 pt-4">
          <div>
            <div className="text-sm font-medium">Active</div>
            <div className="text-xs text-ink-500">Staff is active and can be assigned to events.</div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="sr-only peer" />
            <span className="w-10 h-6 bg-ink-200 rounded-full relative peer-checked:bg-brand-500 transition after:absolute after:content-[''] after:h-5 after:w-5 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 peer-checked:after:translate-x-4 after:transition" />
          </label>
        </div>
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
