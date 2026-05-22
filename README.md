# Partime

Standalone part-time staff attendance and weekly payroll system.

- QR scan clock-in / clock-out from any phone
- Admin dashboard (staff, events, attendance, weekly + daily reports, exceptions)
- Auto break-deduct rule, manual adjustments with audit log
- CSV export and print-friendly reports
- **No external integrations** (no payment gateway, no bank payout, no Finance app)

Stack: Next.js 14 (App Router), TypeScript, Tailwind, Prisma + PostgreSQL, JWT cookie auth (jose).

---

## 1. Local development

Requirements: Node 18.18+, PostgreSQL 14+.

```bash
cp .env.example .env
# Edit DATABASE_URL, AUTH_SECRET, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
npm install
npm run prisma:migrate:dev   # creates schema and runs initial migration
npm run prisma:seed          # creates admin user (and optional sample data)
npm run dev
```

Open http://localhost:3000 → login with the seeded admin.

### Environment variables

| Name | Required | Example |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql://user:pass@host:5432/partime?schema=public` |
| `AUTH_SECRET` (or `NEXTAUTH_SECRET`) | yes | 32+ random chars |
| `NEXT_PUBLIC_APP_URL` | yes | `https://partime.getouch.co` |
| `SEED_ADMIN_EMAIL` | seed only | `admin@partime.local` |
| `SEED_ADMIN_PASSWORD` | seed only | strong password |
| `SEED_SAMPLE_DATA` | optional | `true` to seed 5 sample staff + 1 sample event |

---

## 2. Production build

```bash
npm install
npm run prisma:generate
npm run build
npm run start         # serves on 0.0.0.0:3000
```

Output is `output: 'standalone'` — Coolify / Docker friendly.

### One-time prod migration & seed

The initial migration file is committed under `prisma/migrations/`. In production always use `migrate deploy` (never `migrate dev`):

```bash
npm run prisma:migrate     # = prisma migrate deploy
npm run prisma:seed        # = prisma db seed (uses tsx prisma/seed.ts)
```

---

## 3. Coolify deployment (https://partime.getouch.co)

1. Create a **PostgreSQL** resource named `partime` and copy the connection URL.
2. Create a new **Application** from this Git repository.
3. Build Pack: **Nixpacks** (auto-detected Node).
4. Port: `3000`.
5. Healthcheck path: `/api/health` (returns 200 only when DB reachable).
6. Domain: `partime.getouch.co` with HTTPS enabled.
7. Environment variables:
   - `DATABASE_URL` (from step 1, include `?schema=public`)
   - `AUTH_SECRET` (`openssl rand -hex 32`)
   - `NEXT_PUBLIC_APP_URL=https://partime.getouch.co`
   - `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (for first deploy only)
8. After the first successful deploy, exec into the container once:
   ```bash
   npm run prisma:migrate    # prisma migrate deploy (applies committed migrations)
   npm run prisma:seed       # creates the admin user
   ```
9. Log in, change the admin password (re-seed with a new password and remove seed env vars).

---

## 4. Key business rules

**Timezone:** Asia/Kuala_Lumpur (UTC+8, no DST). All "work day" and "week" boundaries use MYT.

**Week:** Monday 00:00 → Sunday 23:59:59 MYT.

**Auto break deduct** (when event has it enabled, override per session if needed):
- Gross < 5h → 0 min
- Gross 5h–7h59 → 30 min
- Gross ≥ 8h → 60 min

**Missing clock-out:** an open session older than 16 hours is flagged for admin review.

**Money** stored in cents; durations stored in minutes (integers everywhere).

---

## 5. App map

| Route | Purpose |
|---|---|
| `/login` | Admin login |
| `/admin` | Dashboard (active staff, missing clock-outs, weekly totals) |
| `/admin/staff` | Staff CRUD |
| `/admin/events` | Work events + QR generation |
| `/admin/events/[id]/qr` | Printable QR page for scanning |
| `/admin/attendance` | Attendance logs + manual adjust |
| `/admin/reports/daily` | Daily summary report |
| `/admin/reports/weekly-payroll` | Weekly payroll report + CSV |
| `/admin/reports/exceptions` | Items needing admin review |
| `/admin/settings` | System info |
| `/scan/[token]` | Public QR landing — staff clock in/out |
| `/api/health` | Liveness + DB probe |
| `/api/reports/weekly-payroll.csv` | CSV export (admin only) |
| `/api/reports/daily.csv` | CSV export (admin only) |

---

## 6. Testing checklist

See `docs/partime-planning/07-testing-checklist.md`.

---

## License

Internal use.
