ALTER TABLE "Tenant"
ALTER COLUMN "email" DROP NOT NULL;

ALTER TABLE "EmployerRegistration"
ALTER COLUMN "contactEmail" DROP NOT NULL;

ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'EMPLOYER_LOGIN';

ALTER TABLE "StaffOtp"
ADD COLUMN "blockedAt" TIMESTAMP(3),
ADD COLUMN "sendCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "lastSentAt" TIMESTAMP(3),
ADD COLUMN "providerMessageId" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "StaffOtp"
SET "lastSentAt" = "createdAt"
WHERE "lastSentAt" IS NULL AND "sendStatus" IN ('PENDING', 'SENT', 'FAILED');

CREATE INDEX "StaffOtp_phoneE164_purpose_createdAt_idx" ON "StaffOtp"("phoneE164", "purpose", "createdAt");
CREATE INDEX "StaffOtp_expiresAt_idx" ON "StaffOtp"("expiresAt");
CREATE INDEX "StaffOtp_consumedAt_idx" ON "StaffOtp"("consumedAt");