# 07 — Testing Checklist

## Auth
- [ ] `/login` rejects bad credentials.
- [ ] Successful login sets cookie and redirects to `/admin`.
- [ ] `/admin/*` redirects to `/login` when unauthenticated.
- [ ] `/scan/[token]` is public.
- [ ] `/register` and `/api/public/register/*` are public.

## Staff
- [ ] Create staff.
- [ ] Edit staff.
- [ ] Deactivate staff (still listed when filter = Inactive).
- [ ] Search by name / alias / phone / email.
- [ ] Missing bank info badge visible.
- [ ] Pending review filter and quick actions work.
- [ ] IC validation and derived gender work.
- [ ] Profile photo upload works with S3 or local fallback.

## Events / QR
- [ ] Create event generates unique token.
- [ ] QR page renders QR for full public URL.
- [ ] Print QR page hides admin chrome.
- [ ] Deactivating event blocks scan page.

## Public scan
- [ ] Phone, email, or alias lookup finds correct staff.
- [ ] First scan creates OPEN session and shows Clock In success.
- [ ] Second scan same day shows Clock Out and computed totals.
- [ ] Third scan after completion blocks duplicate clock-in.
- [ ] Inactive event blocked with friendly message.
- [ ] Pending-review staff see warning and stay blocked unless setting is enabled.
- [ ] Auto break deduct: < 5h = 0, 5–7:59 = 30, ≥ 8h = 60.

## Public registration
- [ ] Valid registration form sends WhatsApp OTP.
- [ ] OTP verify creates `PENDING_REVIEW` staff.
- [ ] Duplicate phone/email/IC/alias returns safe generic failure.
- [ ] OTP send rate limit works per phone and IP.
- [ ] Expired / wrong OTP is rejected.

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
- [ ] `prisma migrate deploy` applies the staff-profile + OTP migration cleanly.
- [ ] Coolify deploy succeeds at https://partime.getouch.co.
