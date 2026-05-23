# Partime

Part-timer marketplace, attendance, employer registration, WhatsApp offer flow, and weekly payroll system.

- Mobile-first public job marketplace homepage with location, skill, and date search, public job detail, and interest capture
- Employer workspace for posting jobs, reviewing part-timers, sending WhatsApp offers, tracking replies, and confirming workers
- Part-timer portal for profile lookup, portfolio uploads, job browsing, offers, and attendance history
- QR scan clock-in / clock-out from any phone
- Admin dashboard (part-timers, employers, marketplace jobs, WhatsApp logs, media, events, attendance, weekly + daily reports, exceptions)
- Public language selector for Bahasa Melayu, Bahasa Indonesia, and English
- Employer registration with tenant workspace review flow
- Part-timer self-registration with WhatsApp OTP and pending-review approval flow
- Part-timer profiles with nationality/passport, IC gender auto-detect, skills, profile photo, and bank validation
- Auto break-deduct rule, manual adjustments with audit log
- CSV export and print-friendly reports
- No payment gateway, bank payout, or finance app integration
- Optional S3-compatible profile, portfolio, employer logo, and job media storage
- Baileys WhatsApp OTP delivery plus offer send/reply webhook handling with a session-aware gateway client
- Malaysia negeri/bandar/poskod master data with dependent dropdowns and postcode autocomplete

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
| `SEED_SAMPLE_DATA` | optional | `true` to seed sample part-timers + public marketplace jobs |
| `S3_ENDPOINT` | optional | `https://s3api.getouch.co` or S3-compatible endpoint |
| `S3_REGION` | optional with S3 | `us-east-1` |
| `S3_BUCKET` | optional with S3 | `partime-prod` |
| `S3_ACCESS_KEY_ID` | optional with S3 | access key for uploads |
| `S3_SECRET_ACCESS_KEY` | optional with S3 | secret key for uploads |
| `S3_PUBLIC_BASE_URL` | optional with S3 | leave blank to serve private S3 objects through `/api/uploads/*` |
| `LOCAL_UPLOAD_ROOT` | optional | `/app/uploads/partime` |
| `BAILEYS_API_BASE_URL` | required for OTP/offers | `https://wa.getouch.co` |
| `BAILEYS_SESSION_ID` | required for OTP/offers | `getouch-co` |
| `BAILEYS_TENANT` | optional logical app tag | `partime` |
| `BAILEYS_PROVIDER_TENANT` | optional logical provider tag override | `partime` |
| `BAILEYS_API_KEY` | required for OTP/offers | Baileys secret / API key |
| `BAILEYS_DEFAULT_COUNTRY` | optional | `MY` |
| `BAILEYS_SEND_PATH` | optional | `/api/sessions/{sessionId}/messages` |
| `BAILEYS_AUTH_HEADER` | optional | `X-WAPI-Secret` |
| `BAILEYS_WEBHOOK_SECRET` | required for inbound offer replies | Same value as gateway `WAPI_SECRET` |

---

## 2. Production build

```bash
npm install
npm run prisma:generate
npm run build
npm run start         # serves on 0.0.0.0:3000
```

Output is `output: 'standalone'` — Coolify / Docker friendly.

### Public registration prerequisites

If you want `/register/part-timer`, `/register/employer`, portfolio media, job media, WhatsApp OTP, and WhatsApp offers to work in production, configure either:

1. S3-compatible storage (`S3_*`) for profile photos, portfolio media, employer logos, and job media.
2. Or local uploads with writable `LOCAL_UPLOAD_ROOT` and a persistent volume.

For OTP and offers, configure the outbound `BAILEYS_*` variables. The GetTouch Baileys runtime currently confirms the direct session route `/api/sessions/:id/messages` with `X-WAPI-Secret`, so Partime now separates the connected gateway session (`BAILEYS_SESSION_ID`) from Partime's own logical tenant tag (`BAILEYS_TENANT` / `BAILEYS_PROVIDER_TENANT`).

You can verify the outbound session config before testing real OTPs with:

```bash
npm run whatsapp:test -- +60123456789 "Partime gateway smoke test"
```

For inbound offer replies, register the gateway webhook through the current env-based dispatcher:

```bash
WAPI_WEBHOOK_URL=https://partime.getouch.co/api/webhooks/baileys/inbound
WAPI_SECRET=<same value as Partime BAILEYS_WEBHOOK_SECRET>
```

The Partime endpoint verifies `X-WA-Signature` or `X-WAPI-Signature` as HMAC-SHA256 over the raw JSON body, accepts the current gateway shape `{ sessionId, type, payload, timestamp }`, and normalizes `message.inbound`/`message.status` to `messages.upsert`/`messages.update` internally.

GetTouch production storage is SeaweedFS. Use the S3 API hostname `https://s3api.getouch.co` for `S3_ENDPOINT`; `https://s3.getouch.co` is the browser console. The dedicated production bucket is `partime-prod` with a bucket-scoped app identity.

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
      - `LOCAL_UPLOAD_ROOT=/app/uploads/partime` or the full `S3_*` set for media uploads
      - `BAILEYS_API_BASE_URL`, `BAILEYS_SESSION_ID`, `BAILEYS_API_KEY` for WhatsApp OTP and offers
      - optional `BAILEYS_TENANT` / `BAILEYS_PROVIDER_TENANT` for logical provider tagging in Partime logs
      - `BAILEYS_WEBHOOK_SECRET` for inbound Baileys offer replies
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

**Public registration:**
- `/register` lets the user choose Part-timer or Employer and stores the selected language.
- `/register/part-timer` creates a part-timer in `PENDING_REVIEW` state after WhatsApp OTP verification.
- `/register/employer` creates a pending tenant workspace and employer registration after OTP verification.
- Employer registration, part-timer registration, employer job posting, and public jobs search now use structured Malaysia `stateCode + state + city + postcode` inputs with postcode-assisted autofill.
- Malaysian IC numbers auto-detect jantina from the final digit; non-Malaysians use passport number.
- Part-timers are looked up by Malaysia phone, email, or alias.
- Pending-review part-timers can only clock in when the admin scan setting explicitly allows it.
- Profile images store to S3-compatible storage when configured, otherwise to local disk under `/api/uploads/*`.
- Portfolio images/videos, employer logos, job cover images, and job gallery media use the same private media path.
- WhatsApp offer replies use `1` for interested and `2` for not interested; no live payment gateway is integrated.

---

## 5. App map

| Route | Purpose |
|---|---|
| `/login` | Admin login |
| `/register` | Public language-aware registration choice |
| `/register/part-timer` | Public part-timer registration + OTP |
| `/register/employer` | Public employer registration + OTP |
| `/jobs` | Public mobile-first job marketplace search with location, skill, date, category, pay type, rate, and open-only filters |
| `/jobs/[id]` | Public job detail with media, requirements, related jobs, and interest form |
| `/part-timer` | Phone-based part-timer portal overview |
| `/part-timer/profile` | Part-timer profile view |
| `/part-timer/portfolio` | Part-timer portfolio image/video upload |
| `/part-timer/jobs` | Part-timer job browser |
| `/part-timer/offers` | Part-timer WhatsApp offer status |
| `/part-timer/history` | Part-timer attendance history |
| `/employer` | Authenticated employer workspace dashboard |
| `/employer/jobs` | Employer job list and posting flow |
| `/employer/part-timers` | Employer part-timer discovery |
| `/employer/offers` | Employer WhatsApp offer send/status flow |
| `/admin` | Dashboard (active part-timers, missing clock-outs, weekly totals) |
| `/admin/platform` | Platform marketplace overview |
| `/admin/tenants` | Tenant monitoring |
| `/admin/part-timers` | Part-timer CRUD and review |
| `/admin/employers` | Employer registration and tenant review |
| `/admin/employer-registrations` | Alias to employer registration and tenant review |
| `/admin/jobs` | Marketplace job monitoring |
| `/admin/offers` | Offer batch monitoring |
| `/admin/whatsapp` | WhatsApp outbound/inbound logs and config hint |
| `/admin/settings/locations` | Read-only Malaysia location master data coverage |
| `/admin/media` | Portfolio/job/logo media monitoring |
| `/admin/events` | Work events + QR generation |
| `/admin/events/[id]/qr` | Printable QR page for scanning |
| `/admin/attendance` | Attendance logs + manual adjust |
| `/admin/reports/daily` | Daily summary report |
| `/admin/reports/weekly-payroll` | Weekly payroll report + CSV |
| `/admin/reports/exceptions` | Items needing admin review |
| `/admin/settings` | System info |
| `/scan/[token]` | Public QR landing — part-timer clock in/out |
| `/api/health` | Liveness + DB probe |
| `/api/reports/weekly-payroll.csv` | CSV export (admin only) |
| `/api/reports/daily.csv` | CSV export (admin only) |
| `/api/public/otp/send` | Send WhatsApp OTP for part-timer or employer registration |
| `/api/public/otp/verify` | Verify OTP without creating a profile |
| `/api/public/register/part-timer` | Verify OTP and create pending-review part-timer |
| `/api/public/register/employer` | Verify OTP and create pending-review employer tenant |
| `/api/public/locations/states` | Active Malaysia states for dependent dropdowns |
| `/api/public/locations/cities` | Active Malaysia cities by state code |
| `/api/public/locations/postcodes` | Malaysia postcode autocomplete suggestions |
| `/api/webhooks/baileys/inbound` | Signed Baileys inbound webhook for offer replies/statuses |

---

## 6. Testing checklist

See `docs/partime-planning/07-testing-checklist.md`.

---

## License

Internal use.
