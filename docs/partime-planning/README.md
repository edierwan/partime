# Partime Planning

Part-timer marketplace, attendance, employer registration, WhatsApp offer flow, and weekly payroll system.

## Standalone
- **No** Finance integration
- **No** bank payout / payment gateway
- **No** Serapod2U / GetTouch main app dependency
- **No** external payroll system

## Purpose
- Admin creates work events and prints a public QR code.
- Part-timers scan the QR from their phone and clock in / clock out.
- Employers can register publicly and become tenant workspaces after platform admin approval.
- Employers can post public jobs, prepare WhatsApp offer batches, and track replies.
- Part-timers can search jobs by location, skill, and date, register interest, and manage portfolio media.
- System auto-deducts break time, calculates payable hours and total pay.
- Admin reviews a weekly report and pays staff manually (cash / own bank transfer).

## Domain
- Production URL: https://partime.getouch.co
- Database: PostgreSQL (`partime`)
- Object storage: SeaweedFS S3 API (`https://s3api.getouch.co`), bucket `partime-prod`
- Deploy: Coolify + Nixpacks, port `3000`
- Timezone: Asia/Kuala_Lumpur (display), UTC (storage)

See the other files in this folder for product requirements, user flows,
database plan, UI plan, calculation rules, development phases, testing
checklist, marketplace offer flow, S3 media storage, multi-tenant access
control notes, and public homepage search notes.
