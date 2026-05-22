# Partime Planning

Standalone part-time staff attendance + weekly payroll system.

## Standalone
- **No** Finance integration
- **No** bank payout / payment gateway
- **No** Serapod2U / GetTouch main app dependency
- **No** external payroll system

## Purpose
- Admin creates work events and prints a public QR code.
- Part-time staff scan the QR from their phone and clock in / clock out.
- System auto-deducts break time, calculates payable hours and total pay.
- Admin reviews a weekly report and pays staff manually (cash / own bank transfer).

## Domain
- Production URL: https://partime.getouch.co
- Database: PostgreSQL (`partime`)
- Deploy: Coolify + Nixpacks, port `3000`
- Timezone: Asia/Kuala_Lumpur (display), UTC (storage)

See the other files in this folder for product requirements, user flows,
database plan, UI plan, calculation rules, development phases, and testing
checklist.
