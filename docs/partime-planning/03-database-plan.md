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
| createdAt | DateTime | |

### Staff
| field | type | notes |
|---|---|---|
| id | String (cuid) | PK |
| payName | String | short payroll name |
| alias | String unique | match key (uppercase trim) |
| fullName | String | legal full name |
| phone | String unique | normalized digits |
| bankName | String? | |
| bankAccount | String? | masked in UI |
| hourlyRateCents | Int | default rate (MYR cents) |
| active | Boolean | default true |
| notes | String? | |
| createdAt / updatedAt | DateTime | |

### WorkEvent
| field | type | notes |
|---|---|---|
| id | String (cuid) | PK |
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

### ScanLog
| field | type | notes |
|---|---|---|
| id | String | PK |
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
- `defaultHourlyRateCents`
- `breakRuleVersion`

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

## Timezone
- All DB timestamps are UTC.
- Date boundaries (workDate, week start) computed in Asia/Kuala_Lumpur and
  stored as midnight-MYT converted to UTC.
- Week = Monday 00:00 MYT → Sunday 23:59:59 MYT.
