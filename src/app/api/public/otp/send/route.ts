import { NextResponse } from 'next/server';
import { OtpPurpose } from '@prisma/client';
import { getBaileysGatewayDiagnostics } from '@/lib/baileys/client';
import { parseEmployerRegistrationForm } from '@/lib/employer-registration';
import { markOtpSendFailed, markOtpSent, reserveOtpSend } from '@/lib/otp-service';
import { parseStaffProfileForm } from '@/lib/staff-profile';
import { normalizeMalaysiaPhone } from '@/lib/staff';
import { sendWhatsAppOtp } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedPurposes = new Set(['PART_TIMER_REGISTER', 'EMPLOYER_REGISTER']);

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 });

  const purpose = String(formData.get('purpose') || '').trim();
  if (!allowedPurposes.has(purpose)) {
    return NextResponse.json({ ok: false, message: 'Invalid OTP purpose.' }, { status: 400 });
  }

  let phoneE164 = '';
  if (purpose === 'EMPLOYER_REGISTER') {
    const parsed = await parseEmployerRegistrationForm(formData);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: 'REGISTRATION_INCOMPLETE', message: parsed.error, fieldErrors: parsed.fieldErrors }, { status: 400 });
    }
    phoneE164 = parsed.data.contactPhoneE164;
  } else if (purpose === 'PART_TIMER_REGISTER') {
    const parsed = await parseStaffProfileForm(formData, {
      defaultApprovalStatus: 'PENDING_REVIEW',
      defaultStatus: 'PENDING_REVIEW',
      defaultActive: true,
      requireIdentity: true,
      requireSkills: true,
      requireConsent: true,
      requireStructuredLocation: true,
      requirePassword: true,
    });
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: 'REGISTRATION_INCOMPLETE', message: parsed.error, fieldErrors: parsed.fieldErrors }, { status: 400 });
    }
    phoneE164 = parsed.data.phoneE164;
  } else {
    phoneE164 = normalizeMalaysiaPhone(String(formData.get('phoneE164') || formData.get('phone') || formData.get('contactPhone') || '').trim());
    if (!phoneE164) {
      return NextResponse.json({ ok: false, message: 'Enter a valid Malaysia mobile number.', fieldErrors: { phone: 'Enter a valid Malaysia mobile number.', contactPhone: 'Enter a valid Malaysia mobile number.' } }, { status: 400 });
    }
  }

  const requestIp = clientIp(req);
  const userAgent = req.headers.get('user-agent')?.slice(0, 250) || null;

  const reservation = await reserveOtpSend({
    phoneE164,
    purpose: purpose as OtpPurpose,
    requestIp,
    userAgent,
  });
  if (!reservation.ok) {
    return NextResponse.json({
      ok: false,
      error: reservation.error,
      message: reservation.message,
      retryAfterSeconds: reservation.retryAfterSeconds,
      expiresInSeconds: reservation.expiresInSeconds,
      maskedPhone: reservation.maskedPhone,
    }, { status: reservation.status });
  }

  const delivery = await sendWhatsAppOtp({ toPhoneE164: phoneE164, code: reservation.code });
  if (!delivery.ok) {
    const diagnostics = getBaileysGatewayDiagnostics();
    const diagnosticPayload = {
      configured: diagnostics.configured,
      baseUrl: diagnostics.baseUrl,
      sessionId: diagnostics.sessionId,
      providerTenant: diagnostics.providerTenant,
      authHeader: diagnostics.authHeader,
      sendPath: diagnostics.sendPath,
      resolvedUrl: diagnostics.resolvedUrl,
      hasApiKey: diagnostics.hasApiKey,
    };
    await markOtpSendFailed({
      otpId: reservation.otpId,
      error: delivery.detail || delivery.error || 'OTP delivery failed',
      payloadJson: {
        purpose,
        error: delivery.error || null,
        detail: delivery.detail || null,
        providerTenant: delivery.providerTenant || diagnostics.providerTenant,
        sessionId: delivery.sessionId || diagnostics.sessionId,
        requestUrl: delivery.requestUrl || diagnostics.resolvedUrl,
        statusCode: delivery.statusCode || null,
        diagnostics: diagnosticPayload,
      },
    });
    return NextResponse.json({ ok: false, message: 'We could not send the WhatsApp OTP right now. Please try again shortly.' }, { status: 503 });
  }

  await markOtpSent({
    otpId: reservation.otpId,
    providerMessageId: delivery.messageId || null,
    payloadJson: {
      purpose,
      messageId: delivery.messageId || null,
      providerTenant: delivery.providerTenant || null,
      sessionId: delivery.sessionId || null,
      requestUrl: delivery.requestUrl || null,
    },
  });

  return NextResponse.json({
    ok: true,
    message: `OTP sent to WhatsApp ending ${reservation.maskedPhone.slice(-4)}. The code expires in 5 minutes.`,
    expiresInSeconds: reservation.expiresInSeconds,
    resendAfterSeconds: reservation.resendAfterSeconds,
    maskedPhone: reservation.maskedPhone,
  });
}

function clientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}