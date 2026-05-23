# Multi-Tenant Access Control

## Current State

Marketplace data is tenant-scoped at the database level:

- `Tenant`
- `WorkEvent.tenantId`
- `JobOffer.tenantId`
- `AttendanceSession.tenantId`
- `ScanLog.tenantId`
- WhatsApp logs and audit logs optionally reference `tenantId`

The employer workspace uses the existing admin session cookie and `currentAdminTenantId()` helper. This keeps the current deployment usable while the app transitions from single-tenant admin login to tenant-specific employer accounts.

## Public Access

These routes are intentionally public:

- `/`
- `/jobs`
- `/jobs/[id]`
- `/register/*`
- `/part-timer/*`
- `/scan/[token]`
- `/api/public/*`
- `/api/webhooks/baileys/inbound`

The webhook route is public at the network layer but requires a valid HMAC signature.

## Authenticated Access

- `/admin/*` requires the admin JWT session.
- `/employer/*` requires the same session for now.
- `/api/admin/*` returns `401` without the admin JWT session.

## Next Hardening Step

Before giving employers direct production login credentials, add a dedicated tenant context resolver:

1. Load the admin user by session `sub`.
2. Check `TenantMembership` for active memberships.
3. Allow platform admins to select tenant explicitly.
4. Require employer workspace actions to match the selected tenant.
5. Add server-side checks to all employer actions before mutation.

Until then, the workspace is suitable for internal/admin-operated employer flows and for validating marketplace operations.