import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  generateOtpCode,
  hashOtpCode,
  otpExpiresAt,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS_PER_IP,
  OTP_MAX_SENDS_PER_PHONE,
} from '@/lib/otp';
import { parseStaffProfileForm } from '@/lib/staff-profile';
import { sendWhatsAppOtp } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ ok: false, message: 'Invalid submission.' }, { status: 400 });
  }

  const parsed = await parseStaffProfileForm(formData, { defaultApprovalStatus: 'PENDING_REVIEW', defaultActive: true });
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.error, fieldErrors: parsed.fieldErrors }, { status: 400 });
  }

  const data = parsed.data;
  const now = new Date();
  const requestIp = clientIp(req);
  const userAgent = req.headers.get('user-agent')?.slice(0, 250) || null;

  const duplicate = await prisma.staff.findFirst({
    where: {
      OR: [
        { phoneE164: data.phoneE164 },
        { aliasPanggilan: data.aliasPanggilan },
        ...(data.email ? [{ email: data.email }] : []),
        ...(data.icNumberNormalized ? [{ icNumberNormalized: data.icNumberNormalized }] : []),
      ],
    },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({
      ok: false,
      message: 'We could not start verification for this profile. If you already registered, please contact admin.',
    }, { status: 400 });
  }

  const [phoneAttempts, ipAttempts] = await Promise.all([
    prisma.staffOtp.count({
      where: {
        phoneE164: data.phoneE164,
        purpose: 'STAFF_REGISTER',
        createdAt: { gte: new Date(now.getTime() - 15 * 60 * 1000) },
      },
    }),
    requestIp
      ? prisma.staffOtp.count({
          where: {
            requestIp,
            purpose: 'STAFF_REGISTER',
            createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
          },
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
      phoneE164: data.phoneE164,
      codeHash: hashOtpCode({ phoneE164: data.phoneE164, purpose: 'STAFF_REGISTER', code }),
      purpose: 'STAFF_REGISTER',
      expiresAt: otpExpiresAt(now),
      attemptCount: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      requestIp,
      userAgent,
      sendStatus: 'PENDING',
      payloadJson: {
        fullName: data.fullName,
        payName: data.payName,
        aliasPanggilan: data.aliasPanggilan,
        phoneE164: data.phoneE164,
        email: data.email,
        icNumberNormalized: data.icNumberNormalized,
      },
    },
  });

  const delivery = await sendWhatsAppOtp({ toPhoneE164: data.phoneE164, code });
  if (!delivery.ok) {
    await prisma.staffOtp.update({
      where: { id: otp.id },
      data: {
        sendStatus: 'FAILED',
        sendError: delivery.detail || delivery.error || 'OTP delivery failed',
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
        fullName: data.fullName,
        payName: data.payName,
        aliasPanggilan: data.aliasPanggilan,
        phoneE164: data.phoneE164,
        email: data.email,
        icNumberNormalized: data.icNumberNormalized,
        messageId: delivery.messageId || null,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    message: `OTP sent to WhatsApp ending ${data.phoneE164.slice(-4)}. The code expires in 5 minutes.`,
  });
}

function clientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}