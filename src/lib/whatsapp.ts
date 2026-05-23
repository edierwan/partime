export interface WhatsAppSendResult {
  ok: boolean;
  error?: string;
  detail?: string;
  messageId?: string | null;
  payload?: unknown;
  sessionId?: string | null;
  providerTenant?: string;
  requestUrl?: string | null;
  statusCode?: number;
}

export type WhatsAppOtpResult = WhatsAppSendResult;

import { defaultWhatsAppProviderTenant, isBaileysSendConfigured, sendBaileysMessage } from '@/lib/baileys/client';
import { sendBaileysOtp } from '@/lib/baileys/otp';

export function isWhatsAppOtpConfigured(): boolean {
  return isBaileysSendConfigured();
}

export const isWhatsAppConfigured = isWhatsAppOtpConfigured;

export function defaultWhatsAppTenant(): string {
  return defaultWhatsAppProviderTenant();
}

export async function sendWhatsAppMessage({
  toPhoneE164,
  text,
  tenant = defaultWhatsAppProviderTenant(),
}: {
  toPhoneE164: string;
  text: string;
  tenant?: string;
}): Promise<WhatsAppSendResult> {
  const result = await sendBaileysMessage({ toPhoneE164, text, tenantId: tenant });
  if (result.error === 'baileys_base_url_missing' || result.error === 'baileys_session_not_configured' || result.error === 'baileys_api_key_missing') {
    return { ...result, error: 'whatsapp_service_not_configured', detail: result.detail || 'WhatsApp service is not configured.' };
  }
  if (result.error === 'baileys_service_unreachable') {
    return { ...result, error: 'whatsapp_service_unreachable' };
  }
  return result;
}

export async function sendWhatsAppOtp({
  toPhoneE164,
  code,
  tenant = defaultWhatsAppProviderTenant(),
}: {
  toPhoneE164: string;
  code: string;
  tenant?: string;
}): Promise<WhatsAppOtpResult> {
  return sendBaileysOtp({ toPhoneE164, code, tenantId: tenant });
}