# 05 — Calculation Rules

## Storage
- Money: `Int` cents (MYR).
- Duration: `Int` minutes.
- Timestamps: UTC `DateTime`.

## Timezone
- Display, week grouping, day grouping → `Asia/Kuala_Lumpur`.
- "Today" = the calendar date in Kuala Lumpur.
- Weekly payroll: Monday 00:00 MYT → Sunday 23:59:59.999 MYT.

## Gross duration
```
grossMinutes = round((clockOutAt - clockInAt) / 60000)
```
If clockOut missing → `grossMinutes = null`, `status = MISSING_CLOCK_OUT`.

## Auto break deduct
```
if grossMinutes < 5 * 60        → 0
else if grossMinutes < 8 * 60   → 30
else                            → 60
```
If admin sets `breakDeductMinutes` and `breakOverridden = true`, that value
is used as-is.

## Payable
```
payableMinutes = max(0, grossMinutes - breakDeductMinutes)
```

## Total pay
```
totalPayCents = round(payableMinutes / 60 * hourlyRateSnapshotCents)
```

## Hourly rate snapshot
- Captured on **clock-in** from event's `defaultRateCents` only.
- Admin override updates `hourlyRateSnapshotCents` on the specific session
  only — never bulk-rewrites history.

## Pending review rule
- `PENDING_REVIEW` staff can be looked up on the scan page.
- Clock-in is blocked unless app setting `allow_pending_staff_clock_in = true`.
- Existing open sessions can still clock out.

## Exclusions from payroll totals
- `MISSING_CLOCK_OUT` sessions (until fixed).
- `CANCELLED` sessions.
- `OPEN` sessions (still in progress).

## Hours display
`(minutes / 60).toFixed(2)` (e.g. 8.08 hrs).
