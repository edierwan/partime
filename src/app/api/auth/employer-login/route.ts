import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateEmployerByPhone, createSessionToken, resolveAuthenticatedHomePath, setSessionCookie } from '@/lib/auth';
import { verifyOtpCode } from '@/lib/otp-service';
import { normalizeMalaysiaPhone } from '@/lib/staff';

const schema = z.object({
  phone: z.string().min(1),
  otpCode: z.string().regex(/^\d{4}$/),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', message: 'Enter a valid phone number and 4-digit OTP.' }, { status: 400 });
  }

  const phoneE164 = normalizeMalaysiaPhone(parsed.data.phone);
  if (!phoneE164) {
    return NextResponse.json({ error: 'INVALID_PHONE', message: 'Enter a valid Malaysia mobile number.' }, { status: 400 });
  }

  const otpResult = await verifyOtpCode({
    phoneE164,
    purpose: 'EMPLOYER_LOGIN' as any,
    code: parsed.data.otpCode,
    consumeOnSuccess: true,
  });
  if (!otpResult.ok) {
    return NextResponse.json({ error: otpResult.error, message: otpResult.message }, { status: otpResult.status });
  }

  const employerSession = await authenticateEmployerByPhone(phoneE164);
  if (!employerSession) {
    return NextResponse.json({ error: 'EMPLOYER_NOT_FOUND', message: 'No employer workspace was found for this WhatsApp number.' }, { status: 404 });
  }

  const token = await createSessionToken(employerSession);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, redirectTo: resolveAuthenticatedHomePath(employerSession) });
}