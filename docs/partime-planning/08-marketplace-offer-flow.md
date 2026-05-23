# Marketplace + WhatsApp Offer Flow

## Scope

Partime now supports a mobile-first public job marketplace, an authenticated employer workspace, and a WhatsApp offer loop for part-time jobs. Attendance, QR scanning, and payroll remain tied to `WorkEvent` so confirmed marketplace jobs can still use the existing operational flow.

## Public Flow

1. Visitors land on `/` and search public jobs.
2. `/jobs` filters jobs by keyword, state, category, skill, location, and minimum rate.
3. `/jobs/[id]` displays job details and captures interest by Malaysia WhatsApp number.
4. If the phone is unknown, the user is redirected to `/register/part-timer` with the phone and job reference.

## Employer Flow

1. Employers use the authenticated `/employer` workspace.
2. `/employer/jobs/new` creates a tenant-scoped `WorkEvent` with marketplace fields and skill requirements.
3. `/employer/jobs/[id]` shows interested part-timers and lets the employer prepare an offer batch.
4. `/employer/offers` sends WhatsApp offers to selected part-timers, logs each outbound message, and records send failures separately from human replies.

## WhatsApp Reply Contract

Outbound text includes:

- `1` = interested
- `2` = not interested

Inbound replies are received at:

```text
POST https://partime.getouch.co/api/webhooks/baileys/inbound
```

The endpoint verifies HMAC-SHA256 using `BAILEYS_WEBHOOK_SECRET`, accepting `X-WA-Signature` or `X-WAPI-Signature` over the raw JSON body.

Current gateway body shape:

```json
{ "sessionId": "partime", "type": "message.inbound", "payload": {}, "timestamp": "..." }
```

Partime normalizes these events:

| Gateway type | Internal type |
|---|---|
| `message.inbound` | `messages.upsert` |
| `message.status` | `messages.update` |
| `connected` | `session.connected` |
| `disconnected` | `session.disconnected` |

## Data Written

- `JobOffer`: offer batch for a tenant and job.
- `JobOfferRecipient`: one selected part-timer per offer.
- `WhatsAppOutboundMessage`: each outbound offer/confirmation/clarification message.
- `WhatsAppInboundMessage`: inbound replies and status events.
- `JobInterest`: upserted when a part-timer replies `1`.

No live payment gateway is integrated. `paymentStatus` and `payoutStatus` fields are placeholders for future finance workflows.