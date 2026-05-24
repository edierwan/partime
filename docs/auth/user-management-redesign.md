# Partime User Management And Authentication Redesign

## Current Schema Audit

Reference snapshot: `postgresql/schemas/current_schema.sql`.

The current production schema mixes login identity, profile data, and workspace membership:

- `AdminUser` is the only password-bearing login table. It is used for platform admins and, after employer registration, also for employer workspace owners through `platformRole = 'EMPLOYER_OWNER'`.
- `TenantMembership` links a `Tenant` to `AdminUser`, so tenant access is coupled to the old admin login table.
- `Staff` stores worker/part-timer profile data, phone, and email, but has no password credential and no canonical account row.
- `StaffOtp` stores OTPs for registration and also login purposes: `STAFF_LOGIN`, `PART_TIMER_LOGIN`, and `EMPLOYER_LOGIN`.
- `EmployerRegistration` stores employer application/contact details and currently participates in login discovery indirectly through phone/contact data.
- `Tenant` stores company/workspace data and should not be treated as a human login principal.

## Problems Found

- A human user can exist in multiple tables with no stable canonical `userId`.
- Employer users are represented as `AdminUser` rows, which blurs platform authorization and tenant membership.
- Worker phone/email lives on `Staff`, but `Staff` is really a worker profile and cannot authenticate with password.
- OTP login makes daily login dependent on WhatsApp delivery and weakens the separation between verification and authentication.
- Login UI currently splits admin password login and employer OTP login, creating inconsistent UX and routing.
- `EmployerRegistration` is an onboarding/application snapshot, but current login logic can treat its contact phone as an account locator.
- Existing membership and job/attendance/offer flows reference `Staff`, `AdminUser`, and `TenantMembership`, so a safe migration must preserve compatibility.

## Target Schema

The new canonical model is:

- `UserAccount`: one row per human/login principal. It owns display name, status, locale, timestamps, and last login time.
- `UserIdentity`: login identifiers, with `EMAIL` or `PHONE`, normalized value, display value, verification timestamp, and primary marker. Unique by `(type, valueNormalized)`.
- `UserCredential`: one active password credential per `UserAccount`, with password hash, failed count, lockout, and reset requirement.
- `PlatformUserRole`: platform/admin authorization only: `PLATFORM_ADMIN`, `SUPPORT`, `FINANCE`, `OPERATIONS`.
- `Tenant`: company/workspace data only.
- `TenantMembership` during transition: the existing physical table remains, with new nullable `userId`, member `status`, `invitedAt`, `joinedAt`, and `updatedAt`. Conceptually this is the target `TenantMember` model.
- `Staff` during transition: the existing physical worker profile table remains, with new nullable unique `userId`. Conceptually this is the target `WorkerProfile` model.
- `EmployerRegistration`: onboarding/application record with new nullable `submittedByUserId` and existing `tenantId`.
- `AuthVerificationToken`: OTP/token table for verification and password reset only, not daily login.

Compatibility choice: use Option A for workers and tenants. Keep `Staff` and `TenantMembership` physically in place, add `userId`, and defer table renames/removals until after the app is migrated and tested.

## Entity Relationships

- `UserAccount` has many `UserIdentity` rows and one `UserCredential`.
- `UserAccount` has zero or more `PlatformUserRole` rows.
- `UserAccount` has zero or more tenant memberships through `TenantMembership.userId`.
- `TenantMembership` connects a human user to one tenant/workspace and keeps role/status.
- `Staff.userId` connects the worker profile to the login account.
- `EmployerRegistration.submittedByUserId` records the user who submitted the employer application; `tenantId` links the resulting company workspace.
- `AuthVerificationToken` may link to a user and identity, but can also be issued before an account is finalized.

## Before And After Mapping

| Current | Target |
| --- | --- |
| `AdminUser.email` | `UserIdentity(type=EMAIL)` |
| `AdminUser.passwordHash` | `UserCredential.passwordHash` |
| `AdminUser.name` | `UserAccount.displayName` |
| `AdminUser.platformRole` | `PlatformUserRole.role` only for real platform roles |
| `TenantMembership.adminUserId` | `TenantMembership.userId` during transition |
| `Staff.phone` | `UserIdentity(type=PHONE)` plus compatibility copy on `Staff` |
| `Staff.email` | `UserIdentity(type=EMAIL)` plus compatibility copy on `Staff` |
| `Staff` | Worker profile concept; keep table and add `userId` first |
| `EmployerRegistration.contact*` | Application snapshot only; owner login is `UserAccount`/`UserIdentity` |
| `StaffOtp` | Registration compatibility only; `AuthVerificationToken` for new verification/reset |

## Login Flow

Daily login uses one form:

1. User enters email or phone plus password.
2. Server normalizes identifier: lowercase email or E.164 phone.
3. Server finds `UserIdentity(type, valueNormalized)`.
4. Server verifies `UserCredential.passwordHash` with bcrypt.
5. Server increments failed login count and sets temporary lockout after repeated failures.
6. Errors are generic: `Email/nombor telefon atau kata laluan tidak sah.`
7. Server resolves platform roles, tenant memberships, and worker profile. Client-supplied role is ignored.
8. If exactly one destination exists, redirect there. If multiple roles or multiple tenants exist, redirect to the role/workspace switcher.

OTP is not valid for daily login.

## Registration Flow

Worker registration:

1. Collect profile, phone/email, password, and consent.
2. Use OTP only to verify phone/email during registration.
3. Create `UserAccount`.
4. Create `UserIdentity` rows for phone/email.
5. Create `UserCredential`.
6. Create or link `Staff.userId` as the worker profile compatibility table.

Employer registration:

1. Collect owner/contact person, company profile, phone/email, password, and consent.
2. Use OTP only to verify phone/email during registration.
3. Create `UserAccount` for the owner/contact person.
4. Create `UserIdentity` rows and `UserCredential`.
5. Create `Tenant` company/workspace.
6. Create `TenantMembership` with `role = OWNER`, `status = ACTIVE`, and `userId`.
7. Create `EmployerRegistration` as the application snapshot with `submittedByUserId` and `tenantId`.
8. Redirect to `/employer/dashboard?registered=1` with pending review status.

Admin creation:

1. Create `UserAccount`.
2. Create email `UserIdentity`.
3. Create `UserCredential`.
4. Create `PlatformUserRole`.

## Forgot Password Flow

1. User enters email or phone.
2. Server normalizes the identifier and looks up `UserIdentity`.
3. Server always returns: `Jika akaun wujud, arahan reset kata laluan telah dihantar.`
4. If an identity exists, create `AuthVerificationToken(purpose=PASSWORD_RESET)` with hashed code/token.
5. Send reset instructions by WhatsApp for phone or email provider when configured.
6. User submits identifier, code/token, and new password.
7. Server verifies the hashed code/token, consumes it, updates or creates `UserCredential`, clears lockout, and clears `forcePasswordReset`.

## Employer Onboarding Flow

Employer registration creates an owner user and tenant immediately, then leaves `Tenant.status` and `EmployerRegistration.status` as `PENDING_REVIEW`. The employer dashboard shows company name, approval status, company profile completion, Post Job CTA, My Jobs, Applicants, and Company Profile links. Pending employers can create draft jobs if the current business rule allows, but publishing remains blocked until approval.

## Worker Onboarding Flow

Worker registration creates the account, password credential, identities, and `Staff.userId`. Existing job, attendance, offer, portfolio, and approval flows continue to reference `Staff` during the compatibility phase. Worker login redirects to `/worker/dashboard`; incomplete profile states should route to worker onboarding/completion.

## Role And Workspace Routing

- Platform role only: `/admin/dashboard`.
- One active tenant membership: `/employer/dashboard`.
- Worker profile only: `/worker/dashboard`.
- Multiple platform/tenant/worker roles or multiple tenants: `/account/switch`.
- Suspended/deactivated account: `/account/blocked`.

Authorization rules:

- `/admin/*` requires `PlatformUserRole` server-side.
- `/employer/*` requires active `TenantMembership.userId` server-side.
- `/worker/*` requires `Staff.userId` server-side.
- Client role data is never trusted.

## Migration Phases

Phase 0 audit:

- Run `postgresql/audits/auth_identity_audit.sql` against a database snapshot.
- Resolve duplicate/cross-table identity collisions before enforcing canonical uniqueness.

Phase 1 schema:

- Apply `prisma/migrations/20260525010000_auth_user_model_phase1/migration.sql` after review.
- Adds canonical tables and nullable links.
- Drops nothing.

Phase 2 backfill:

- Apply `prisma/migrations/20260525011000_auth_user_model_phase2_backfill/migration.sql` after Phase 1 and duplicate review.
- Backfills admins, platform roles, credentials, tenant membership links, worker accounts, worker identities, reset-required worker credentials, and employer submission links.

Phase 3 app cutover:

- Apply `prisma/migrations/20260525012000_auth_user_model_phase3_cutover/migration.sql` as a non-destructive marker only after the app reads/writes the new model.
- Keep legacy tables readable.

Phase 4 cleanup proposal:

- Only after production verification, prepare a separate cleanup migration to remove legacy login usage, drop obsolete login OTP purposes, and eventually rename compatibility tables if desired.
- Do not apply cleanup without explicit approval.

## Risks And Rollback Plan

- Duplicate identities can block unique index/backfill assumptions. Mitigation: run audit SQL first and review conflicts.
- Existing employer owners may have random legacy passwords. Mitigation: password reset flow lets them set credentials; new registrations create credentials immediately.
- Pushing migrations to an auto-deploy environment may apply them automatically. Mitigation: review and explicitly approve migration deployment before moving code that depends on it to production.
- Email reset delivery depends on a configured email provider. Mitigation: WhatsApp reset can work for phone identities; email token creation is generic and provider integration can be added without changing the schema.
- Rollback for Phase 1/2 before cutover: keep app on legacy auth and ignore new tables/columns. Since no legacy columns are dropped, existing flows remain readable.
- Rollback after cutover: switch app auth back to legacy compatibility helpers while preserving new data for inspection.

## Test Plan

- Admin email/password login.
- Employer email/password login.
- Worker email/password login.
- Phone/password login.
- Invalid login returns the generic error.
- Forgot password via phone.
- Forgot password via email.
- Employer registration creates `UserAccount`, `UserIdentity`, `UserCredential`, `Tenant`, `TenantMembership`, and `EmployerRegistration`.
- Worker registration creates `UserAccount`, `UserIdentity`, `UserCredential`, and `Staff.userId`.
- Employer pending approval redirects to employer dashboard and blocks publish.
- Role/workspace switcher appears for multiple roles or tenants.
- Worker blocked from employer-only pages.
- Employer blocked from admin pages.
- Platform admin allowed through admin pages.
- OTP login endpoint/UI is no longer available for normal daily login.
- Mobile login UI keeps one unified form.
