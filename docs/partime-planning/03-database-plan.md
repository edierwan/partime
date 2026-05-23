# 03 — Database Plan

PostgreSQL via Prisma. Single database `partime`. No cross-DB usage.

## Tables

### AdminUser
| field | type | notes |
|---|---|---|
| id | String (cuid) | PK |
| email | String unique | login |
| passwordHash | String | bcrypt |
| name | String? | display |
| platformRole | String | platform admin role marker |
| createdAt | DateTime | |

### Tenant
Employer workspace. `WorkEvent`, `AttendanceSession`, and `ScanLog` carry `tenantId` for tenant-aware filtering and future tenant-admin isolation.

### TenantMembership
Links future tenant admins/managers/viewers to a tenant. Full tenant RBAC is not yet implemented in the admin shell.

### EmployerRegistration
Public employer application linked to an optional `Tenant`. Status: `PENDING_OTP / PENDING_REVIEW / APPROVED / REJECTED`.

### Staff / Part-timer
| field | type | notes |
|---|---|---|
| id | String (cuid) | PK |
| payName | String | short payroll name |
| aliasPanggilan | String unique | match key (uppercase trim) |
| fullName | String | legal full name |
| icNumberNormalized | String? unique | normalized 12-digit IC |
| icNumberDisplay | String? | display-ready IC |
| gender | Enum | `LELAKI / PEREMPUAN / TIDAK_DINYATAKAN` |
| nationality | String | default `Malaysia` |
| otherNationality | String? | required when nationality = Other |
| passportNumber | String? | required for non-Malaysians |
| phoneE164 | String unique | normalized `+60...` mobile |
| phoneDisplay | String? | human-friendly display |
| email | String? unique | optional |
| bankCode | String? | known bank code |
| bankName | String? | |
| customBankName | String? | when bank = OTHER |
| bankAccountNumber | String? | masked in UI |
| profileImageUrl | String? | public or local URL |
| profileImageKey | String? | storage key |
| approvalStatus | Enum | `APPROVED / PENDING_REVIEW / REJECTED` |
| status | Enum | `PENDING_OTP / PENDING_REVIEW / ACTIVE / INACTIVE / REJECTED / SUSPENDED` |
| preferredLocation | String? | |
| availability | Json? | selected availability values |
| active | Boolean | default true |
| notes | String? | |
| createdAt / updatedAt | DateTime | |

### SkillCategory / Skill / PartTimerSkill
Seeded skill catalog grouped by category. `PartTimerSkill` links part-timers to selected skills, including custom "Other" skills.

### TenantPartTimerApproval
Tenant-specific approval state for a part-timer: `PENDING / APPROVED / BLOCKED`. Scan lookup/clock-in blocks pending or blocked tenant approvals.

### WorkEvent
| field | type | notes |
|---|---|---|
| id | String (cuid) | PK |
| tenantId | FK Tenant | required |
| name | String | |
| location | String | |
| workDate | DateTime (date) | MY date boundary |
| defaultRateCents | Int | snapshot to sessions |
| autoBreakRule | Boolean | default true |
| active | Boolean | default true |
| scanToken | String unique | base32 random |
| notes | String? | |
| createdAt / updatedAt | DateTime | |

### AttendanceSession
| field | type | notes |
|---|---|---|
| id | String (cuid) | PK |
| tenantId | FK Tenant | required |
| eventId | FK WorkEvent | cascade restrict |
| staffId | FK Staff | restrict |
| workDate | DateTime (date) | denormalized for grouping |
| clockInAt | DateTime | UTC |
| clockOutAt | DateTime? | UTC, null = OPEN |
| grossMinutes | Int? | recomputed |
| breakDeductMinutes | Int? | auto or override |
| breakOverridden | Boolean | true if admin set manually |
| payableMinutes | Int? | gross - break |
| hourlyRateSnapshotCents | Int | captured at clock-in |
| totalPayCents | Int? | payable hours × rate |
| status | Enum | OPEN / COMPLETED / MISSING_CLOCK_OUT / MANUAL_ADJUSTED / CANCELLED |
| adminNotes | String? | |
| createdAt / updatedAt | DateTime | |

Unique: `(eventId, staffId, workDate)` to prevent duplicate open per day.

### StaffOtp
| field | type | notes |
|---|---|---|
| id | String | PK |
| phoneE164 | String | OTP target |
| codeHash | String | hashed 4-digit OTP |
| purpose | Enum | `STAFF_REGISTER / PART_TIMER_REGISTER / EMPLOYER_REGISTER / STAFF_LOGIN / PART_TIMER_LOGIN` |
| expiresAt | DateTime | 5-minute expiry |
| consumedAt | DateTime? | null until verified |
| attemptCount | Int | invalid-attempt counter |
| maxAttempts | Int | default 5 |
| requestIp | String? | rate limit tracking |
| userAgent | String? | audit |
| sendStatus | String? | `PENDING / SENT / FAILED` |
| sendError | String? | provider error summary |
| payloadJson | Json? | safe metadata only |
| createdAt | DateTime | |

### ScanLog
| field | type | notes |
|---|---|---|
| id | String | PK |
| tenantId | FK Tenant? | copied from event when present |
| eventId | FK | nullable if token invalid |
| staffId | FK | nullable if lookup failed |
| action | Enum | CLOCK_IN / CLOCK_OUT / LOOKUP / DUPLICATE / BLOCKED |
| ip | String? | |
| userAgent | String? | truncated 255 |
| lat / lng | Float? | optional GPS |
| message | String? | error reason |
| createdAt | DateTime | |

### AttendanceAdjustmentAudit
| field | type | notes |
|---|---|---|
| id | String | PK |
| sessionId | FK AttendanceSession | |
| editedBy | FK AdminUser | |
| editedAt | DateTime | |
| reason | String | |
| beforeJson | Json | snapshot before |
| afterJson | Json | snapshot after |

### AppSetting (key/value)
- `breakRuleVersion`
- `allow_pending_staff_clock_in`

## Status flow
`OPEN` → on clock-out → `COMPLETED`.
Cron-style query flags `OPEN` sessions older than 16h as `MISSING_CLOCK_OUT`
(computed in queries, not stored, to avoid background workers).
Admin edit any session → adds `MANUAL_ADJUSTED` flag.
Admin cancel → `CANCELLED` (excluded from payroll totals).

## Calculation
- Money stored as `Int` cents.
- Hours stored as `Int` minutes; rendered as `(min / 60).toFixed(2)`.
- Total pay cents = `round(payableMinutes / 60 * rateCents)`.
- Staff no longer store a default hourly rate; the source of truth is `WorkEvent.defaultRateCents`.

## Timezone
- All DB timestamps are UTC.
- Date boundaries (workDate, week start) computed in Asia/Kuala_Lumpur and
  stored as midnight-MYT converted to UTC.
- Week = Monday 00:00 MYT → Sunday 23:59:59 MYT.
