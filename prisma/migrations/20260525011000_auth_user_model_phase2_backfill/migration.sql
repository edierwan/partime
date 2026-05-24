-- Phase 2: deterministic backfill from legacy auth/profile tables into canonical auth tables.
-- Safe intent: copy and link data only. No legacy rows are deleted or modified beyond nullable userId/submittedByUserId links.
-- Recommended prerequisite: run postgresql/audits/auth_identity_audit.sql and review duplicate/collision output.

-- AdminUser -> UserAccount.
INSERT INTO "UserAccount" ("id", "displayName", "status", "preferredLocale", "lastLoginAt", "createdAt", "updatedAt")
SELECT
  'user_admin_' || a."id",
  COALESCE(NULLIF(a."name", ''), a."email"),
  'ACTIVE'::"UserAccountStatus",
  'ms',
  NULL,
  a."createdAt",
  CURRENT_TIMESTAMP
FROM "AdminUser" a
ON CONFLICT ("id") DO NOTHING;

-- AdminUser.email -> UserIdentity.
INSERT INTO "UserIdentity" ("id", "userId", "type", "valueNormalized", "valueDisplay", "verifiedAt", "isPrimary", "createdAt", "updatedAt")
SELECT
  'identity_admin_email_' || a."id",
  'user_admin_' || a."id",
  'EMAIL'::"UserIdentityType",
  lower(trim(a."email")),
  trim(a."email"),
  a."createdAt",
  true,
  a."createdAt",
  CURRENT_TIMESTAMP
FROM "AdminUser" a
WHERE trim(a."email") <> ''
ON CONFLICT ("type", "valueNormalized") DO NOTHING;

-- AdminUser.passwordHash -> UserCredential.
INSERT INTO "UserCredential" ("id", "userId", "passwordHash", "passwordUpdatedAt", "forcePasswordReset", "failedLoginCount", "lockedUntil", "createdAt", "updatedAt")
SELECT
  'credential_admin_' || a."id",
  'user_admin_' || a."id",
  a."passwordHash",
  a."createdAt",
  false,
  0,
  NULL,
  a."createdAt",
  CURRENT_TIMESTAMP
FROM "AdminUser" a
ON CONFLICT ("userId") DO NOTHING;

-- AdminUser.platformRole -> PlatformUserRole for real platform/admin roles only.
INSERT INTO "PlatformUserRole" ("id", "userId", "role", "createdAt")
SELECT
  'platform_role_' || a."id" || '_' || a."platformRole",
  'user_admin_' || a."id",
  CASE a."platformRole"
    WHEN 'SUPPORT' THEN 'SUPPORT'::"PlatformRole"
    WHEN 'FINANCE' THEN 'FINANCE'::"PlatformRole"
    WHEN 'OPERATIONS' THEN 'OPERATIONS'::"PlatformRole"
    ELSE 'PLATFORM_ADMIN'::"PlatformRole"
  END,
  a."createdAt"
FROM "AdminUser" a
WHERE a."platformRole" IN ('PLATFORM_ADMIN', 'SUPPORT', 'FINANCE', 'OPERATIONS')
ON CONFLICT ("userId", "role") DO NOTHING;

-- TenantMembership.adminUserId -> TenantMembership.userId.
UPDATE "TenantMembership" tm
SET
  "userId" = 'user_admin_' || tm."adminUserId",
  "status" = 'ACTIVE'::"TenantMemberStatus",
  "joinedAt" = COALESCE(tm."joinedAt", tm."createdAt"),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE tm."userId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "UserAccount" u WHERE u."id" = 'user_admin_' || tm."adminUserId"
  );

-- Link Staff to existing account by email when the worker email is already a known identity.
UPDATE "Staff" s
SET "userId" = ui."userId"
FROM "UserIdentity" ui
WHERE s."userId" IS NULL
  AND s."email" IS NOT NULL
  AND ui."type" = 'EMAIL'::"UserIdentityType"
  AND ui."valueNormalized" = lower(trim(s."email"));

-- Staff rows without an existing identity become canonical worker accounts.
INSERT INTO "UserAccount" ("id", "displayName", "status", "preferredLocale", "lastLoginAt", "createdAt", "updatedAt")
SELECT
  'user_staff_' || s."id",
  COALESCE(NULLIF(s."fullName", ''), NULLIF(s."payName", ''), NULLIF(s."alias", ''), s."phone"),
  CASE
    WHEN s."status" = 'SUSPENDED' THEN 'SUSPENDED'::"UserAccountStatus"
    WHEN s."status" IN ('INACTIVE', 'REJECTED') THEN 'DEACTIVATED'::"UserAccountStatus"
    WHEN s."status" IN ('PENDING_OTP', 'PENDING_REVIEW') THEN 'PENDING'::"UserAccountStatus"
    ELSE 'ACTIVE'::"UserAccountStatus"
  END,
  'ms',
  NULL,
  s."createdAt",
  CURRENT_TIMESTAMP
FROM "Staff" s
WHERE s."userId" IS NULL
ON CONFLICT ("id") DO NOTHING;

UPDATE "Staff" s
SET "userId" = 'user_staff_' || s."id"
WHERE s."userId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "UserAccount" u WHERE u."id" = 'user_staff_' || s."id"
  );

-- Staff.phone -> UserIdentity.
INSERT INTO "UserIdentity" ("id", "userId", "type", "valueNormalized", "valueDisplay", "verifiedAt", "isPrimary", "createdAt", "updatedAt")
SELECT
  'identity_staff_phone_' || s."id",
  s."userId",
  'PHONE'::"UserIdentityType",
  s."phone",
  COALESCE(NULLIF(s."phoneDisplay", ''), s."phone"),
  CASE WHEN s."status" <> 'PENDING_OTP' THEN s."createdAt" ELSE NULL END,
  true,
  s."createdAt",
  CURRENT_TIMESTAMP
FROM "Staff" s
WHERE s."userId" IS NOT NULL
  AND s."phone" IS NOT NULL
  AND trim(s."phone") <> ''
ON CONFLICT ("type", "valueNormalized") DO NOTHING;

-- Staff.email -> UserIdentity.
INSERT INTO "UserIdentity" ("id", "userId", "type", "valueNormalized", "valueDisplay", "verifiedAt", "isPrimary", "createdAt", "updatedAt")
SELECT
  'identity_staff_email_' || s."id",
  s."userId",
  'EMAIL'::"UserIdentityType",
  lower(trim(s."email")),
  trim(s."email"),
  NULL,
  false,
  s."createdAt",
  CURRENT_TIMESTAMP
FROM "Staff" s
WHERE s."userId" IS NOT NULL
  AND s."email" IS NOT NULL
  AND trim(s."email") <> ''
ON CONFLICT ("type", "valueNormalized") DO NOTHING;

-- Staff-derived accounts have no known password. They must complete forgot-password before daily login.
INSERT INTO "UserCredential" ("id", "userId", "passwordHash", "passwordUpdatedAt", "forcePasswordReset", "failedLoginCount", "lockedUntil", "createdAt", "updatedAt")
SELECT
  'credential_staff_reset_required_' || s."id",
  s."userId",
  'PASSWORD_RESET_REQUIRED',
  CURRENT_TIMESTAMP,
  true,
  0,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Staff" s
WHERE s."userId" IS NOT NULL
ON CONFLICT ("userId") DO NOTHING;

-- EmployerRegistration.submittedByUserId from owner TenantMembership where possible.
UPDATE "EmployerRegistration" er
SET "submittedByUserId" = tm."userId"
FROM "TenantMembership" tm
WHERE er."submittedByUserId" IS NULL
  AND er."tenantId" = tm."tenantId"
  AND tm."role" = 'OWNER'::"TenantRole"
  AND tm."userId" IS NOT NULL;

-- EmployerRegistration.submittedByUserId by contact email fallback.
UPDATE "EmployerRegistration" er
SET "submittedByUserId" = ui."userId"
FROM "UserIdentity" ui
WHERE er."submittedByUserId" IS NULL
  AND er."contactEmail" IS NOT NULL
  AND ui."type" = 'EMAIL'::"UserIdentityType"
  AND ui."valueNormalized" = lower(trim(er."contactEmail"));
