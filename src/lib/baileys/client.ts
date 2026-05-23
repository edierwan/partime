import type { WhatsAppSendResult } from '@/lib/whatsapp';

export interface BaileysGatewayDiagnostics {
  configured: boolean;
  baseUrl: string | null;
  sessionId: string | null;
  providerTenant: string;
  authHeader: string;
  sendPath: string;
  resolvedUrl: string | null;
  hasApiKey: boolean;
}

export interface BaileysSendMessageInput {
  toPhoneE164: string;
  text: string;
  tenantId?: string;
  purpose?: string;
  metadata?: Record<string, unknown>;
}

export interface BaileysSendMessageResult extends WhatsAppSendResult {
  sessionId?: string | null;
  providerTenant?: string;
  requestUrl?: string | null;
  statusCode?: number;
}

function normalizedBaseUrl(): string {
  return (process.env.BAILEYS_API_BASE_URL || '').trim().replace(/\/+$/, '');
}

function configuredSessionId(): string {
  return (process.env.BAILEYS_SESSION_ID || process.env.BAILEYS_TENANT || '').trim();
}

function configuredProviderTenant(): string {
  return (
    process.env.BAILEYS_PROVIDER_TENANT ||
    process.env.BAILEYS_TENANT_LABEL ||
    process.env.BAILEYS_TENANT ||
    'partime'
  ).trim() || 'partime';
}

function sendPathTemplate(): string {
  return (process.env.BAILEYS_SEND_PATH || '/api/sessions/{sessionId}/messages').trim();
}

function authHeaderName(): string {
  return (process.env.BAILEYS_AUTH_HEADER || 'X-WAPI-Secret').trim();
}

function buildSendUrl(baseUrl: string, sessionId: string): string {
  return `${baseUrl}${sendPathTemplate()
    .replace('{sessionId}', encodeURIComponent(sessionId))
    .replace('{tenant}', encodeURIComponent(sessionId))
    .replace('{id}', encodeURIComponent(sessionId))}`;
}

export function defaultWhatsAppProviderTenant(): string {
  return configuredProviderTenant();
}

export function getBaileysGatewayDiagnostics(): BaileysGatewayDiagnostics {
  const baseUrl = normalizedBaseUrl() || null;
  const sessionId = configuredSessionId() || null;
  const hasApiKey = Boolean(process.env.BAILEYS_API_KEY);
  const resolvedUrl = baseUrl && sessionId ? buildSendUrl(baseUrl, sessionId) : null;
  return {
    configured: Boolean(baseUrl && sessionId && hasApiKey),
    baseUrl,
    sessionId,
    providerTenant: configuredProviderTenant(),
    authHeader: authHeaderName(),
    sendPath: sendPathTemplate(),
    resolvedUrl,
    hasApiKey,
  };
}

export function isBaileysSendConfigured(): boolean {
  return getBaileysGatewayDiagnostics().configured;
}

export async function sendBaileysMessage(input: BaileysSendMessageInput): Promise<BaileysSendMessageResult> {
  const diagnostics = getBaileysGatewayDiagnostics();
  if (!diagnostics.baseUrl) {
    return {
      ok: false,
      error: 'baileys_base_url_missing',
      detail: 'BAILEYS_API_BASE_URL is not configured.',
      providerTenant: diagnostics.providerTenant,
      sessionId: diagnostics.sessionId,
      requestUrl: diagnostics.resolvedUrl,
    };
  }
  if (!diagnostics.sessionId) {
    return {
      ok: false,
      error: 'baileys_session_not_configured',
      detail: 'BAILEYS_SESSION_ID is not configured.',
      providerTenant: diagnostics.providerTenant,
      sessionId: diagnostics.sessionId,
      requestUrl: diagnostics.resolvedUrl,
    };
  }
  if (!diagnostics.hasApiKey) {
    return {
      ok: false,
      error: 'baileys_api_key_missing',
      detail: 'BAILEYS_API_KEY is not configured.',
      providerTenant: diagnostics.providerTenant,
      sessionId: diagnostics.sessionId,
      requestUrl: diagnostics.resolvedUrl,
    };
  }

  const requestUrl = buildSendUrl(diagnostics.baseUrl, diagnostics.sessionId);
  const providerTenant = input.tenantId || diagnostics.providerTenant;

  try {
    const res = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [diagnostics.authHeader]: process.env.BAILEYS_API_KEY || '',
      },
      body: JSON.stringify({
        to: input.toPhoneE164.replace(/^\+/, ''),
        text: input.text,
        tenantId: providerTenant,
        metadata: {
          providerTenant,
          purpose: input.purpose || null,
          ...(input.metadata || {}),
        },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });

    const raw = await res.text();
    let payload: any = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = { raw };
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        error: payload?.error?.code || payload?.error || `upstream_${res.status}`,
        detail: payload?.error?.message || payload?.message || payload?.detail || 'WhatsApp service is temporarily unavailable. Please try again later.',
        payload,
        providerTenant,
        sessionId: diagnostics.sessionId,
        requestUrl,
        statusCode: res.status,
      };
    }

    return {
      ok: true,
      messageId: payload?.messageId || payload?.message_id || payload?.id || null,
      payload,
      providerTenant,
      sessionId: diagnostics.sessionId,
      requestUrl,
      statusCode: res.status,
    };
  } catch (error) {
    return {
      ok: false,
      error: 'baileys_service_unreachable',
      detail: error instanceof Error ? error.message : 'WhatsApp service is temporarily unavailable. Please try again later.',
      providerTenant,
      sessionId: diagnostics.sessionId,
      requestUrl,
    };
  }
}