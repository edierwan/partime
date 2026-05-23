-- Homepage and job-detail refinements for marketplace jobs.
ALTER TABLE "WorkEvent"
ADD COLUMN "dressCode" TEXT,
ADD COLUMN "toolsNeeded" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "paidBy" TEXT,
ADD COLUMN "paymentReference" TEXT;
