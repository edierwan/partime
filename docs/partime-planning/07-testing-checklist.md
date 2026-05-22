# 07 — Testing Checklist

## Auth
- [ ] `/login` rejects bad credentials.
- [ ] Successful login sets cookie and redirects to `/admin`.
- [ ] `/admin/*` redirects to `/login` when unauthenticated.
- [ ] `/scan/[token]` is public.

## Staff
- [ ] Create staff.
- [ ] Edit staff.
- [ ] Deactivate staff (still listed when filter = Inactive).
- [ ] Search by name / alias / phone.
- [ ] Missing bank info badge visible.

## Events / QR
- [ ] Create event generates unique token.
- [ ] QR page renders QR for full public URL.
- [ ] Print QR page hides admin chrome.
- [ ] Deactivating event blocks scan page.

## Public scan
- [ ] Phone or alias lookup finds correct staff.
- [ ] First scan creates OPEN session and shows Clock In success.
- [ ] Second scan same day shows Clock Out and computed totals.
- [ ] Third scan after completion blocks duplicate clock-in.
- [ ] Inactive event blocked with friendly message.
- [ ] Auto break deduct: < 5h = 0, 5–7:59 = 30, ≥ 8h = 60.

## Attendance
- [ ] Filters work for date / event / staff / status.
- [ ] Edit clock-in/out → recalculation preview shows new totals.
- [ ] Save → audit row written, status becomes MANUAL_ADJUSTED.
- [ ] Cancel session → CANCELLED status, excluded from totals.
- [ ] Sessions older than 16h with no clock-out show as MISSING_CLOCK_OUT.

## Reports
- [ ] Weekly payroll totals match sum of completed sessions in week.
- [ ] Daily report matches expected staff list and totals.
- [ ] CSV export downloads correct rows.
- [ ] Print view (browser print) is readable.
- [ ] Exceptions page shows missing clock-out, old open, staff w/o bank.

## Production
- [ ] `npm run build` passes.
- [ ] `/api/health` returns `{ ok: true, db: true }`.
- [ ] App serves on `0.0.0.0:3000`.
- [ ] No bank account number in server logs.
- [ ] Coolify deploy succeeds at https://partime.getouch.co.
