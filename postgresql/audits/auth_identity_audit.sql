-- Partime auth identity audit.
-- Review-only SQL. This file does not modify data or schema.
-- Run against the current PostgreSQL database before applying auth user model migrations.

\echo '1. Duplicate AdminUser.email'
SELECT lower(trim("email")) AS normalized_email, count(*) AS row_count, array_agg("id" ORDER BY "createdAt") AS admin_user_ids
FROM "AdminUser"
WHERE trim(coalesce("email", '')) <> ''
GROUP BY lower(trim("email"))
HAVING count(*) > 1
ORDER BY row_count DESC, normalized_email;

\echo '2. Duplicate Staff.phone'
SELECT trim("phone") AS normalized_phone, count(*) AS row_count, array_agg("id" ORDER BY "createdAt") AS staff_ids
FROM "Staff"
WHERE trim(coalesce("phone", '')) <> ''
GROUP BY trim("phone")
HAVING count(*) > 1
ORDER BY row_count DESC, normalized_phone;

\echo '3. Duplicate Staff.email'
SELECT lower(trim("email")) AS normalized_email, count(*) AS row_count, array_agg("id" ORDER BY "createdAt") AS staff_ids
FROM "Staff"
WHERE trim(coalesce("email", '')) <> ''
GROUP BY lower(trim("email"))
HAVING count(*) > 1
ORDER BY row_count DESC, normalized_email;

\echo '4. Duplicate EmployerRegistration.contactPhoneE164'
SELECT trim("contactPhoneE164") AS normalized_phone, count(*) AS row_count, array_agg("id" ORDER BY "createdAt") AS employer_registration_ids
FROM "EmployerRegistration"
WHERE trim(coalesce("contactPhoneE164", '')) <> ''
GROUP BY trim("contactPhoneE164")
HAVING count(*) > 1
ORDER BY row_count DESC, normalized_phone;

\echo '5. Duplicate EmployerRegistration.contactEmail'
SELECT lower(trim("contactEmail")) AS normalized_email, count(*) AS row_count, array_agg("id" ORDER BY "createdAt") AS employer_registration_ids
FROM "EmployerRegistration"
WHERE trim(coalesce("contactEmail", '')) <> ''
GROUP BY lower(trim("contactEmail"))
HAVING count(*) > 1
ORDER BY row_count DESC, normalized_email;

\echo '6. Duplicate Tenant.phoneE164'
SELECT trim("phoneE164") AS normalized_phone, count(*) AS row_count, array_agg("id" ORDER BY "createdAt") AS tenant_ids
FROM "Tenant"
WHERE trim(coalesce("phoneE164", '')) <> ''
GROUP BY trim("phoneE164")
HAVING count(*) > 1
ORDER BY row_count DESC, normalized_phone;

\echo '7. Duplicate Tenant.email'
SELECT lower(trim("email")) AS normalized_email, count(*) AS row_count, array_agg("id" ORDER BY "createdAt") AS tenant_ids
FROM "Tenant"
WHERE trim(coalesce("email", '')) <> ''
GROUP BY lower(trim("email"))
HAVING count(*) > 1
ORDER BY row_count DESC, normalized_email;

\echo '8. Cross-table duplicate emails'
WITH emails AS (
  SELECT 'AdminUser' AS source_table, "id" AS source_id, lower(trim("email")) AS normalized_email FROM "AdminUser" WHERE trim(coalesce("email", '')) <> ''
  UNION ALL
  SELECT 'Staff' AS source_table, "id" AS source_id, lower(trim("email")) AS normalized_email FROM "Staff" WHERE trim(coalesce("email", '')) <> ''
  UNION ALL
  SELECT 'EmployerRegistration' AS source_table, "id" AS source_id, lower(trim("contactEmail")) AS normalized_email FROM "EmployerRegistration" WHERE trim(coalesce("contactEmail", '')) <> ''
  UNION ALL
  SELECT 'Tenant' AS source_table, "id" AS source_id, lower(trim("email")) AS normalized_email FROM "Tenant" WHERE trim(coalesce("email", '')) <> ''
), grouped AS (
  SELECT normalized_email, count(*) AS row_count, count(DISTINCT source_table) AS source_count
  FROM emails
  GROUP BY normalized_email
)
SELECT e.normalized_email, g.row_count, g.source_count, jsonb_agg(jsonb_build_object('table', e.source_table, 'id', e.source_id) ORDER BY e.source_table, e.source_id) AS sources
FROM grouped g
JOIN emails e ON e.normalized_email = g.normalized_email
WHERE g.row_count > 1
GROUP BY e.normalized_email, g.row_count, g.source_count
ORDER BY g.source_count DESC, g.row_count DESC, e.normalized_email;

\echo '9. Cross-table duplicate phones'
WITH phones AS (
  SELECT 'Staff' AS source_table, "id" AS source_id, trim("phone") AS normalized_phone FROM "Staff" WHERE trim(coalesce("phone", '')) <> ''
  UNION ALL
  SELECT 'EmployerRegistration' AS source_table, "id" AS source_id, trim("contactPhoneE164") AS normalized_phone FROM "EmployerRegistration" WHERE trim(coalesce("contactPhoneE164", '')) <> ''
  UNION ALL
  SELECT 'Tenant' AS source_table, "id" AS source_id, trim("phoneE164") AS normalized_phone FROM "Tenant" WHERE trim(coalesce("phoneE164", '')) <> ''
), grouped AS (
  SELECT normalized_phone, count(*) AS row_count, count(DISTINCT source_table) AS source_count
  FROM phones
  GROUP BY normalized_phone
)
SELECT p.normalized_phone, g.row_count, g.source_count, jsonb_agg(jsonb_build_object('table', p.source_table, 'id', p.source_id) ORDER BY p.source_table, p.source_id) AS sources
FROM grouped g
JOIN phones p ON p.normalized_phone = g.normalized_phone
WHERE g.row_count > 1
GROUP BY p.normalized_phone, g.row_count, g.source_count
ORDER BY g.source_count DESC, g.row_count DESC, p.normalized_phone;

\echo '10. Existing TenantMembership rows linked to AdminUser'
SELECT tm."id", tm."tenantId", tm."adminUserId", au."email" AS admin_email, au."platformRole", tm."role", tm."createdAt"
FROM "TenantMembership" tm
JOIN "AdminUser" au ON au."id" = tm."adminUserId"
ORDER BY tm."createdAt", tm."id";

\echo '11. Existing StaffOtp rows using login purposes'
SELECT "purpose", count(*) AS row_count, min("createdAt") AS first_created_at, max("createdAt") AS last_created_at
FROM "StaffOtp"
WHERE "purpose" IN ('STAFF_LOGIN', 'PART_TIMER_LOGIN', 'EMPLOYER_LOGIN')
GROUP BY "purpose"
ORDER BY "purpose";
