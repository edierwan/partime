import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function StatCard({
  label, value, hint, icon, accent = 'blue',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'sky';
}) {
  const accents: Record<string, string> = {
    blue:   'bg-brand-50 text-brand-600',
    green:  'bg-emerald-50 text-emerald-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
    sky:    'bg-sky-50 text-sky-600',
  };
  return (
    <div className="card card-pad flex items-start gap-4">
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-lg', accents[accent])}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-ink-500 font-medium">{label}</div>
        <div className="text-2xl font-semibold text-ink-900 mt-0.5 leading-tight">{value}</div>
        {hint && <div className="text-xs text-ink-500 mt-1">{hint}</div>}
      </div>
    </div>
  );
}
