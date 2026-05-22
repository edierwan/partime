/**
 * Calculation rules for Partime attendance.
 * - Money: integer cents.
 * - Duration: integer minutes.
 * - Timestamps: UTC.
 */

export function computeGrossMinutes(clockInAt: Date, clockOutAt: Date | null | undefined): number | null {
  if (!clockOutAt) return null;
  return Math.max(0, Math.round((clockOutAt.getTime() - clockInAt.getTime()) / 60_000));
}

/** Auto break deduct rule. */
export function autoBreakDeductMinutes(grossMinutes: number | null | undefined): number {
  if (grossMinutes == null) return 0;
  if (grossMinutes < 5 * 60) return 0;
  if (grossMinutes < 8 * 60) return 30;
  return 60;
}

export function computePayableMinutes(grossMinutes: number | null, breakDeductMinutes: number): number | null {
  if (grossMinutes == null) return null;
  return Math.max(0, grossMinutes - breakDeductMinutes);
}

export function computeTotalPayCents(payableMinutes: number | null, rateCents: number): number | null {
  if (payableMinutes == null) return null;
  return Math.round((payableMinutes / 60) * rateCents);
}

export interface RecalcInput {
  clockInAt: Date;
  clockOutAt: Date | null;
  breakOverridden: boolean;
  breakDeductOverrideMinutes: number | null;
  hourlyRateSnapshotCents: number;
  autoBreakRule: boolean;
}

export interface RecalcOutput {
  grossMinutes: number | null;
  breakDeductMinutes: number | null;
  payableMinutes: number | null;
  totalPayCents: number | null;
}

export function recalc(input: RecalcInput): RecalcOutput {
  const grossMinutes = computeGrossMinutes(input.clockInAt, input.clockOutAt);
  let breakDeductMinutes: number | null = null;
  if (grossMinutes != null) {
    breakDeductMinutes = input.breakOverridden && input.breakDeductOverrideMinutes != null
      ? Math.max(0, input.breakDeductOverrideMinutes)
      : (input.autoBreakRule ? autoBreakDeductMinutes(grossMinutes) : 0);
  }
  const payableMinutes = breakDeductMinutes == null ? null : computePayableMinutes(grossMinutes, breakDeductMinutes);
  const totalPayCents = computeTotalPayCents(payableMinutes, input.hourlyRateSnapshotCents);
  return { grossMinutes, breakDeductMinutes, payableMinutes, totalPayCents };
}

/** A session is "missing clock out" if it's been open more than 16h. */
export function isMissingClockOut(now: Date, clockInAt: Date, clockOutAt: Date | null | undefined): boolean {
  if (clockOutAt) return false;
  return now.getTime() - clockInAt.getTime() > 16 * 60 * 60_000;
}
