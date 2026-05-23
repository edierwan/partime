-- Multi-tenant registration, employer tenants, part-timer skills, and tenant-aware attendance.

-- Extend existing enums.
ALTER TYPE "StaffGender" ADD VALUE IF NOT EXISTS 'TIDAK_DINYATAKAN';
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'PART_TIMER_REGISTER';
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'EMPLOYER_REGISTER';
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'STAFF_LOGIN';
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'PART_TIMER_LOGIN';

-- CreateEnum
CREATE TYPE "PartTimerStatus" AS ENUM ('PENDING_OTP', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "EmployerRegistrationStatus" AS ENUM ('PENDING_OTP', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SkillExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'EXPERIENCED');

-- CreateEnum
CREATE TYPE "TenantPartTimerApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'BLOCKED');

-- AlterTable
ALTER TABLE "AdminUser"
ADD COLUMN "platformRole" TEXT NOT NULL DEFAULT 'PLATFORM_ADMIN';

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "registrationNo" TEXT,
    "businessType" TEXT,
    "phoneE164" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postcode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Malaysia',
    "status" "TenantStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Tenant_slug_key" UNIQUE ("slug")
);

-- Backfill a default platform tenant for existing single-tenant data.
INSERT INTO "Tenant" (
    "id", "name", "slug", "phoneE164", "email", "country", "status", "createdAt", "updatedAt"
) VALUES (
    'tenant_platform_default', 'Partime Platform Default', 'platform-default', '+60000000000', 'admin@partime.local', 'Malaysia', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("slug") DO NOTHING;

-- CreateTable
CREATE TABLE "TenantMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployerRegistration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "companyName" TEXT NOT NULL,
    "contactPersonName" TEXT NOT NULL,
    "contactPhoneE164" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "businessRegistrationNo" TEXT,
    "industry" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postcode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Malaysia',
    "expectedHiringNeeds" JSONB,
    "notes" TEXT,
    "status" "EmployerRegistrationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "otpVerifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployerRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCategory" (
    "id" TEXT NOT NULL,
    "nameMs" TEXT NOT NULL,
    "nameId" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "nameMs" TEXT NOT NULL,
    "nameId" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartTimerSkill" (
    "id" TEXT NOT NULL,
    "partTimerId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "experienceLevel" "SkillExperienceLevel",
    "notes" TEXT,

    CONSTRAINT "PartTimerSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantPartTimerApproval" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partTimerId" TEXT NOT NULL,
    "status" "TenantPartTimerApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantPartTimerApproval_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Staff"
ADD COLUMN "nationality" TEXT NOT NULL DEFAULT 'Malaysia',
ADD COLUMN "otherNationality" TEXT,
ADD COLUMN "passportNumber" TEXT,
ADD COLUMN "status" "PartTimerStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "preferredLocation" TEXT,
ADD COLUMN "availability" JSONB;

UPDATE "Staff"
SET "status" = CASE
  WHEN "active" = false THEN 'INACTIVE'::"PartTimerStatus"
  WHEN "approvalStatus" = 'PENDING_REVIEW' THEN 'PENDING_REVIEW'::"PartTimerStatus"
  WHEN "approvalStatus" = 'REJECTED' THEN 'REJECTED'::"PartTimerStatus"
  ELSE 'ACTIVE'::"PartTimerStatus"
END;

-- AlterTable: add tenantId nullable first so existing rows can be backfilled.
ALTER TABLE "WorkEvent" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AttendanceSession" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ScanLog" ADD COLUMN "tenantId" TEXT;

UPDATE "WorkEvent"
SET "tenantId" = 'tenant_platform_default'
WHERE "tenantId" IS NULL;

UPDATE "AttendanceSession" s
SET "tenantId" = COALESCE(e."tenantId", 'tenant_platform_default')
FROM "WorkEvent" e
WHERE s."eventId" = e."id"
  AND s."tenantId" IS NULL;

UPDATE "AttendanceSession"
SET "tenantId" = 'tenant_platform_default'
WHERE "tenantId" IS NULL;

UPDATE "ScanLog" l
SET "tenantId" = e."tenantId"
FROM "WorkEvent" e
WHERE l."eventId" = e."id"
  AND l."tenantId" IS NULL;

ALTER TABLE "WorkEvent" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "AttendanceSession" ALTER COLUMN "tenantId" SET NOT NULL;

CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");
CREATE INDEX "Tenant_name_idx" ON "Tenant"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMembership_tenantId_adminUserId_key" ON "TenantMembership"("tenantId", "adminUserId");
CREATE INDEX "TenantMembership_adminUserId_idx" ON "TenantMembership"("adminUserId");

-- CreateIndex
CREATE INDEX "EmployerRegistration_status_idx" ON "EmployerRegistration"("status");
CREATE INDEX "EmployerRegistration_contactPhoneE164_idx" ON "EmployerRegistration"("contactPhoneE164");
CREATE INDEX "EmployerRegistration_contactEmail_idx" ON "EmployerRegistration"("contactEmail");

-- CreateIndex
CREATE INDEX "Staff_alias_idx" ON "Staff"("alias");
CREATE INDEX "Staff_status_idx" ON "Staff"("status");
CREATE INDEX "Staff_nationality_idx" ON "Staff"("nationality");

-- CreateIndex
CREATE UNIQUE INDEX "SkillCategory_slug_key" ON "SkillCategory"("slug");
CREATE INDEX "SkillCategory_active_sortOrder_idx" ON "SkillCategory"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");
CREATE INDEX "Skill_categoryId_active_sortOrder_idx" ON "Skill"("categoryId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PartTimerSkill_partTimerId_skillId_key" ON "PartTimerSkill"("partTimerId", "skillId");
CREATE INDEX "PartTimerSkill_skillId_idx" ON "PartTimerSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantPartTimerApproval_tenantId_partTimerId_key" ON "TenantPartTimerApproval"("tenantId", "partTimerId");
CREATE INDEX "TenantPartTimerApproval_partTimerId_status_idx" ON "TenantPartTimerApproval"("partTimerId", "status");
CREATE INDEX "TenantPartTimerApproval_tenantId_status_idx" ON "TenantPartTimerApproval"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WorkEvent_tenantId_idx" ON "WorkEvent"("tenantId");
CREATE INDEX "AttendanceSession_tenantId_idx" ON "AttendanceSession"("tenantId");
CREATE INDEX "ScanLog_tenantId_idx" ON "ScanLog"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerRegistration" ADD CONSTRAINT "EmployerRegistration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartTimerSkill" ADD CONSTRAINT "PartTimerSkill_partTimerId_fkey" FOREIGN KEY ("partTimerId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartTimerSkill" ADD CONSTRAINT "PartTimerSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantPartTimerApproval" ADD CONSTRAINT "TenantPartTimerApproval_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenantPartTimerApproval" ADD CONSTRAINT "TenantPartTimerApproval_partTimerId_fkey" FOREIGN KEY ("partTimerId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenantPartTimerApproval" ADD CONSTRAINT "TenantPartTimerApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkEvent" ADD CONSTRAINT "WorkEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
