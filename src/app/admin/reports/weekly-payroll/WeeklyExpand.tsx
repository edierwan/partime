'use client';

import { useState } from 'react';
import { Badge } from '@/components/Badge';
import { StatusBadge } from '@/components/Badge';
import { formatHours, formatMYR, maskAccount } from '@/lib/money';
import { formatDate, formatTime } from '@/lib/time';

interface Row {
  id: string; workDate: Date; eventName: string;
  clockInAt: Date; clockOutAt: Date | null;
  grossMinutes: number | null; breakDeductMinutes: number | null;
  payableMinutes: number | null; hourlyRateSnapshotCents: number;
  totalPayCents: number | null; status: string;
}

export function WeeklyExpand({
  staff, rows, totals,
}: {
  staff: { id: string; payName: string; alias: string; fullName: string; phone: string; bankName: string | null; bankAccount: string | null };
  rows: Row[];
  totals: { days: number; gross: number; deduct: number; payable: number; pay: number; hasMissing: boolean };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="hover:bg-ink-50/60">
        <td className="w-8">
          <button onClick={() => setOpen((v) => !v)} className="text-ink-500 hover:text-ink-900">{open ? '▾' : '▸'}</button>
        </td>
        <td className="font-medium">{staff.payName}</td>
        <td className="text-ink-600 uppercase text-xs">{staff.alias}</td>
        <td>{staff.fullName}</td>
        <td className="text-ink-600">{staff.phone}</td>
        <td>{staff.bankName || '—'}</td>
        <td className="text-ink-600">{maskAccount(staff.bankAccount)}</td>
        <td className="text-right">{totals.days}</td>
        <td className="text-right">{formatHours(totals.gross)}</td>
        <td className="text-right">{formatHours(totals.deduct)}</td>
        <td className="text-right">{formatHours(totals.payable)}</td>
        <td className="text-right font-semibold">{formatMYR(totals.pay)}</td>
        <td className="space-x-1">
          {totals.hasMissing && <Badge variant="red">Missing Clock-out</Badge>}
          {!staff.bankAccount && <Badge variant="amber">Missing Bank Info</Badge>}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={13} className="bg-ink-50/60 p-0">
            <div className="p-4">
              <div className="text-xs font-medium text-ink-500 mb-2">Daily Breakdown for {staff.fullName}</div>
              <table className="table-base bg-white rounded-xl overflow-hidden border border-ink-200">
                <thead>
                  <tr>
                    <th>Date</th><th>Event</th><th>Clock In</th><th>Clock Out</th>
                    <th className="text-right">Gross</th><th className="text-right">Deduct</th>
                    <th className="text-right">Hours</th><th className="text-right">Rate</th>
                    <th className="text-right">Total</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDate(r.workDate)}</td>
                      <td className="text-ink-600">{r.eventName}</td>
                      <td>{formatTime(r.clockInAt)}</td>
                      <td>{r.clockOutAt ? formatTime(r.clockOutAt) : '–'}</td>
                      <td className="text-right">{formatHours(r.grossMinutes)}</td>
                      <td className="text-right">{formatHours(r.breakDeductMinutes)}</td>
                      <td className="text-right">{formatHours(r.payableMinutes)}</td>
                      <td className="text-right">{formatMYR(r.hourlyRateSnapshotCents)}</td>
                      <td className="text-right">{r.totalPayCents != null ? formatMYR(r.totalPayCents) : '–'}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
