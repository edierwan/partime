--
-- PostgreSQL database dump
--

\restrict QhhYp2MV3Qg4OpgHQTAEcjCAP3Ttb4s1L8RCaNKSlZyxVlSolzEnKIf8KCrNqHM

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: AttendanceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AttendanceStatus" AS ENUM (
    'OPEN',
    'COMPLETED',
    'MISSING_CLOCK_OUT',
    'MANUAL_ADJUSTED',
    'CANCELLED'
);


--
-- Name: EmployerRegistrationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EmployerRegistrationStatus" AS ENUM (
    'PENDING_OTP',
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED'
);


--
-- Name: JobInterestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JobInterestStatus" AS ENUM (
    'INTERESTED',
    'WITHDRAWN',
    'SHORTLISTED',
    'CONFIRMED',
    'REJECTED'
);


--
-- Name: JobOfferBatchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JobOfferBatchStatus" AS ENUM (
    'DRAFT',
    'OFFER_SENT',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);


--
-- Name: JobOfferStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JobOfferStatus" AS ENUM (
    'DRAFT',
    'OFFER_SENT',
    'DELIVERED',
    'INTERESTED',
    'NOT_INTERESTED',
    'NO_RESPONSE',
    'SHORTLISTED',
    'CONFIRMED',
    'CANCELLED',
    'EXPIRED',
    'FAILED'
);


--
-- Name: JobPayType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JobPayType" AS ENUM (
    'HOURLY',
    'DAILY',
    'FIXED'
);


--
-- Name: JobPaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JobPaymentStatus" AS ENUM (
    'NOT_REQUIRED',
    'PENDING',
    'PAID_MANUAL',
    'PAYMENT_GATEWAY_PENDING'
);


--
-- Name: JobStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JobStatus" AS ENUM (
    'DRAFT',
    'OPEN',
    'OFFERING',
    'FULL',
    'COMPLETED',
    'CANCELLED',
    'CLOSED'
);


--
-- Name: JobType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JobType" AS ENUM (
    'EVENT',
    'SHIFT',
    'CAMPAIGN',
    'GIG'
);


--
-- Name: MediaType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MediaType" AS ENUM (
    'IMAGE',
    'VIDEO'
);


--
-- Name: OfferReplyIntent; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OfferReplyIntent" AS ENUM (
    'INTERESTED',
    'NOT_INTERESTED',
    'INVALID'
);


--
-- Name: OtpPurpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OtpPurpose" AS ENUM (
    'STAFF_REGISTER',
    'PART_TIMER_REGISTER',
    'EMPLOYER_REGISTER',
    'STAFF_LOGIN',
    'PART_TIMER_LOGIN',
    'EMPLOYER_LOGIN'
);


--
-- Name: PartTimerStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PartTimerStatus" AS ENUM (
    'PENDING_OTP',
    'PENDING_REVIEW',
    'ACTIVE',
    'INACTIVE',
    'REJECTED',
    'SUSPENDED'
);


--
-- Name: PayoutStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayoutStatus" AS ENUM (
    'UNPAID',
    'READY',
    'PAID_MANUAL',
    'PAYMENT_GATEWAY_PENDING'
);


--
-- Name: ScanAction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ScanAction" AS ENUM (
    'CLOCK_IN',
    'CLOCK_OUT',
    'LOOKUP',
    'DUPLICATE',
    'BLOCKED'
);


--
-- Name: SkillExperienceLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SkillExperienceLevel" AS ENUM (
    'BEGINNER',
    'INTERMEDIATE',
    'EXPERIENCED'
);


--
-- Name: StaffApprovalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StaffApprovalStatus" AS ENUM (
    'APPROVED',
    'PENDING_REVIEW',
    'REJECTED'
);


--
-- Name: StaffGender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StaffGender" AS ENUM (
    'LELAKI',
    'PEREMPUAN',
    'UNKNOWN',
    'TIDAK_DINYATAKAN'
);


--
-- Name: TenantPartTimerApprovalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TenantPartTimerApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'BLOCKED'
);


--
-- Name: TenantRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TenantRole" AS ENUM (
    'OWNER',
    'ADMIN',
    'MANAGER',
    'VIEWER'
);


--
-- Name: TenantStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TenantStatus" AS ENUM (
    'PENDING_REVIEW',
    'ACTIVE',
    'SUSPENDED',
    'REJECTED'
);


--
-- Name: WhatsAppMessageStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WhatsAppMessageStatus" AS ENUM (
    'QUEUED',
    'SENT',
    'DELIVERED',
    'READ',
    'RECEIVED',
    'FAILED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AdminUser; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AdminUser" (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    name text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "platformRole" text DEFAULT 'PLATFORM_ADMIN'::text NOT NULL
);


--
-- Name: AppSetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AppSetting" (
    key text NOT NULL,
    value text NOT NULL
);


--
-- Name: AttendanceAdjustmentAudit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AttendanceAdjustmentAudit" (
    id text NOT NULL,
    "sessionId" text NOT NULL,
    "adminId" text NOT NULL,
    reason text NOT NULL,
    "beforeJson" jsonb NOT NULL,
    "afterJson" jsonb NOT NULL,
    "editedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AttendanceSession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AttendanceSession" (
    id text NOT NULL,
    "eventId" text NOT NULL,
    "staffId" text NOT NULL,
    "workDate" timestamp(3) without time zone NOT NULL,
    "clockInAt" timestamp(3) without time zone NOT NULL,
    "clockOutAt" timestamp(3) without time zone,
    "grossMinutes" integer,
    "breakDeductMinutes" integer,
    "breakOverridden" boolean DEFAULT false NOT NULL,
    "payableMinutes" integer,
    "hourlyRateSnapshotCents" integer NOT NULL,
    "totalPayCents" integer,
    status public."AttendanceStatus" DEFAULT 'OPEN'::public."AttendanceStatus" NOT NULL,
    "adminNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "tenantId" text,
    "partTimerId" text,
    "jobId" text,
    "actorEmail" text,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: EmployerRegistration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployerRegistration" (
    id text NOT NULL,
    "tenantId" text,
    "companyName" text NOT NULL,
    "contactPersonName" text NOT NULL,
    "contactPhoneE164" text NOT NULL,
    "contactEmail" text,
    "businessRegistrationNo" text,
    industry text,
    "addressLine1" text,
    "addressLine2" text,
    city text,
    state text,
    postcode text,
    country text DEFAULT 'Malaysia'::text NOT NULL,
    "expectedHiringNeeds" jsonb,
    notes text,
    status public."EmployerRegistrationStatus" DEFAULT 'PENDING_REVIEW'::public."EmployerRegistrationStatus" NOT NULL,
    "otpVerifiedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "stateCode" text
);


--
-- Name: JobInterest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JobInterest" (
    id text NOT NULL,
    "jobId" text NOT NULL,
    "partTimerId" text NOT NULL,
    status public."JobInterestStatus" DEFAULT 'INTERESTED'::public."JobInterestStatus" NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: JobMedia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JobMedia" (
    id text NOT NULL,
    "jobId" text NOT NULL,
    "mediaType" public."MediaType" NOT NULL,
    url text NOT NULL,
    key text,
    filename text,
    "mimeType" text,
    "sizeBytes" integer,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: JobOffer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JobOffer" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "jobId" text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    status public."JobOfferBatchStatus" DEFAULT 'DRAFT'::public."JobOfferBatchStatus" NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "sentAt" timestamp(3) without time zone,
    "createdByEmail" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: JobOfferRecipient; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JobOfferRecipient" (
    id text NOT NULL,
    "offerId" text NOT NULL,
    "partTimerId" text NOT NULL,
    status public."JobOfferStatus" DEFAULT 'DRAFT'::public."JobOfferStatus" NOT NULL,
    "replyText" text,
    "replyReceivedAt" timestamp(3) without time zone,
    "sentAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "confirmedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "lastMessageId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: JobSkill; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JobSkill" (
    "jobId" text NOT NULL,
    "skillId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MalaysiaCity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MalaysiaCity" (
    id text NOT NULL,
    "stateId" text NOT NULL,
    name text NOT NULL,
    "normalizedName" text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MalaysiaPostcode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MalaysiaPostcode" (
    id text NOT NULL,
    "stateId" text NOT NULL,
    "cityId" text,
    postcode text NOT NULL,
    "placeName" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MalaysiaState; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MalaysiaState" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PartTimerPortfolioMedia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PartTimerPortfolioMedia" (
    id text NOT NULL,
    "partTimerId" text NOT NULL,
    "mediaType" public."MediaType" NOT NULL,
    title text,
    description text,
    url text NOT NULL,
    key text,
    filename text,
    "mimeType" text,
    "sizeBytes" integer,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PartTimerSkill; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PartTimerSkill" (
    id text NOT NULL,
    "partTimerId" text NOT NULL,
    "skillId" text NOT NULL,
    "experienceLevel" public."SkillExperienceLevel",
    notes text
);


--
-- Name: ScanLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ScanLog" (
    id text NOT NULL,
    "eventId" text,
    "staffId" text,
    action public."ScanAction" NOT NULL,
    ip text,
    "userAgent" text,
    lat double precision,
    lng double precision,
    message text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" text
);


--
-- Name: Skill; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Skill" (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "nameMs" text NOT NULL,
    "nameId" text NOT NULL,
    "nameEn" text NOT NULL,
    slug text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SkillCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SkillCategory" (
    id text NOT NULL,
    "nameMs" text NOT NULL,
    "nameId" text NOT NULL,
    "nameEn" text NOT NULL,
    slug text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Staff" (
    id text NOT NULL,
    "payName" text NOT NULL,
    alias text NOT NULL,
    "fullName" text NOT NULL,
    phone text NOT NULL,
    "bankName" text,
    "bankAccount" text,
    active boolean DEFAULT true NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "approvalStatus" public."StaffApprovalStatus" DEFAULT 'APPROVED'::public."StaffApprovalStatus" NOT NULL,
    "bankCode" text,
    "customBankName" text,
    email text,
    gender public."StaffGender" DEFAULT 'TIDAK_DINYATAKAN'::public."StaffGender" NOT NULL,
    "icNumberDisplay" text,
    "icNumberNormalized" text,
    "phoneDisplay" text,
    "profileImageKey" text,
    "profileImageUrl" text,
    nationality text DEFAULT 'Malaysia'::text NOT NULL,
    "otherNationality" text,
    "passportNumber" text,
    status public."PartTimerStatus" DEFAULT 'ACTIVE'::public."PartTimerStatus" NOT NULL,
    "preferredLocation" text,
    availability jsonb,
    state text,
    city text,
    bio text,
    "experienceSummary" text,
    "expectedRateCents" integer,
    "publicProfile" boolean DEFAULT false NOT NULL,
    "stateCode" text,
    postcode text
);


--
-- Name: StaffOtp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StaffOtp" (
    id text NOT NULL,
    "phoneE164" text NOT NULL,
    "codeHash" text NOT NULL,
    purpose public."OtpPurpose" NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "consumedAt" timestamp(3) without time zone,
    "attemptCount" integer DEFAULT 0 NOT NULL,
    "maxAttempts" integer DEFAULT 5 NOT NULL,
    "requestIp" text,
    "userAgent" text,
    "sendStatus" text,
    "sendError" text,
    "payloadJson" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "blockedAt" timestamp(3) without time zone,
    "sendCount" integer DEFAULT 1 NOT NULL,
    "lastSentAt" timestamp(3) without time zone,
    "providerMessageId" text,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Tenant" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "registrationNo" text,
    "businessType" text,
    "phoneE164" text NOT NULL,
    email text,
    "addressLine1" text,
    "addressLine2" text,
    city text,
    state text,
    postcode text,
    country text DEFAULT 'Malaysia'::text NOT NULL,
    status public."TenantStatus" DEFAULT 'PENDING_REVIEW'::public."TenantStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "logoUrl" text,
    "logoKey" text,
    "stateCode" text
);


--
-- Name: TenantMembership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TenantMembership" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "adminUserId" text NOT NULL,
    role public."TenantRole" DEFAULT 'VIEWER'::public."TenantRole" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TenantPartTimerApproval; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TenantPartTimerApproval" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "partTimerId" text NOT NULL,
    status public."TenantPartTimerApprovalStatus" DEFAULT 'PENDING'::public."TenantPartTimerApprovalStatus" NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "approvedById" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: WhatsAppInboundMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WhatsAppInboundMessage" (
    id text NOT NULL,
    "tenantId" text,
    "offerRecipientId" text,
    provider text DEFAULT 'baileys'::text NOT NULL,
    "providerTenant" text DEFAULT 'partime'::text NOT NULL,
    "eventType" text NOT NULL,
    "providerMessageId" text,
    "fromPhone" text,
    "toPhone" text,
    body text,
    "interpretedReply" public."OfferReplyIntent",
    payload jsonb NOT NULL,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: WhatsAppOutboundMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WhatsAppOutboundMessage" (
    id text NOT NULL,
    "tenantId" text,
    "offerId" text,
    "offerRecipientId" text,
    provider text DEFAULT 'baileys'::text NOT NULL,
    "providerTenant" text DEFAULT 'partime'::text NOT NULL,
    "providerMessageId" text,
    "toPhone" text NOT NULL,
    "fromPhone" text,
    "messageType" text DEFAULT 'text'::text NOT NULL,
    body text NOT NULL,
    status public."WhatsAppMessageStatus" DEFAULT 'QUEUED'::public."WhatsAppMessageStatus" NOT NULL,
    "errorCode" text,
    "errorMessage" text,
    payload jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: WorkEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkEvent" (
    id text NOT NULL,
    name text NOT NULL,
    location text NOT NULL,
    "workDate" timestamp(3) without time zone NOT NULL,
    "defaultRateCents" integer DEFAULT 0 NOT NULL,
    "autoBreakRule" boolean DEFAULT true NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "scanToken" text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL,
    slug text,
    summary text,
    description text,
    category text,
    "jobType" public."JobType" DEFAULT 'EVENT'::public."JobType" NOT NULL,
    "jobStatus" public."JobStatus" DEFAULT 'DRAFT'::public."JobStatus" NOT NULL,
    state text,
    city text,
    address text,
    "endDate" timestamp(3) without time zone,
    "startTime" text,
    "endTime" text,
    headcount integer DEFAULT 1 NOT NULL,
    "filledCount" integer DEFAULT 0 NOT NULL,
    "payType" public."JobPayType" DEFAULT 'HOURLY'::public."JobPayType" NOT NULL,
    "minRateCents" integer,
    "maxRateCents" integer,
    "publicVisible" boolean DEFAULT false NOT NULL,
    "applyBy" timestamp(3) without time zone,
    "payoutStatus" public."PayoutStatus" DEFAULT 'UNPAID'::public."PayoutStatus" NOT NULL,
    "paymentStatus" public."JobPaymentStatus" DEFAULT 'NOT_REQUIRED'::public."JobPaymentStatus" NOT NULL,
    "coverImageUrl" text,
    "coverImageKey" text,
    "dressCode" text,
    "toolsNeeded" text,
    "paidAt" timestamp(3) without time zone,
    "paidBy" text,
    "paymentReference" text,
    "stateCode" text,
    "addressLine2" text,
    postcode text
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: AdminUser AdminUser_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminUser"
    ADD CONSTRAINT "AdminUser_pkey" PRIMARY KEY (id);


--
-- Name: AppSetting AppSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppSetting"
    ADD CONSTRAINT "AppSetting_pkey" PRIMARY KEY (key);


--
-- Name: AttendanceAdjustmentAudit AttendanceAdjustmentAudit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceAdjustmentAudit"
    ADD CONSTRAINT "AttendanceAdjustmentAudit_pkey" PRIMARY KEY (id);


--
-- Name: AttendanceSession AttendanceSession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceSession"
    ADD CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: EmployerRegistration EmployerRegistration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployerRegistration"
    ADD CONSTRAINT "EmployerRegistration_pkey" PRIMARY KEY (id);


--
-- Name: JobInterest JobInterest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobInterest"
    ADD CONSTRAINT "JobInterest_pkey" PRIMARY KEY (id);


--
-- Name: JobMedia JobMedia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobMedia"
    ADD CONSTRAINT "JobMedia_pkey" PRIMARY KEY (id);


--
-- Name: JobOfferRecipient JobOfferRecipient_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobOfferRecipient"
    ADD CONSTRAINT "JobOfferRecipient_pkey" PRIMARY KEY (id);


--
-- Name: JobOffer JobOffer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobOffer"
    ADD CONSTRAINT "JobOffer_pkey" PRIMARY KEY (id);


--
-- Name: JobSkill JobSkill_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobSkill"
    ADD CONSTRAINT "JobSkill_pkey" PRIMARY KEY ("jobId", "skillId");


--
-- Name: MalaysiaCity MalaysiaCity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MalaysiaCity"
    ADD CONSTRAINT "MalaysiaCity_pkey" PRIMARY KEY (id);


--
-- Name: MalaysiaPostcode MalaysiaPostcode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MalaysiaPostcode"
    ADD CONSTRAINT "MalaysiaPostcode_pkey" PRIMARY KEY (id);


--
-- Name: MalaysiaState MalaysiaState_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MalaysiaState"
    ADD CONSTRAINT "MalaysiaState_pkey" PRIMARY KEY (id);


--
-- Name: PartTimerPortfolioMedia PartTimerPortfolioMedia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PartTimerPortfolioMedia"
    ADD CONSTRAINT "PartTimerPortfolioMedia_pkey" PRIMARY KEY (id);


--
-- Name: PartTimerSkill PartTimerSkill_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PartTimerSkill"
    ADD CONSTRAINT "PartTimerSkill_pkey" PRIMARY KEY (id);


--
-- Name: ScanLog ScanLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ScanLog"
    ADD CONSTRAINT "ScanLog_pkey" PRIMARY KEY (id);


--
-- Name: SkillCategory SkillCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SkillCategory"
    ADD CONSTRAINT "SkillCategory_pkey" PRIMARY KEY (id);


--
-- Name: Skill Skill_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Skill"
    ADD CONSTRAINT "Skill_pkey" PRIMARY KEY (id);


--
-- Name: StaffOtp StaffOtp_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffOtp"
    ADD CONSTRAINT "StaffOtp_pkey" PRIMARY KEY (id);


--
-- Name: Staff Staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_pkey" PRIMARY KEY (id);


--
-- Name: TenantMembership TenantMembership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TenantMembership"
    ADD CONSTRAINT "TenantMembership_pkey" PRIMARY KEY (id);


--
-- Name: TenantPartTimerApproval TenantPartTimerApproval_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TenantPartTimerApproval"
    ADD CONSTRAINT "TenantPartTimerApproval_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_slug_key" UNIQUE (slug);


--
-- Name: WhatsAppInboundMessage WhatsAppInboundMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WhatsAppInboundMessage"
    ADD CONSTRAINT "WhatsAppInboundMessage_pkey" PRIMARY KEY (id);


--
-- Name: WhatsAppOutboundMessage WhatsAppOutboundMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WhatsAppOutboundMessage"
    ADD CONSTRAINT "WhatsAppOutboundMessage_pkey" PRIMARY KEY (id);


--
-- Name: WorkEvent WorkEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkEvent"
    ADD CONSTRAINT "WorkEvent_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AdminUser_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AdminUser_email_key" ON public."AdminUser" USING btree (email);


--
-- Name: AttendanceAdjustmentAudit_sessionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceAdjustmentAudit_sessionId_idx" ON public."AttendanceAdjustmentAudit" USING btree ("sessionId");


--
-- Name: AttendanceSession_eventId_staffId_workDate_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AttendanceSession_eventId_staffId_workDate_key" ON public."AttendanceSession" USING btree ("eventId", "staffId", "workDate");


--
-- Name: AttendanceSession_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceSession_status_idx" ON public."AttendanceSession" USING btree (status);


--
-- Name: AttendanceSession_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceSession_tenantId_idx" ON public."AttendanceSession" USING btree ("tenantId");


--
-- Name: AttendanceSession_workDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceSession_workDate_idx" ON public."AttendanceSession" USING btree ("workDate");


--
-- Name: AuditLog_actorEmail_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_actorEmail_idx" ON public."AuditLog" USING btree ("actorEmail");


--
-- Name: AuditLog_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_entityType_entityId_idx" ON public."AuditLog" USING btree ("entityType", "entityId");


--
-- Name: AuditLog_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON public."AuditLog" USING btree ("tenantId", "createdAt");


--
-- Name: EmployerRegistration_contactEmail_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployerRegistration_contactEmail_idx" ON public."EmployerRegistration" USING btree ("contactEmail");


--
-- Name: EmployerRegistration_contactPhoneE164_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployerRegistration_contactPhoneE164_idx" ON public."EmployerRegistration" USING btree ("contactPhoneE164");


--
-- Name: EmployerRegistration_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployerRegistration_status_idx" ON public."EmployerRegistration" USING btree (status);


--
-- Name: JobInterest_jobId_partTimerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "JobInterest_jobId_partTimerId_key" ON public."JobInterest" USING btree ("jobId", "partTimerId");


--
-- Name: JobInterest_partTimerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "JobInterest_partTimerId_idx" ON public."JobInterest" USING btree ("partTimerId");


--
-- Name: JobInterest_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "JobInterest_status_idx" ON public."JobInterest" USING btree (status);


--
-- Name: JobMedia_jobId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "JobMedia_jobId_idx" ON public."JobMedia" USING btree ("jobId");


--
-- Name: JobOfferRecipient_offerId_partTimerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "JobOfferRecipient_offerId_partTimerId_key" ON public."JobOfferRecipient" USING btree ("offerId", "partTimerId");


--
-- Name: JobOfferRecipient_partTimerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "JobOfferRecipient_partTimerId_idx" ON public."JobOfferRecipient" USING btree ("partTimerId");


--
-- Name: JobOfferRecipient_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "JobOfferRecipient_status_idx" ON public."JobOfferRecipient" USING btree (status);


--
-- Name: JobOffer_jobId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "JobOffer_jobId_idx" ON public."JobOffer" USING btree ("jobId");


--
-- Name: JobOffer_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "JobOffer_status_idx" ON public."JobOffer" USING btree (status);


--
-- Name: JobOffer_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "JobOffer_tenantId_idx" ON public."JobOffer" USING btree ("tenantId");


--
-- Name: JobSkill_skillId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "JobSkill_skillId_idx" ON public."JobSkill" USING btree ("skillId");


--
-- Name: MalaysiaCity_normalizedName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MalaysiaCity_normalizedName_idx" ON public."MalaysiaCity" USING btree ("normalizedName");


--
-- Name: MalaysiaCity_stateId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MalaysiaCity_stateId_idx" ON public."MalaysiaCity" USING btree ("stateId");


--
-- Name: MalaysiaCity_stateId_normalizedName_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MalaysiaCity_stateId_normalizedName_key" ON public."MalaysiaCity" USING btree ("stateId", "normalizedName");


--
-- Name: MalaysiaPostcode_cityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MalaysiaPostcode_cityId_idx" ON public."MalaysiaPostcode" USING btree ("cityId");


--
-- Name: MalaysiaPostcode_postcode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MalaysiaPostcode_postcode_idx" ON public."MalaysiaPostcode" USING btree (postcode);


--
-- Name: MalaysiaPostcode_postcode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MalaysiaPostcode_postcode_key" ON public."MalaysiaPostcode" USING btree (postcode);


--
-- Name: MalaysiaPostcode_stateId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MalaysiaPostcode_stateId_idx" ON public."MalaysiaPostcode" USING btree ("stateId");


--
-- Name: MalaysiaState_active_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MalaysiaState_active_sortOrder_idx" ON public."MalaysiaState" USING btree (active, "sortOrder");


--
-- Name: MalaysiaState_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MalaysiaState_code_key" ON public."MalaysiaState" USING btree (code);


--
-- Name: PartTimerPortfolioMedia_partTimerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PartTimerPortfolioMedia_partTimerId_idx" ON public."PartTimerPortfolioMedia" USING btree ("partTimerId");


--
-- Name: PartTimerSkill_partTimerId_skillId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PartTimerSkill_partTimerId_skillId_key" ON public."PartTimerSkill" USING btree ("partTimerId", "skillId");


--
-- Name: PartTimerSkill_skillId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PartTimerSkill_skillId_idx" ON public."PartTimerSkill" USING btree ("skillId");


--
-- Name: ScanLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ScanLog_createdAt_idx" ON public."ScanLog" USING btree ("createdAt");


--
-- Name: ScanLog_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ScanLog_tenantId_idx" ON public."ScanLog" USING btree ("tenantId");


--
-- Name: SkillCategory_active_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SkillCategory_active_sortOrder_idx" ON public."SkillCategory" USING btree (active, "sortOrder");


--
-- Name: SkillCategory_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SkillCategory_slug_key" ON public."SkillCategory" USING btree (slug);


--
-- Name: Skill_categoryId_active_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Skill_categoryId_active_sortOrder_idx" ON public."Skill" USING btree ("categoryId", active, "sortOrder");


--
-- Name: Skill_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Skill_slug_key" ON public."Skill" USING btree (slug);


--
-- Name: StaffOtp_consumedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffOtp_consumedAt_idx" ON public."StaffOtp" USING btree ("consumedAt");


--
-- Name: StaffOtp_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffOtp_expiresAt_idx" ON public."StaffOtp" USING btree ("expiresAt");


--
-- Name: StaffOtp_phoneE164_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffOtp_phoneE164_createdAt_idx" ON public."StaffOtp" USING btree ("phoneE164", "createdAt");


--
-- Name: StaffOtp_phoneE164_purpose_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffOtp_phoneE164_purpose_createdAt_idx" ON public."StaffOtp" USING btree ("phoneE164", purpose, "createdAt");


--
-- Name: StaffOtp_purpose_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffOtp_purpose_createdAt_idx" ON public."StaffOtp" USING btree (purpose, "createdAt");


--
-- Name: StaffOtp_requestIp_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffOtp_requestIp_createdAt_idx" ON public."StaffOtp" USING btree ("requestIp", "createdAt");


--
-- Name: Staff_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Staff_active_idx" ON public."Staff" USING btree (active);


--
-- Name: Staff_alias_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Staff_alias_idx" ON public."Staff" USING btree (alias);


--
-- Name: Staff_alias_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Staff_alias_key" ON public."Staff" USING btree (alias);


--
-- Name: Staff_approvalStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Staff_approvalStatus_idx" ON public."Staff" USING btree ("approvalStatus");


--
-- Name: Staff_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Staff_email_key" ON public."Staff" USING btree (email);


--
-- Name: Staff_fullName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Staff_fullName_idx" ON public."Staff" USING btree ("fullName");


--
-- Name: Staff_icNumberNormalized_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Staff_icNumberNormalized_key" ON public."Staff" USING btree ("icNumberNormalized");


--
-- Name: Staff_nationality_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Staff_nationality_idx" ON public."Staff" USING btree (nationality);


--
-- Name: Staff_phone_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Staff_phone_key" ON public."Staff" USING btree (phone);


--
-- Name: Staff_state_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Staff_state_city_idx" ON public."Staff" USING btree (state, city);


--
-- Name: Staff_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Staff_status_idx" ON public."Staff" USING btree (status);


--
-- Name: TenantMembership_adminUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TenantMembership_adminUserId_idx" ON public."TenantMembership" USING btree ("adminUserId");


--
-- Name: TenantMembership_tenantId_adminUserId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TenantMembership_tenantId_adminUserId_key" ON public."TenantMembership" USING btree ("tenantId", "adminUserId");


--
-- Name: TenantPartTimerApproval_partTimerId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TenantPartTimerApproval_partTimerId_status_idx" ON public."TenantPartTimerApproval" USING btree ("partTimerId", status);


--
-- Name: TenantPartTimerApproval_tenantId_partTimerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TenantPartTimerApproval_tenantId_partTimerId_key" ON public."TenantPartTimerApproval" USING btree ("tenantId", "partTimerId");


--
-- Name: TenantPartTimerApproval_tenantId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TenantPartTimerApproval_tenantId_status_idx" ON public."TenantPartTimerApproval" USING btree ("tenantId", status);


--
-- Name: Tenant_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Tenant_name_idx" ON public."Tenant" USING btree (name);


--
-- Name: Tenant_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Tenant_status_idx" ON public."Tenant" USING btree (status);


--
-- Name: WhatsAppInboundMessage_eventType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WhatsAppInboundMessage_eventType_idx" ON public."WhatsAppInboundMessage" USING btree ("eventType");


--
-- Name: WhatsAppInboundMessage_offerRecipientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WhatsAppInboundMessage_offerRecipientId_idx" ON public."WhatsAppInboundMessage" USING btree ("offerRecipientId");


--
-- Name: WhatsAppInboundMessage_providerMessageId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WhatsAppInboundMessage_providerMessageId_idx" ON public."WhatsAppInboundMessage" USING btree ("providerMessageId");


--
-- Name: WhatsAppInboundMessage_tenantId_receivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WhatsAppInboundMessage_tenantId_receivedAt_idx" ON public."WhatsAppInboundMessage" USING btree ("tenantId", "receivedAt");


--
-- Name: WhatsAppOutboundMessage_offerRecipientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WhatsAppOutboundMessage_offerRecipientId_idx" ON public."WhatsAppOutboundMessage" USING btree ("offerRecipientId");


--
-- Name: WhatsAppOutboundMessage_providerMessageId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WhatsAppOutboundMessage_providerMessageId_idx" ON public."WhatsAppOutboundMessage" USING btree ("providerMessageId");


--
-- Name: WhatsAppOutboundMessage_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WhatsAppOutboundMessage_tenantId_createdAt_idx" ON public."WhatsAppOutboundMessage" USING btree ("tenantId", "createdAt");


--
-- Name: WorkEvent_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkEvent_active_idx" ON public."WorkEvent" USING btree (active);


--
-- Name: WorkEvent_jobStatus_publicVisible_workDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkEvent_jobStatus_publicVisible_workDate_idx" ON public."WorkEvent" USING btree ("jobStatus", "publicVisible", "workDate");


--
-- Name: WorkEvent_scanToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WorkEvent_scanToken_key" ON public."WorkEvent" USING btree ("scanToken");


--
-- Name: WorkEvent_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WorkEvent_slug_key" ON public."WorkEvent" USING btree (slug);


--
-- Name: WorkEvent_state_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkEvent_state_city_idx" ON public."WorkEvent" USING btree (state, city);


--
-- Name: WorkEvent_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkEvent_tenantId_idx" ON public."WorkEvent" USING btree ("tenantId");


--
-- Name: WorkEvent_workDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkEvent_workDate_idx" ON public."WorkEvent" USING btree ("workDate");


--
-- Name: AttendanceAdjustmentAudit AttendanceAdjustmentAudit_adminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceAdjustmentAudit"
    ADD CONSTRAINT "AttendanceAdjustmentAudit_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public."AdminUser"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AttendanceAdjustmentAudit AttendanceAdjustmentAudit_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceAdjustmentAudit"
    ADD CONSTRAINT "AttendanceAdjustmentAudit_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."AttendanceSession"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AttendanceSession AttendanceSession_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceSession"
    ADD CONSTRAINT "AttendanceSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public."WorkEvent"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AttendanceSession AttendanceSession_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceSession"
    ADD CONSTRAINT "AttendanceSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AttendanceSession AttendanceSession_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceSession"
    ADD CONSTRAINT "AttendanceSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuditLog AuditLog_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."WorkEvent"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AuditLog AuditLog_partTimerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_partTimerId_fkey" FOREIGN KEY ("partTimerId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AuditLog AuditLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployerRegistration EmployerRegistration_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployerRegistration"
    ADD CONSTRAINT "EmployerRegistration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: JobInterest JobInterest_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobInterest"
    ADD CONSTRAINT "JobInterest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."WorkEvent"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JobInterest JobInterest_partTimerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobInterest"
    ADD CONSTRAINT "JobInterest_partTimerId_fkey" FOREIGN KEY ("partTimerId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JobMedia JobMedia_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobMedia"
    ADD CONSTRAINT "JobMedia_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."WorkEvent"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JobOfferRecipient JobOfferRecipient_offerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobOfferRecipient"
    ADD CONSTRAINT "JobOfferRecipient_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES public."JobOffer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JobOfferRecipient JobOfferRecipient_partTimerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobOfferRecipient"
    ADD CONSTRAINT "JobOfferRecipient_partTimerId_fkey" FOREIGN KEY ("partTimerId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JobOffer JobOffer_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobOffer"
    ADD CONSTRAINT "JobOffer_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."WorkEvent"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JobOffer JobOffer_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobOffer"
    ADD CONSTRAINT "JobOffer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: JobSkill JobSkill_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobSkill"
    ADD CONSTRAINT "JobSkill_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."WorkEvent"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JobSkill JobSkill_skillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobSkill"
    ADD CONSTRAINT "JobSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES public."Skill"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MalaysiaCity MalaysiaCity_stateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MalaysiaCity"
    ADD CONSTRAINT "MalaysiaCity_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES public."MalaysiaState"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MalaysiaPostcode MalaysiaPostcode_cityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MalaysiaPostcode"
    ADD CONSTRAINT "MalaysiaPostcode_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES public."MalaysiaCity"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MalaysiaPostcode MalaysiaPostcode_stateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MalaysiaPostcode"
    ADD CONSTRAINT "MalaysiaPostcode_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES public."MalaysiaState"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PartTimerPortfolioMedia PartTimerPortfolioMedia_partTimerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PartTimerPortfolioMedia"
    ADD CONSTRAINT "PartTimerPortfolioMedia_partTimerId_fkey" FOREIGN KEY ("partTimerId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PartTimerSkill PartTimerSkill_partTimerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PartTimerSkill"
    ADD CONSTRAINT "PartTimerSkill_partTimerId_fkey" FOREIGN KEY ("partTimerId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PartTimerSkill PartTimerSkill_skillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PartTimerSkill"
    ADD CONSTRAINT "PartTimerSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES public."Skill"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ScanLog ScanLog_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ScanLog"
    ADD CONSTRAINT "ScanLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public."WorkEvent"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ScanLog ScanLog_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ScanLog"
    ADD CONSTRAINT "ScanLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ScanLog ScanLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ScanLog"
    ADD CONSTRAINT "ScanLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Skill Skill_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Skill"
    ADD CONSTRAINT "Skill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."SkillCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TenantMembership TenantMembership_adminUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TenantMembership"
    ADD CONSTRAINT "TenantMembership_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES public."AdminUser"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TenantMembership TenantMembership_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TenantMembership"
    ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TenantPartTimerApproval TenantPartTimerApproval_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TenantPartTimerApproval"
    ADD CONSTRAINT "TenantPartTimerApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public."AdminUser"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TenantPartTimerApproval TenantPartTimerApproval_partTimerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TenantPartTimerApproval"
    ADD CONSTRAINT "TenantPartTimerApproval_partTimerId_fkey" FOREIGN KEY ("partTimerId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TenantPartTimerApproval TenantPartTimerApproval_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TenantPartTimerApproval"
    ADD CONSTRAINT "TenantPartTimerApproval_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: WhatsAppInboundMessage WhatsAppInboundMessage_offerRecipientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WhatsAppInboundMessage"
    ADD CONSTRAINT "WhatsAppInboundMessage_offerRecipientId_fkey" FOREIGN KEY ("offerRecipientId") REFERENCES public."JobOfferRecipient"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WhatsAppInboundMessage WhatsAppInboundMessage_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WhatsAppInboundMessage"
    ADD CONSTRAINT "WhatsAppInboundMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WhatsAppOutboundMessage WhatsAppOutboundMessage_offerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WhatsAppOutboundMessage"
    ADD CONSTRAINT "WhatsAppOutboundMessage_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES public."JobOffer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WhatsAppOutboundMessage WhatsAppOutboundMessage_offerRecipientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WhatsAppOutboundMessage"
    ADD CONSTRAINT "WhatsAppOutboundMessage_offerRecipientId_fkey" FOREIGN KEY ("offerRecipientId") REFERENCES public."JobOfferRecipient"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WhatsAppOutboundMessage WhatsAppOutboundMessage_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WhatsAppOutboundMessage"
    ADD CONSTRAINT "WhatsAppOutboundMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WorkEvent WorkEvent_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkEvent"
    ADD CONSTRAINT "WorkEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict QhhYp2MV3Qg4OpgHQTAEcjCAP3Ttb4s1L8RCaNKSlZyxVlSolzEnKIf8KCrNqHM

