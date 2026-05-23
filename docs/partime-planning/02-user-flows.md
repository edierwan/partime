# 02 — User Flows

## Admin login
1. Visit `/login`.
2. Submit email + password.
3. Server verifies hash, issues signed JWT cookie.
4. Redirect to `/admin`.

## Admin creates staff
1. `/admin/staff` → **Add Staff**.
2. Fill form (pay name, alias, full name, IC, gender, phone, email, bank, profile photo, notes).
3. Save → row appears in staff table.

## Staff self-registers
1. Visit `/register` from the login page.
2. Fill profile form and request WhatsApp OTP.
3. Enter 4-digit OTP.
4. System creates a `PENDING_REVIEW` staff profile.
5. Staff waits for admin approval before clock-in unless pending access is enabled.

## Admin creates event
1. `/admin/events` → **Create Event**.
2. Fill name, location, date, rate, break rule, notes.
3. Save → event row + unique scan token generated.
4. Open QR page → print or copy public scan URL.

## Admin prints QR
1. `/admin/events/[id]/qr` → print-friendly view.
2. Click **Print** → browser print dialog.

## Staff clock in
1. Scan QR with phone → open `/scan/[token]`.
2. Enter phone, email, or alias → tap **Find**.
3. Tap **Clock In** → confirmation card with clock-in time.

## Admin reviews pending staff
1. `/admin/staff` → filter **Pending Review**.
2. Open staff row or use quick action.
3. Approve, keep pending, or reject.

## Staff clock out
1. Re-open `/scan/[token]`, enter phone/email/alias.
2. System detects existing OPEN session → shows **Clock Out**.
3. Tap **Clock Out** → success card with gross / break / payable / total pay.

## Admin reviews attendance
1. `/admin/attendance` → filter by date / event / status.
2. Click row → **Adjust Attendance** slide-over.
3. Edit times / break / rate / notes → **Recalculate** → **Save**.

## Admin fixes missing clock-out
1. `/admin/reports/exceptions` → click missing clock-out row.
2. Opens attendance adjust slide-over → set clock-out time → save.

## Admin reviews weekly payroll
1. `/admin/reports/weekly-payroll`.
2. Pick week, optional event / staff filter.
3. Review per-staff totals → expand for daily breakdown.
4. **Print** or **Export CSV** for manual payment.
