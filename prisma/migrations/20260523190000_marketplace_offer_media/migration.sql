-- Mobile-first marketplace, WhatsApp offer flow, and S3 media support.

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('EVENT', 'SHIFT', 'CAMPAIGN', 'GIG');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'OFFERING', 'FULL', 'COMPLETED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "JobPayType" AS ENUM ('HOURLY', 'DAILY', 'FIXED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('UNPAID', 'READY', 'PAID_MANUAL', 'PAYMENT_GATEWAY_PENDING');

-- CreateEnum
CREATE TYPE "JobPaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID_MANUAL', 'PAYMENT_GATEWAY_PENDING');

-- CreateEnum
CREATE TYPE "JobInterestStatus" AS ENUM ('INTERESTED', 'WITHDRAWN', 'SHORTLISTED', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JobOfferBatchStatus" AS ENUM ('DRAFT', 'OFFER_SENT', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobOfferStatus" AS ENUM ('DRAFT', 'OFFER_SENT', 'DELIVERED', 'INTERESTED', 'NOT_INTERESTED', 'NO_RESPONSE', 'SHORTLISTED', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'RECEIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "OfferReplyIntent" AS ENUM ('INTERESTED', 'NOT_INTERESTED', 'INVALID');

-- AlterTable
ALTER TABLE "Tenant"
ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "logoKey" TEXT;

-- AlterTable
ALTER TABLE "Staff"
ADD COLUMN "state" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "bio" TEXT,
ADD COLUMN "experienceSummary" TEXT,
ADD COLUMN "expectedRateCents" INTEGER,
ADD COLUMN "publicProfile" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WorkEvent"
ADD COLUMN "slug" TEXT,
ADD COLUMN "summary" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "category" TEXT,
ADD COLUMN "jobType" "JobType" NOT NULL DEFAULT 'EVENT',
ADD COLUMN "jobStatus" "JobStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "state" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "endDate" TIMESTAMP(3),
ADD COLUMN "startTime" TEXT,
ADD COLUMN "endTime" TEXT,
ADD COLUMN "headcount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "filledCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "payType" "JobPayType" NOT NULL DEFAULT 'HOURLY',
ADD COLUMN "minRateCents" INTEGER,
ADD COLUMN "maxRateCents" INTEGER,
ADD COLUMN "publicVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "applyBy" TIMESTAMP(3),
ADD COLUMN "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN "paymentStatus" "JobPaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN "coverImageUrl" TEXT,
ADD COLUMN "coverImageKey" TEXT;

UPDATE "WorkEvent"
SET "jobStatus" = CASE WHEN "active" THEN 'OPEN'::"JobStatus" ELSE 'CLOSED'::"JobStatus" END,
    "publicVisible" = false,
    "headcount" = 1,
    "filledCount" = 0,
    "payType" = 'HOURLY'::"JobPayType",
    "payoutStatus" = 'UNPAID'::"PayoutStatus",
    "paymentStatus" = 'NOT_REQUIRED'::"JobPaymentStatus";

-- CreateTable
CREATE TABLE "JobSkill" (
    "jobId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSkill_pkey" PRIMARY KEY ("jobId", "skillId")
);

-- CreateTable
CREATE TABLE "JobMedia" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT,
    "filename" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartTimerPortfolioMedia" (
    "id" TEXT NOT NULL,
    "partTimerId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "key" TEXT,
    "filename" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartTimerPortfolioMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobInterest" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "partTimerId" TEXT NOT NULL,
    "status" "JobInterestStatus" NOT NULL DEFAULT 'INTERESTED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobOffer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "JobOfferBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "expiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobOfferRecipient" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "partTimerId" TEXT NOT NULL,
    "status" "JobOfferStatus" NOT NULL DEFAULT 'DRAFT',
    "replyText" TEXT,
    "replyReceivedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "lastMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobOfferRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppOutboundMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "offerId" TEXT,
    "offerRecipientId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'baileys',
    "providerTenant" TEXT NOT NULL DEFAULT 'partime',
    "providerMessageId" TEXT,
    "toPhone" TEXT NOT NULL,
    "fromPhone" TEXT,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "body" TEXT NOT NULL,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppOutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppInboundMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "offerRecipientId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'baileys',
    "providerTenant" TEXT NOT NULL DEFAULT 'partime',
    "eventType" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "fromPhone" TEXT,
    "toPhone" TEXT,
    "body" TEXT,
    "interpretedReply" "OfferReplyIntent",
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppInboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "partTimerId" TEXT,
    "jobId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Staff_state_city_idx" ON "Staff"("state", "city");
CREATE UNIQUE INDEX "WorkEvent_slug_key" ON "WorkEvent"("slug");
CREATE INDEX "WorkEvent_jobStatus_publicVisible_workDate_idx" ON "WorkEvent"("jobStatus", "publicVisible", "workDate");
CREATE INDEX "WorkEvent_state_city_idx" ON "WorkEvent"("state", "city");
CREATE INDEX "JobSkill_skillId_idx" ON "JobSkill"("skillId");
CREATE INDEX "JobMedia_jobId_idx" ON "JobMedia"("jobId");
CREATE INDEX "PartTimerPortfolioMedia_partTimerId_idx" ON "PartTimerPortfolioMedia"("partTimerId");
CREATE UNIQUE INDEX "JobInterest_jobId_partTimerId_key" ON "JobInterest"("jobId", "partTimerId");
CREATE INDEX "JobInterest_partTimerId_idx" ON "JobInterest"("partTimerId");
CREATE INDEX "JobInterest_status_idx" ON "JobInterest"("status");
CREATE INDEX "JobOffer_tenantId_idx" ON "JobOffer"("tenantId");
CREATE INDEX "JobOffer_jobId_idx" ON "JobOffer"("jobId");
CREATE INDEX "JobOffer_status_idx" ON "JobOffer"("status");
CREATE UNIQUE INDEX "JobOfferRecipient_offerId_partTimerId_key" ON "JobOfferRecipient"("offerId", "partTimerId");
CREATE INDEX "JobOfferRecipient_partTimerId_idx" ON "JobOfferRecipient"("partTimerId");
CREATE INDEX "JobOfferRecipient_status_idx" ON "JobOfferRecipient"("status");
CREATE INDEX "WhatsAppOutboundMessage_tenantId_createdAt_idx" ON "WhatsAppOutboundMessage"("tenantId", "createdAt");
CREATE INDEX "WhatsAppOutboundMessage_providerMessageId_idx" ON "WhatsAppOutboundMessage"("providerMessageId");
CREATE INDEX "WhatsAppOutboundMessage_offerRecipientId_idx" ON "WhatsAppOutboundMessage"("offerRecipientId");
CREATE INDEX "WhatsAppInboundMessage_tenantId_receivedAt_idx" ON "WhatsAppInboundMessage"("tenantId", "receivedAt");
CREATE INDEX "WhatsAppInboundMessage_providerMessageId_idx" ON "WhatsAppInboundMessage"("providerMessageId");
CREATE INDEX "WhatsAppInboundMessage_offerRecipientId_idx" ON "WhatsAppInboundMessage"("offerRecipientId");
CREATE INDEX "WhatsAppInboundMessage_eventType_idx" ON "WhatsAppInboundMessage"("eventType");
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_actorEmail_idx" ON "AuditLog"("actorEmail");

-- AddForeignKey
ALTER TABLE "JobSkill" ADD CONSTRAINT "JobSkill_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "WorkEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobSkill" ADD CONSTRAINT "JobSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobMedia" ADD CONSTRAINT "JobMedia_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "WorkEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartTimerPortfolioMedia" ADD CONSTRAINT "PartTimerPortfolioMedia_partTimerId_fkey" FOREIGN KEY ("partTimerId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobInterest" ADD CONSTRAINT "JobInterest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "WorkEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobInterest" ADD CONSTRAINT "JobInterest_partTimerId_fkey" FOREIGN KEY ("partTimerId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobOffer" ADD CONSTRAINT "JobOffer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobOffer" ADD CONSTRAINT "JobOffer_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "WorkEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobOfferRecipient" ADD CONSTRAINT "JobOfferRecipient_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "JobOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobOfferRecipient" ADD CONSTRAINT "JobOfferRecipient_partTimerId_fkey" FOREIGN KEY ("partTimerId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "JobOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_offerRecipientId_fkey" FOREIGN KEY ("offerRecipientId") REFERENCES "JobOfferRecipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WhatsAppInboundMessage" ADD CONSTRAINT "WhatsAppInboundMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WhatsAppInboundMessage" ADD CONSTRAINT "WhatsAppInboundMessage_offerRecipientId_fkey" FOREIGN KEY ("offerRecipientId") REFERENCES "JobOfferRecipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_partTimerId_fkey" FOREIGN KEY ("partTimerId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "WorkEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;