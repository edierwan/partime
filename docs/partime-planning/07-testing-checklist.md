# 07 — Testing Checklist

## Auth
- [ ] `/login` rejects bad credentials.
- [ ] Successful login sets cookie and redirects to `/admin`.
- [ ] `/admin/*` redirects to `/login` when unauthenticated.
- [ ] `/scan/[token]` is public.
- [ ] `/register`, `/register/part-timer`, `/register/employer`, and `/api/public/*` registration endpoints are public.

## Part-timers
- [ ] Create part-timer.
- [ ] Edit part-timer.
- [ ] Deactivate part-timer (still listed when filter = Inactive).
- [ ] Search by name / alias / phone / email.
- [ ] Missing bank info badge visible.
- [ ] Pending review filter and quick actions work.
- [ ] IC validation and derived gender work.
- [ ] Non-Malaysian nationality requires passport number.
- [ ] Skills filter and selected skills display work.
- [ ] Profile photo upload works with S3 or local fallback.

## Employers / Tenants
- [ ] Employer registration creates pending tenant and employer registration.
- [ ] Admin approve sets employer registration approved and tenant active.
- [ ] Admin reject sets employer registration rejected and tenant rejected.
- [ ] Event creation can assign an employer.

## Events / QR
- [ ] Create event generates unique token.
- [ ] QR page renders QR for full public URL.
- [ ] Print QR page hides admin chrome.
- [ ] Deactivating event blocks scan page.

## Public scan
- [ ] Phone, email, or alias lookup finds correct part-timer.
- [ ] First scan creates OPEN session and shows Clock In success.
- [ ] Second scan same day shows Clock Out and computed totals.
- [ ] Third scan after completion blocks duplicate clock-in.
- [ ] Inactive event blocked with friendly message.
- [ ] Pending-review part-timers see warning and stay blocked unless setting is enabled.
- [ ] Tenant pending/blocked approval blocks clock-in for that employer.
- [ ] Auto break deduct: < 5h = 0, 5–7:59 = 30, ≥ 8h = 60.

## Public registration
- [ ] Public language selector persists `ms`, `id`, or `en`.
- [ ] Valid part-timer registration form sends WhatsApp OTP.
- [ ] OTP verify creates `PENDING_REVIEW` part-timer.
- [ ] Valid employer registration sends WhatsApp OTP and creates a pending tenant.
- [ ] Duplicate phone/email/IC/alias returns safe generic failure.
- [ ] OTP send rate limit works per phone and IP.
- [ ] Expired / wrong OTP is rejected.

## Attendance
- [ ] Filters work for date / employer / event / part-timer / status.
- [ ] Edit clock-in/out → recalculation preview shows new totals.
- [ ] Save → audit row written, status becomes MANUAL_ADJUSTED.
- [ ] Cancel session → CANCELLED status, excluded from totals.
- [ ] Sessions older than 16h with no clock-out show as MISSING_CLOCK_OUT.

## Reports
- [ ] Weekly payroll totals match sum of completed sessions in week.
- [ ] Daily report matches expected part-timer list and totals.
- [ ] CSV export downloads correct rows.
- [ ] Print view (browser print) is readable.
- [ ] Exceptions page shows missing clock-out, old open, part-timers w/o bank.

## Production
- [ ] `npm run build` passes.
- [ ] `/api/health` returns `{ ok: true, db: true }`.
- [ ] App serves on `0.0.0.0:3000`.
- [ ] No bank account number in server logs.
- [ ] `prisma migrate deploy` applies the staff-profile + OTP and multi-tenant migrations cleanly.
- [ ] S3 bucket `partime-prod` accepts list/upload/read/delete with the Partime-scoped key.
- [ ] Coolify deploy succeeds at https://partime.getouch.co.
