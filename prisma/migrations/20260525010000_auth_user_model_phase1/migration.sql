-- Phase 1: canonical user/auth schema.
-- Safe intent: add new tables and nullable compatibility links only. Do not drop legacy auth/profile tables.

-- CreateEnum
CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "UserIdentityType" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_ADMIN', 'SUPPORT', 'FINANCE', 'OPERATIONS');

-- CreateEnum
CREATE TYPE "TenantMemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AuthVerificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "AuthVerificationPurpose" AS ENUM ('VERIFY_PHONE', 'VERIFY_EMAIL', 'PASSWORD_RESET', 'HIGH_RISK_ACTION');

-- CreateTable
CREATE TABLE "UserAccount" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "UserAccountStatus" NOT NULL DEFAULT 'PENDING',
    "preferredLocale" TEXT NOT NULL DEFAULT 'ms',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "UserIdentityType" NOT NULL,
    "valueNormalized" TEXT NOT NULL,
    "valueDisplay" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forcePasswordReset" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformUserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformUserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "identityId" TEXT,
    "channel" "AuthVerificationChannel" NOT NULL,
    "purpose" "AuthVerificationPurpose" NOT NULL,
    "targetNormalized" TEXT NOT NULL,
    "codeHash" TEXT,
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "sendCount" INTEGER NOT NULL DEFAULT 1,
    "lastSentAt" TIMESTAMP(3),
    "requestIp" TEXT,
    "userAgent" TEXT,
    "providerMessageId" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthVerificationToken_pkey" PRIMARY KEY ("id")
);

-- AlterTable: keep TenantMembership as compatibility table and add canonical user link.
ALTER TABLE "TenantMembership"
ADD COLUMN "userId" TEXT,
ADD COLUMN "status" "TenantMemberStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "invitedAt" TIMESTAMP(3),
ADD COLUMN "joinedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: keep Staff as the worker profile table during transition.
ALTER TABLE "Staff"
ADD COLUMN "userId" TEXT;

-- AlterTable: EmployerRegistration remains an onboarding/application snapshot.
ALTER TABLE "EmployerRegistration"
ADD COLUMN "submittedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "UserAccount_status_idx" ON "UserAccount"("status");
CREATE INDEX "UserAccount_displayName_idx" ON "UserAccount"("displayName");
CREATE UNIQUE INDEX "UserIdentity_type_valueNormalized_key" ON "UserIdentity"("type", "valueNormalized");
CREATE INDEX "UserIdentity_userId_type_idx" ON "UserIdentity"("userId", "type");
CREATE INDEX "UserIdentity_valueNormalized_idx" ON "UserIdentity"("valueNormalized");
CREATE UNIQUE INDEX "UserCredential_userId_key" ON "UserCredential"("userId");
CREATE INDEX "UserCredential_lockedUntil_idx" ON "UserCredential"("lockedUntil");
CREATE UNIQUE INDEX "PlatformUserRole_userId_role_key" ON "PlatformUserRole"("userId", "role");
CREATE INDEX "PlatformUserRole_role_idx" ON "PlatformUserRole"("role");
CREATE INDEX "AuthVerificationToken_targetNormalized_purpose_createdAt_idx" ON "AuthVerificationToken"("targetNormalized", "purpose", "createdAt");
CREATE INDEX "AuthVerificationToken_userId_purpose_createdAt_idx" ON "AuthVerificationToken"("userId", "purpose", "createdAt");
CREATE INDEX "AuthVerificationToken_identityId_idx" ON "AuthVerificationToken"("identityId");
CREATE INDEX "AuthVerificationToken_expiresAt_idx" ON "AuthVerificationToken"("expiresAt");
CREATE INDEX "AuthVerificationToken_consumedAt_idx" ON "AuthVerificationToken"("consumedAt");
CREATE INDEX "AuthVerificationToken_requestIp_createdAt_idx" ON "AuthVerificationToken"("requestIp", "createdAt");
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");
CREATE INDEX "TenantMembership_userId_status_idx" ON "TenantMembership"("userId", "status");
CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");
CREATE INDEX "EmployerRegistration_submittedByUserId_idx" ON "EmployerRegistration"("submittedByUserId");

-- AddForeignKey
ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCredential" ADD CONSTRAINT "UserCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformUserRole" ADD CONSTRAINT "PlatformUserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthVerificationToken" ADD CONSTRAINT "AuthVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuthVerificationToken" ADD CONSTRAINT "AuthVerificationToken_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "UserIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmployerRegistration" ADD CONSTRAINT "EmployerRegistration_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
