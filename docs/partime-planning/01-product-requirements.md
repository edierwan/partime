# 01 — Product Requirements (MVP)

## 1. Admin Authentication
- `/login` — credentials login (email + password).
- Middleware protects all `/admin/*` routes.
- Seed one initial admin from env (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`).
- Passwords hashed with bcrypt.
- Sessions via signed JWT cookie (`AUTH_SECRET`).

## 2. Staff Management (`/admin/staff`)
Create / edit / deactivate staff. Fields:
- Pay name, Alias Panggilan / match key, Full name
- Malaysia mobile number, optional email
- IC number, derived gender with manual override
- Profile photo
- Bank selection, optional custom bank name, bank account number
- Approval status (`APPROVED | PENDING_REVIEW | REJECTED`)
- Active flag, Notes
Behaviour:
- Soft deactivate when attendance records exist.
- Search by name / alias / phone / email.
- Missing bank info shows a warning badge.
- Pending review shows a dedicated badge / filter / action.

## 3. Events / Work Sessions (`/admin/events`)
Create attendance sessions and generate a public QR token. Fields:
- Event name, Location
- Work date (single date for MVP — date range = create multiple)
- Default hourly rate
- Auto break rule enabled flag
- Active flag, Notes
- Unique public scan token

Actions: create, edit, activate / deactivate, view + print QR
(`/admin/events/[id]/qr`), copy public scan URL.

## 4. Public Scan (`/scan/[token]`)
Mobile-first. No login. Flow:
1. Show event card (name, location, date, hourly rate).
2. Staff types phone number, email, or alias.
3. System resolves staff:
   - No open attendance for this event today → show **Clock In** button.
   - Has open attendance → show open session details + **Clock Out** button.
   - Pending-review staff see a review message and can only clock in when admin allows pending access.
4. On submit show a success card. On clock-out show: clock-in time, clock-out
   time, gross hours, break deduct, payable hours, estimated total pay.
5. Capture IP, user-agent. Best-effort GPS (do not block).
6. Block if event inactive or wrong day.

## 5. Attendance Logs (`/admin/attendance`)
Filter by date range / event / staff / status. Status:
`OPEN | COMPLETED | MISSING_CLOCK_OUT | MANUAL_ADJUSTED | CANCELLED`.
Edit clock-in, clock-out, break deduct override, hourly rate snapshot
override, admin notes. Cancel session. Recalculation preview. All edits write
an `AttendanceAdjustmentAudit` row.

## 6. Daily Report (`/admin/reports/daily`)
Per-day staff payroll table. Print and CSV export.

## 7. Weekly Payroll Report (`/admin/reports/weekly-payroll`)
Default = current Mon–Sun (Asia/Kuala_Lumpur). Per-staff grouped table with
expandable daily breakdown. Print and CSV export. Warning badges for missing
bank info / missing clock-out.

## 8. Exceptions (`/admin/reports/exceptions`)
- Missing clock-out
- Open sessions older than 16h
- Manual adjusted sessions (last 7 days)
- Cancelled sessions (last 7 days)
- Staff without bank info
- Duplicate scan attempts (from ScanLog)

## 9. Settings (`/admin/settings`)
- Default break rule thresholds (read-only in MVP, documented)
- Admin email (read-only)
- Allow / block pending-review staff from clocking in

## 10. Public Staff Registration (`/register`)
- Public form with profile photo, IC, phone, email, bank details, and notes.
- WhatsApp OTP verification before creating the staff record.
- New self-registered staff default to `PENDING_REVIEW`.
- OTP attempts are rate-limited per phone and IP.

## 11. Production
- `/api/health` returns `{ ok, db }`.
- Binds `0.0.0.0:3000`.
- Prisma generate on build.
- No bank account numbers in logs.
