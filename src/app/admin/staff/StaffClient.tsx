'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SlideOver } from '@/components/SlideOver';
import { Avatar } from '@/components/Avatar';
import { activateStaff, deactivateStaff, saveStaff, setStaffApprovalStatus } from './actions';
import { MALAYSIA_BANK_OPTIONS, NATIONALITY_OPTIONS, displayGender, formatIcNumber, genderFromIc, normalizeIcNumber } from '@/lib/staff';

interface StaffData {
  id?: string;
  payName: string;
  aliasPanggilan: string;
  fullName: string;
  icNumberDisplay: string | null;
  gender: 'LELAKI' | 'PEREMPUAN' | 'UNKNOWN' | 'TIDAK_DINYATAKAN';
  nationality: string;
  otherNationality: string | null;
  passportNumber: string | null;
  phoneDisplay: string;
  email: string | null;
  bankCode: string | null;
  bankName: string | null;
  customBankName: string | null;
  bankAccountNumber: string | null;
  profileImageUrl: string | null;
  approvalStatus: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';
  status: 'PENDING_OTP' | 'PENDING_REVIEW' | 'ACTIVE' | 'INACTIVE' | 'REJECTED' | 'SUSPENDED';
  preferredLocation: string | null;
  active: boolean;
  notes: string | null;
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
        <button className="btn-primary" onClick={() => setOpen(true)}>+ Add Part-timer</button>
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
  const [icInput, setIcInput] = useState(initial?.icNumberDisplay || '');
  const [bankCode, setBankCode] = useState(initial?.bankCode || '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial?.profileImageUrl || null);
  const isEdit = !!initial?.id;
  const derivedGender = genderFromIc(normalizeIcNumber(icInput || ''));

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
    if (!confirm('Deactivate this part-timer?')) return;
    start(async () => { await deactivateStaff(initial.id!); onClose(); });
  }
  async function onActivate() {
    if (!initial?.id) return;
    start(async () => { await activateStaff(initial.id!); onClose(); });
  }
  async function onApprove() {
    if (!initial?.id) return;
    start(async () => { await setStaffApprovalStatus(initial.id!, 'APPROVED'); onClose(); });
  }
  async function onMarkPending() {
    if (!initial?.id) return;
    start(async () => { await setStaffApprovalStatus(initial.id!, 'PENDING_REVIEW'); onClose(); });
  }
  async function onReject() {
    if (!initial?.id) return;
    if (!confirm('Reject this part-timer profile?')) return;
    start(async () => { await setStaffApprovalStatus(initial.id!, 'REJECTED'); onClose(); });
  }

  return (
    <SlideOver
      open
      onClose={onClose}
      title={isEdit ? 'Edit Part-timer' : 'Add Part-timer'}
      subtitle={isEdit ? 'Update details for this part-timer.' : 'Add a new part-timer to the system.'}
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            {isEdit ? (
              <>
                {initial?.active ? (
                  <button type="button" onClick={onDeactivate} disabled={pending} className="text-rose-600 hover:underline">Deactivate</button>
                ) : (
                  <button type="button" onClick={onActivate} disabled={pending} className="text-emerald-600 hover:underline">Activate</button>
                )}
                {initial?.approvalStatus !== 'APPROVED' && (
                  <button type="button" onClick={onApprove} disabled={pending} className="text-emerald-700 hover:underline">Approve</button>
                )}
                {initial?.approvalStatus !== 'PENDING_REVIEW' && (
                  <button type="button" onClick={onMarkPending} disabled={pending} className="text-amber-700 hover:underline">Mark Pending</button>
                )}
                {initial?.approvalStatus !== 'REJECTED' && (
                  <button type="button" onClick={onReject} disabled={pending} className="text-rose-600 hover:underline">Reject</button>
                )}
              </>
            ) : <span />}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" form="staff-form" disabled={pending} className="btn-primary">{pending ? 'Saving…' : 'Save Part-timer'}</button>
          </div>
        </div>
      }
    >
      <form id="staff-form" onSubmit={onSubmit} className="space-y-4">
        {initial?.id && <input type="hidden" name="id" value={initial.id} />}
        <div className="flex items-start gap-4 rounded-2xl border border-ink-200 bg-ink-50/70 p-4">
          <Avatar name={initial?.fullName || 'New Part-timer'} src={previewUrl} className="h-16 w-16 text-base" />
          <div className="flex-1 space-y-2">
            <div>
              <label className="label">Profile Photo</label>
              <input
                className="input px-3 py-2"
                type="file"
                name="profileImage"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const next = event.target.files?.[0];
                  if (!next) return;
                  setPreviewUrl((current) => {
                    if (current && current.startsWith('blob:')) URL.revokeObjectURL(current);
                    return URL.createObjectURL(next);
                  });
                }}
              />
              <p className="text-xs text-ink-500 mt-1">JPG, PNG, or WEBP up to 2MB.</p>
              {fieldErrs.profileImage && <p className="text-xs text-rose-600 mt-1">{fieldErrs.profileImage}</p>}
            </div>
            {initial?.profileImageUrl && (
              <label className="inline-flex items-center gap-2 text-sm text-ink-600">
                <input type="checkbox" name="removeProfileImage" />
                Remove current profile photo
              </label>
            )}
          </div>
        </div>

        <Field name="fullName" label="Full Name" placeholder="e.g. Nur Syafiqah" defaultValue={initial?.fullName} error={fieldErrs.fullName} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field name="payName" label="Pay Name" placeholder="e.g. nur.sya" defaultValue={initial?.payName} error={fieldErrs.payName} />
          <Field name="aliasPanggilan" label="Alias Panggilan" placeholder="e.g. NURSYA01" defaultValue={initial?.aliasPanggilan} error={fieldErrs.aliasPanggilan} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field name="phone" label="Phone Number" placeholder="e.g. +60 12-345 6789" defaultValue={initial?.phoneDisplay} error={fieldErrs.phone} inputMode="tel" />
          <Field name="email" label="Email (Optional)" placeholder="e.g. nur@example.com" defaultValue={initial?.email || ''} error={fieldErrs.email} inputMode="email" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">IC Number</label>
            <input
              className="input"
              name="icNumber"
              inputMode="numeric"
              placeholder="e.g. 010203-10-1234"
              value={icInput}
              onChange={(event) => setIcInput(event.target.value)}
              onBlur={() => setIcInput((value) => formatIcNumber(normalizeIcNumber(value) || value))}
            />
            <p className="text-xs text-ink-500 mt-1">Jantina auto-derives from the final IC digit unless manually overridden.</p>
            {fieldErrs.icNumber && <p className="text-xs text-rose-600 mt-1">{fieldErrs.icNumber}</p>}
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" name="gender" defaultValue="AUTO">
              <option value="AUTO">Auto from IC ({displayGender(derivedGender === 'TIDAK_DINYATAKAN' ? initial?.gender || 'TIDAK_DINYATAKAN' : derivedGender)})</option>
              <option value="LELAKI">Lelaki</option>
              <option value="PEREMPUAN">Perempuan</option>
              <option value="TIDAK_DINYATAKAN">Tidak Dinyatakan</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Nationality</label>
            <select className="input" name="nationality" defaultValue={initial?.nationality || 'Malaysia'}>
              {NATIONALITY_OPTIONS.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
            </select>
          </div>
          <Field name="passportNumber" label="Passport No. (If applicable)" defaultValue={initial?.passportNumber || ''} error={fieldErrs.passportNumber} />
        </div>
        <Field name="preferredLocation" label="Preferred Work Location" placeholder="e.g. Kuala Lumpur" defaultValue={initial?.preferredLocation || ''} error={fieldErrs.preferredLocation} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Bank</label>
            <select className="input" name="bankCode" value={bankCode} onChange={(event) => setBankCode(event.target.value)}>
              <option value="">Select bank</option>
              {MALAYSIA_BANK_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>{option.label}</option>
              ))}
            </select>
            {fieldErrs.bankCode && <p className="text-xs text-rose-600 mt-1">{fieldErrs.bankCode}</p>}
          </div>
          <Field
            name="bankAccountNumber"
            label="Bank Account Number"
            placeholder="e.g. 123456789012"
            defaultValue={initial?.bankAccountNumber || ''}
            error={fieldErrs.bankAccountNumber}
            inputMode="numeric"
          />
        </div>
        {bankCode === 'OTHER' && (
          <Field
            name="customBankName"
            label="Custom Bank Name"
            placeholder="e.g. GX Bank"
            defaultValue={initial?.customBankName || initial?.bankName || ''}
            error={fieldErrs.customBankName}
          />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Approval Status</label>
            <select className="input" name="approvalStatus" defaultValue={initial?.approvalStatus || 'APPROVED'}>
              <option value="APPROVED">Approved</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div className="rounded-2xl border border-ink-200 bg-ink-50/70 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-ink-500">Derived Gender</div>
            <div className="mt-1 text-sm font-medium text-ink-900">{displayGender(derivedGender)}</div>
          </div>
        </div>
        <div>
          <label className="label">Part-timer Status</label>
          <select className="input" name="status" defaultValue={initial?.status || 'ACTIVE'}>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="INACTIVE">Inactive</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
        <div>
          <label className="label">Notes (Optional)</label>
          <textarea className="input min-h-[80px]" name="notes" placeholder="Add any notes about this part-timer…" defaultValue={initial?.notes || ''} />
        </div>
        <div className="flex items-center justify-between border-t border-ink-200 pt-4">
          <div>
            <div className="text-sm font-medium">Active</div>
            <div className="text-xs text-ink-500">Part-timer is active and can be assigned to events.</div>
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

function Field({
  name,
  label,
  placeholder,
  defaultValue,
  error,
  inputMode,
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  error?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" name={name} placeholder={placeholder} defaultValue={defaultValue || ''} inputMode={inputMode} />
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
