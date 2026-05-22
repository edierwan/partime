-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('OPEN', 'COMPLETED', 'MISSING_CLOCK_OUT', 'MANUAL_ADJUSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScanAction" AS ENUM ('CLOCK_IN', 'CLOCK_OUT', 'LOOKUP', 'DUPLICATE', 'BLOCKED');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "payName" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "hourlyRateCents" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "defaultRateCents" INTEGER NOT NULL DEFAULT 0,
    "autoBreakRule" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "scanToken" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "clockInAt" TIMESTAMP(3) NOT NULL,
    "clockOutAt" TIMESTAMP(3),
    "grossMinutes" INTEGER,
    "breakDeductMinutes" INTEGER,
    "breakOverridden" BOOLEAN NOT NULL DEFAULT false,
    "payableMinutes" INTEGER,
    "hourlyRateSnapshotCents" INTEGER NOT NULL,
    "totalPayCents" INTEGER,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'OPEN',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "staffId" TEXT,
    "action" "ScanAction" NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceAdjustmentAudit" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "beforeJson" JSONB NOT NULL,
    "afterJson" JSONB NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceAdjustmentAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_alias_key" ON "Staff"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_phone_key" ON "Staff"("phone");

-- CreateIndex
CREATE INDEX "Staff_active_idx" ON "Staff"("active");

-- CreateIndex
CREATE UNIQUE INDEX "WorkEvent_scanToken_key" ON "WorkEvent"("scanToken");

-- CreateIndex
CREATE INDEX "WorkEvent_workDate_idx" ON "WorkEvent"("workDate");

-- CreateIndex
CREATE INDEX "WorkEvent_active_idx" ON "WorkEvent"("active");

-- CreateIndex
CREATE INDEX "AttendanceSession_workDate_idx" ON "AttendanceSession"("workDate");

-- CreateIndex
CREATE INDEX "AttendanceSession_status_idx" ON "AttendanceSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_eventId_staffId_workDate_key" ON "AttendanceSession"("eventId", "staffId", "workDate");

-- CreateIndex
CREATE INDEX "ScanLog_createdAt_idx" ON "ScanLog"("createdAt");

-- CreateIndex
CREATE INDEX "AttendanceAdjustmentAudit_sessionId_idx" ON "AttendanceAdjustmentAudit"("sessionId");

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "WorkEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "WorkEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAdjustmentAudit" ADD CONSTRAINT "AttendanceAdjustmentAudit_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAdjustmentAudit" ADD CONSTRAINT "AttendanceAdjustmentAudit_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

