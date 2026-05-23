import { cn } from '@/lib/utils';

type Variant = 'green' | 'red' | 'amber' | 'blue' | 'zinc';

const map: Record<string, { variant: Variant; label: string }> = {
  OPEN:              { variant: 'green', label: 'OPEN' },
  COMPLETED:         { variant: 'green', label: 'COMPLETED' },
  MISSING_CLOCK_OUT: { variant: 'red',   label: 'MISSING CLOCK OUT' },
  MANUAL_ADJUSTED:   { variant: 'amber', label: 'MANUAL ADJUSTED' },
  CANCELLED:         { variant: 'zinc',  label: 'CANCELLED' },
  ACTIVE:            { variant: 'green', label: 'ACTIVE' },
  INACTIVE:          { variant: 'red',   label: 'INACTIVE' },
  PENDING_OTP:       { variant: 'amber', label: 'PENDING OTP' },
  PENDING_REVIEW:    { variant: 'amber', label: 'PENDING REVIEW' },
  REJECTED:          { variant: 'red',   label: 'REJECTED' },
  SUSPENDED:         { variant: 'red',   label: 'SUSPENDED' },
  APPROVED:          { variant: 'green', label: 'APPROVED' },
  BLOCKED:           { variant: 'red',   label: 'BLOCKED' },
  PRINTED:           { variant: 'green', label: 'PRINTED' },
  NOT_PRINTED:       { variant: 'zinc',  label: 'NOT PRINTED' },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = map[status] ?? { variant: 'zinc' as Variant, label: status };
  return <span className={cn(`badge-${cfg.variant}`)}>{cfg.label}</span>;
}

export function Badge({ children, variant = 'zinc' }: { children: React.ReactNode; variant?: Variant }) {
  return <span className={cn(`badge-${variant}`)}>{children}</span>;
}
