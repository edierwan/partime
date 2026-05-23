# 06 — Development Phases

1. **Bootstrap** — Next.js App Router + TS + Tailwind + Prisma + auth shell +
   middleware + base layout + seed.
2. **Part-timers** — CRUD, slide-over, list + search + filters.
3. **Events & QR** — CRUD, scan token, QR generation, print page.
4. **Public scan** — `/scan/[token]` flow with clock-in / clock-out and
   success card; ScanLog writes; duplicate prevention; auto break deduct.
5. **Attendance logs** — table, filters, adjust slide-over, recalculation
   preview, audit trail.
6. **Reports** — daily, weekly payroll, expandable per-part-timer breakdown,
   print CSS, CSV export.
7. **Exceptions + Settings** — exception lists, settings page.
8. **Public registration + tenants** — language selector, part-timer registration, employer registration, skill catalog, tenant-aware event/session/report groundwork.
9. **Production hardening** — `/api/health`, README, `.env.example`,
   Coolify notes, build pass.
