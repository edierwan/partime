-- CreateEnum
CREATE TYPE "StaffGender" AS ENUM ('LELAKI', 'PEREMPUAN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "StaffApprovalStatus" AS ENUM ('APPROVED', 'PENDING_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('STAFF_REGISTER');

-- AlterTable
ALTER TABLE "Staff"
ADD COLUMN "approvalStatus" "StaffApprovalStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "bankCode" TEXT,
ADD COLUMN "customBankName" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "gender" "StaffGender" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "icNumberDisplay" TEXT,
ADD COLUMN "icNumberNormalized" TEXT,
ADD COLUMN "phoneDisplay" TEXT,
ADD COLUMN "profileImageKey" TEXT,
ADD COLUMN "profileImageUrl" TEXT;

UPDATE "Staff"
SET "phoneDisplay" = "phone"
WHERE "phoneDisplay" IS NULL
  AND "phone" IS NOT NULL;

UPDATE "Staff"
SET "bankCode" = CASE
  WHEN lower(coalesce("bankName", '')) LIKE '%maybank%' THEN 'MAYBANK'
  WHEN lower(coalesce("bankName", '')) LIKE '%cimb%' THEN 'CIMB'
  WHEN lower(coalesce("bankName", '')) LIKE '%public bank%' THEN 'PUBLIC_BANK'
  WHEN lower(coalesce("bankName", '')) LIKE '%rhb%' THEN 'RHB'
  WHEN lower(coalesce("bankName", '')) LIKE '%hong leong%' THEN 'HONG_LEONG'
  WHEN lower(coalesce("bankName", '')) LIKE '%ambank%' THEN 'AMBANK'
  WHEN lower(coalesce("bankName", '')) LIKE '%bank islam%' THEN 'BANK_ISLAM'
  WHEN lower(coalesce("bankName", '')) LIKE '%bank rakyat%' THEN 'BANK_RAKYAT'
  WHEN lower(coalesce("bankName", '')) LIKE '%bsn%' THEN 'BSN'
  WHEN lower(coalesce("bankName", '')) LIKE '%ocbc%' THEN 'OCBC'
  WHEN lower(coalesce("bankName", '')) LIKE '%uob%' THEN 'UOB'
  WHEN lower(coalesce("bankName", '')) LIKE '%hsbc%' THEN 'HSBC'
  WHEN lower(coalesce("bankName", '')) LIKE '%standard chartered%' THEN 'STANDARD_CHARTERED'
  WHEN lower(coalesce("bankName", '')) LIKE '%alliance%' THEN 'ALLIANCE'
  WHEN lower(coalesce("bankName", '')) LIKE '%affin%' THEN 'AFFIN'
  WHEN lower(coalesce("bankName", '')) LIKE '%touch n go%' THEN 'TNG'
  ELSE NULL
END
WHERE "bankCode" IS NULL
  AND "bankName" IS NOT NULL;

ALTER TABLE "Staff"
DROP COLUMN "hourlyRateCents";

-- CreateTable
CREATE TABLE "StaffOtp" (
    "id" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "requestIp" TEXT,
    "userAgent" TEXT,
    "sendStatus" TEXT,
    "sendError" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_icNumberNormalized_key" ON "Staff"("icNumberNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE INDEX "Staff_fullName_idx" ON "Staff"("fullName");

-- CreateIndex
CREATE INDEX "Staff_approvalStatus_idx" ON "Staff"("approvalStatus");

-- CreateIndex
CREATE INDEX "StaffOtp_phoneE164_createdAt_idx" ON "StaffOtp"("phoneE164", "createdAt");

-- CreateIndex
CREATE INDEX "StaffOtp_requestIp_createdAt_idx" ON "StaffOtp"("requestIp", "createdAt");

-- CreateIndex
CREATE INDEX "StaffOtp_purpose_createdAt_idx" ON "StaffOtp"("purpose", "createdAt");
