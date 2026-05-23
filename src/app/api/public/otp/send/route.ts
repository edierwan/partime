import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getBaileysGatewayDiagnostics } from '@/lib/baileys/client';
import { normalizeMalaysiaPhone } from '@/lib/staff';
import { generateOtpCode, hashOtpCode, otpExpiresAt, OTP_MAX_ATTEMPTS, OTP_MAX_SENDS_PER_IP, OTP_MAX_SENDS_PER_PHONE } from '@/lib/otp';
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

  const rawPhone = String(formData.get('phone') || formData.get('contactPhone') || '').trim();
  const phoneE164 = normalizeMalaysiaPhone(rawPhone);
  if (!phoneE164) {
    return NextResponse.json({ ok: false, message: 'Enter a valid Malaysia mobile number.', fieldErrors: { phone: 'Enter a valid Malaysia mobile number.', contactPhone: 'Enter a valid Malaysia mobile number.' } }, { status: 400 });
  }

  const now = new Date();
  const requestIp = clientIp(req);
  const userAgent = req.headers.get('user-agent')?.slice(0, 250) || null;

  const [phoneAttempts, ipAttempts] = await Promise.all([
    prisma.staffOtp.count({
      where: { phoneE164, purpose: purpose as any, createdAt: { gte: new Date(now.getTime() - 15 * 60 * 1000) } },
    }),
    requestIp
      ? prisma.staffOtp.count({
          where: { requestIp, purpose: purpose as any, createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
        })
      : Promise.resolve(0),
  ]);

  if (phoneAttempts >= OTP_MAX_SENDS_PER_PHONE) {
    return NextResponse.json({ ok: false, message: 'Too many OTP requests for this phone. Please wait 15 minutes and try again.' }, { status: 429 });
  }
  if (ipAttempts >= OTP_MAX_SENDS_PER_IP) {
    return NextResponse.json({ ok: false, message: 'Too many OTP requests from this network. Please try again later.' }, { status: 429 });
  }

  const code = generateOtpCode();
  const otp = await prisma.staffOtp.create({
    data: {
      phoneE164,
      codeHash: hashOtpCode({ phoneE164, purpose, code }),
      purpose: purpose as any,
      expiresAt: otpExpiresAt(now),
      attemptCount: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      requestIp,
      userAgent,
      sendStatus: 'PENDING',
    },
  });

  const delivery = await sendWhatsAppOtp({ toPhoneE164: phoneE164, code });
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
    await prisma.staffOtp.update({
      where: { id: otp.id },
      data: {
        sendStatus: 'FAILED',
        sendError: delivery.detail || delivery.error || 'OTP delivery failed',
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
      },
    });
    return NextResponse.json({ ok: false, message: 'We could not send the WhatsApp OTP right now. Please try again shortly.' }, { status: 503 });
  }

  await prisma.staffOtp.update({
    where: { id: otp.id },
    data: {
      sendStatus: 'SENT',
      sendError: null,
      payloadJson: {
        purpose,
        messageId: delivery.messageId || null,
        providerTenant: delivery.providerTenant || null,
        sessionId: delivery.sessionId || null,
        requestUrl: delivery.requestUrl || null,
      },
    },
  });

  return NextResponse.json({ ok: true, message: `OTP sent to WhatsApp ending ${phoneE164.slice(-4)}. The code expires in 5 minutes.` });
}

function clientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}