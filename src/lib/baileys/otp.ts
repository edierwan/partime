import { sendBaileysMessage } from '@/lib/baileys/client';
import type { WhatsAppOtpResult } from '@/lib/whatsapp';

export async function sendBaileysOtp({
  toPhoneE164,
  code,
  tenantId,
}: {
  toPhoneE164: string;
  code: string;
  tenantId?: string;
}): Promise<WhatsAppOtpResult> {
  const text = `Your Partime verification code is ${code}. This code expires in 5 minutes.`;
  const result = await sendBaileysMessage({
    toPhoneE164,
    text,
    tenantId,
    purpose: 'otp',
    metadata: { messagePurpose: 'otp' },
  });

  if (result.error === 'baileys_base_url_missing' || result.error === 'baileys_session_not_configured' || result.error === 'baileys_api_key_missing') {
    return { ...result, error: 'otp_service_not_configured', detail: result.detail || 'WhatsApp OTP is not configured.' };
  }
  if (result.error === 'baileys_service_unreachable') {
    return { ...result, error: 'otp_service_unreachable' };
  }
  return result;
}