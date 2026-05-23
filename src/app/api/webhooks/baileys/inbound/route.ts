import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeMalaysiaPhone } from '@/lib/staff';
import { defaultWhatsAppTenant, sendWhatsAppMessage } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type WebhookEvent = {
  sessionId?: string;
  type?: string;
  payload?: any;
  timestamp?: string;
};

function configuredSecret() {
  return process.env.BAILEYS_WEBHOOK_SECRET || process.env.WAPI_SECRET || '';
}

function cleanSignature(input: string | null): string {
  return String(input || '').trim().replace(/^sha256=/i, '').replace(/^v1=/i, '');
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = configuredSecret();
  if (!secret) return false;
  const provided = cleanSignature(signature);
  if (!provided) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const providedBuffer = Buffer.from(provided, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

function normalizedEventType(type: string | undefined): string {
  switch (type) {
    case 'message.inbound':
      return 'messages.upsert';
    case 'message.status':
      return 'messages.update';
    case 'connected':
      return 'session.connected';
    case 'disconnected':
      return 'session.disconnected';
    default:
      return type || 'unknown';
  }
}

function textFromPayload(payload: any): string {
  const message = payload?.messages?.[0] || payload?.message || payload;
  return String(
    payload?.text ||
    payload?.body ||
    message?.text ||
    message?.body ||
    message?.message?.conversation ||
    message?.message?.extendedTextMessage?.text ||
    '',
  ).trim();
}

function messageIdFromPayload(payload: any): string | null {
  const message = payload?.messages?.[0] || payload?.message || payload;
  return payload?.messageId || message?.messageId || message?.key?.id || message?.id || null;
}

function phoneFromPayload(payload: any): string | null {
  const message = payload?.messages?.[0] || payload?.message || payload;
  const raw = payload?.phone || payload?.from || message?.phone || message?.from || message?.key?.remoteJid || '';
  const digits = String(raw).split('@')[0].replace(/\D/g, '');
  if (!digits) return null;
  return normalizeMalaysiaPhone(`+${digits}`) || normalizeMalaysiaPhone(digits) || `+${digits}`;
}

function replyIntent(body: string): 'INTERESTED' | 'NOT_INTERESTED' | 'INVALID' | null {
  const normalized = body.trim().toLowerCase();
  if (!normalized) return null;
  if (/^(1|yes|y|minat|interested)\b/.test(normalized)) return 'INTERESTED';
  if (/^(2|no|n|tak|tidak|not interested)\b/.test(normalized)) return 'NOT_INTERESTED';
  return 'INVALID';
}

function outboundStatusFromPayload(payload: any): 'DELIVERED' | 'READ' | 'FAILED' | null {
  const raw = String(payload?.status || payload?.update?.status || '').toLowerCase();
  if (raw === '4' || raw.includes('read')) return 'READ';
  if (raw === '3' || raw.includes('deliver')) return 'DELIVERED';
  if (raw.includes('fail') || raw.includes('error')) return 'FAILED';
  return null;
}

async function sendLoggedReply({ tenantId, offerId, offerRecipientId, toPhoneE164, body, providerTenant }: { tenantId?: string | null; offerId?: string | null; offerRecipientId?: string | null; toPhoneE164: string; body: string; providerTenant: string }) {
  const outbound = await prisma.whatsAppOutboundMessage.create({
    data: {
      tenantId: tenantId || null,
      offerId: offerId || null,
      offerRecipientId: offerRecipientId || null,
      providerTenant,
      toPhone: toPhoneE164.replace(/^\+/, ''),
      body,
      status: 'QUEUED',
    },
  });
  const result = await sendWhatsAppMessage({ toPhoneE164, text: body, tenant: providerTenant });
  await prisma.whatsAppOutboundMessage.update({
    where: { id: outbound.id },
    data: {
      status: result.ok ? 'SENT' : 'FAILED',
      providerMessageId: result.messageId || null,
      payload: result.payload as object | undefined,
      errorCode: result.error || null,
      errorMessage: result.detail || null,
    },
  });
}

async function handleMessageStatus(event: WebhookEvent, eventType: string) {
  const payload = event.payload || {};
  const messageId = messageIdFromPayload(payload);
  const status = outboundStatusFromPayload(payload);
  if (!messageId || !status) return { handled: false };
  const outbound = await prisma.whatsAppOutboundMessage.findFirst({ where: { providerMessageId: messageId }, include: { offerRecipient: true } });
  if (!outbound) return { handled: false };
  const providerTenant = defaultWhatsAppTenant();
  await prisma.whatsAppOutboundMessage.update({ where: { id: outbound.id }, data: { status, payload: payload as object } });
  if (outbound.offerRecipientId && status === 'DELIVERED') {
    await prisma.jobOfferRecipient.update({ where: { id: outbound.offerRecipientId }, data: { status: 'DELIVERED', deliveredAt: new Date() } });
  }
  await prisma.whatsAppInboundMessage.create({
    data: {
      tenantId: outbound.tenantId,
      offerRecipientId: outbound.offerRecipientId,
      providerTenant,
      eventType,
      providerMessageId: messageId,
      fromPhone: payload?.remoteJid || null,
      payload: { ...payload, normalizedStatus: status, sessionId: event.sessionId || null },
    },
  });
  return { handled: true };
}

async function handleInboundMessage(event: WebhookEvent, eventType: string) {
  const payload = event.payload || {};
  const fromPhone = phoneFromPayload(payload);
  const body = textFromPayload(payload);
  const providerMessageId = messageIdFromPayload(payload);
  const providerTenant = defaultWhatsAppTenant();
  const intent = replyIntent(body);
  const partTimer = fromPhone ? await prisma.staff.findUnique({ where: { phoneE164: fromPhone } }) : null;
  const recipient = partTimer ? await prisma.jobOfferRecipient.findFirst({
    where: { partTimerId: partTimer.id, status: { in: ['OFFER_SENT', 'DELIVERED', 'NO_RESPONSE'] } },
    include: { offer: true },
    orderBy: { createdAt: 'desc' },
  }) : null;

  await prisma.whatsAppInboundMessage.create({
    data: {
      tenantId: recipient?.offer.tenantId || null,
      offerRecipientId: recipient?.id || null,
      providerTenant,
      eventType,
      providerMessageId,
      fromPhone,
      body,
      interpretedReply: intent,
      payload: { ...(event as object), sessionId: event.sessionId || null },
    },
  });

  if (!recipient || !fromPhone || !intent) return { handled: false, intent };
  if (intent === 'INVALID') {
    await prisma.jobOfferRecipient.update({ where: { id: recipient.id }, data: { replyText: body, replyReceivedAt: new Date() } });
    await sendLoggedReply({ tenantId: recipient.offer.tenantId, offerId: recipient.offerId, offerRecipientId: recipient.id, toPhoneE164: fromPhone, providerTenant, body: 'Please reply 1 if interested or 2 if not interested.' });
    return { handled: true, intent };
  }

  const interested = intent === 'INTERESTED';
  await prisma.jobOfferRecipient.update({
    where: { id: recipient.id },
    data: {
      status: interested ? 'INTERESTED' : 'NOT_INTERESTED',
      replyText: body,
      replyReceivedAt: new Date(),
    },
  });
  if (interested) {
    await prisma.jobInterest.upsert({
      where: { jobId_partTimerId: { jobId: recipient.offer.jobId, partTimerId: recipient.partTimerId } },
      update: { status: 'INTERESTED', note: 'WhatsApp offer reply' },
      create: { jobId: recipient.offer.jobId, partTimerId: recipient.partTimerId, status: 'INTERESTED', note: 'WhatsApp offer reply' },
    });
  }
  await sendLoggedReply({
    tenantId: recipient.offer.tenantId,
    offerId: recipient.offerId,
    offerRecipientId: recipient.id,
    toPhoneE164: fromPhone,
    providerTenant,
    body: interested ? 'Thanks. Your interest has been recorded in Partime.' : 'Thanks. We have recorded that you are not interested in this offer.',
  });
  return { handled: true, intent };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!configuredSecret()) return NextResponse.json({ ok: false, error: 'webhook_secret_not_configured' }, { status: 503 });
  const signature = req.headers.get('x-wa-signature') || req.headers.get('x-wapi-signature');
  if (!verifySignature(rawBody, signature)) return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 401 });

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const eventType = normalizedEventType(event.type);
  if (eventType === 'messages.update') {
    const result = await handleMessageStatus(event, eventType);
    return NextResponse.json({ ok: true, eventType, ...result });
  }
  if (eventType === 'messages.upsert') {
    const result = await handleInboundMessage(event, eventType);
    return NextResponse.json({ ok: true, eventType, ...result });
  }

  await prisma.auditLog.create({
    data: {
      action: eventType,
      entityType: 'baileys-webhook',
      entityId: event.sessionId || null,
      metadata: event as object,
    },
  });
  return NextResponse.json({ ok: true, eventType, handled: true });
}