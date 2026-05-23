export interface WhatsAppOtpResult {
  ok: boolean;
  error?: string;
  detail?: string;
  messageId?: string | null;
}

function normalizedBaseUrl(): string {
  return (process.env.BAILEYS_API_BASE_URL || '').trim().replace(/\/+$/, '');
}

function sendPathTemplate(): string {
  return (process.env.BAILEYS_SEND_PATH || '/api/sessions/{tenant}/messages').trim();
}

function authHeaderName(): string {
  return (process.env.BAILEYS_AUTH_HEADER || 'X-WAPI-Secret').trim();
}

export function isWhatsAppOtpConfigured(): boolean {
  return Boolean(normalizedBaseUrl() && process.env.BAILEYS_API_KEY);
}

export async function sendWhatsAppOtp({
  toPhoneE164,
  code,
  tenant = process.env.BAILEYS_TENANT || 'partime',
}: {
  toPhoneE164: string;
  code: string;
  tenant?: string;
}): Promise<WhatsAppOtpResult> {
  if (!isWhatsAppOtpConfigured()) {
    return { ok: false, error: 'otp_service_not_configured', detail: 'WhatsApp OTP is not configured.' };
  }

  const url = `${normalizedBaseUrl()}${sendPathTemplate().replace('{tenant}', encodeURIComponent(tenant))}`;
  const text = `Your Partime verification code is ${code}. This code expires in 5 minutes.`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [authHeaderName()]: process.env.BAILEYS_API_KEY || '',
      },
      body: JSON.stringify({
        to: toPhoneE164.replace(/^\+/, ''),
        text,
        message: text,
        tenantId: tenant,
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
        detail: payload?.error?.message || payload?.message || payload?.detail || 'OTP service is temporarily unavailable. Please try again later.',
      };
    }

    return {
      ok: true,
      messageId: payload?.messageId || payload?.message_id || null,
    };
  } catch (error) {
    return {
      ok: false,
      error: 'otp_service_unreachable',
      detail: error instanceof Error ? error.message : 'OTP service is temporarily unavailable. Please try again later.',
    };
  }
}