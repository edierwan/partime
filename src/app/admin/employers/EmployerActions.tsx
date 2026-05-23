'use client';

import { useTransition } from 'react';
import { approveEmployerRegistration, rejectEmployerRegistration } from './actions';

export function EmployerActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex justify-end gap-2">
      {status !== 'APPROVED' && (
        <button type="button" disabled={pending} onClick={() => start(async () => approveEmployerRegistration(id))} className="text-sm font-medium text-emerald-700 hover:underline">
          Approve
        </button>
      )}
      {status !== 'REJECTED' && (
        <button type="button" disabled={pending} onClick={() => {
          const reason = window.prompt('Reject reason (optional)') || undefined;
          start(async () => rejectEmployerRegistration(id, reason));
        }} className="text-sm font-medium text-rose-600 hover:underline">
          Reject
        </button>
      )}
    </div>
  );
}