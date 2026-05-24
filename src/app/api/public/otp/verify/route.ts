import { NextResponse } from 'next/server';
import { verifyOtpCode } from '@/lib/otp-service';
import { normalizeMalaysiaPhone } from '@/lib/staff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedPurposes = new Set(['PART_TIMER_REGISTER', 'EMPLOYER_REGISTER']);

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 });

  const purpose = String(formData.get('purpose') || '').trim();
  const phoneE164 = normalizeMalaysiaPhone(String(formData.get('phone') || formData.get('contactPhone') || '').trim());
  const code = String(formData.get('otpCode') || '').trim();
  if (!allowedPurposes.has(purpose) || !phoneE164 || !/^\d{4}$/.test(code)) {
    return NextResponse.json({ ok: false, message: 'Invalid OTP request.' }, { status: 400 });
  }

  const result = await verifyOtpCode({
    phoneE164,
    purpose: purpose as any,
    code,
    consumeOnSuccess: true,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, message: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true, expiresInSeconds: result.expiresInSeconds });
}