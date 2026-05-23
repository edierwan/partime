-- Malaysia state/city/postcode master data and structured location fields.

CREATE TABLE "MalaysiaState" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MalaysiaState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MalaysiaCity" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MalaysiaCity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MalaysiaPostcode" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "cityId" TEXT,
    "postcode" TEXT NOT NULL,
    "placeName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MalaysiaPostcode_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Tenant"
ADD COLUMN "stateCode" TEXT;

ALTER TABLE "EmployerRegistration"
ADD COLUMN "stateCode" TEXT;

ALTER TABLE "Staff"
ADD COLUMN "stateCode" TEXT,
ADD COLUMN "postcode" TEXT;

ALTER TABLE "WorkEvent"
ADD COLUMN "stateCode" TEXT,
ADD COLUMN "addressLine2" TEXT,
ADD COLUMN "postcode" TEXT;

CREATE UNIQUE INDEX "MalaysiaState_code_key" ON "MalaysiaState"("code");
CREATE INDEX "MalaysiaState_active_sortOrder_idx" ON "MalaysiaState"("active", "sortOrder");

CREATE UNIQUE INDEX "MalaysiaCity_stateId_normalizedName_key" ON "MalaysiaCity"("stateId", "normalizedName");
CREATE INDEX "MalaysiaCity_stateId_idx" ON "MalaysiaCity"("stateId");
CREATE INDEX "MalaysiaCity_normalizedName_idx" ON "MalaysiaCity"("normalizedName");

CREATE UNIQUE INDEX "MalaysiaPostcode_postcode_key" ON "MalaysiaPostcode"("postcode");
CREATE INDEX "MalaysiaPostcode_postcode_idx" ON "MalaysiaPostcode"("postcode");
CREATE INDEX "MalaysiaPostcode_stateId_idx" ON "MalaysiaPostcode"("stateId");
CREATE INDEX "MalaysiaPostcode_cityId_idx" ON "MalaysiaPostcode"("cityId");

ALTER TABLE "MalaysiaCity"
ADD CONSTRAINT "MalaysiaCity_stateId_fkey"
FOREIGN KEY ("stateId") REFERENCES "MalaysiaState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MalaysiaPostcode"
ADD CONSTRAINT "MalaysiaPostcode_stateId_fkey"
FOREIGN KEY ("stateId") REFERENCES "MalaysiaState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MalaysiaPostcode"
ADD CONSTRAINT "MalaysiaPostcode_cityId_fkey"
FOREIGN KEY ("cityId") REFERENCES "MalaysiaCity"("id") ON DELETE SET NULL ON UPDATE CASCADE;