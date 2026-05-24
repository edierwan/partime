import { NextResponse } from 'next/server';
import { z } from 'zod';
import { confirmPasswordReset } from '@/lib/auth-verification';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  identifier: z.string().min(1),
  code: z.string().regex(/^\d{4}$/),
  password: z.string().min(1),
  confirmPassword: z.string().min(1),
});

export async function POST(req: Request) {
  const requestIp = clientIp(req);
  const rateLimit = checkRateLimit({ key: `password-reset-confirm:${requestIp || 'unknown'}`, limit: 12, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.ok) return NextResponse.json({ ok: false, message: 'Too many attempts. Please try again later.' }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Invalid input.' }, { status: 400 });

  const result = await confirmPasswordReset({
    identifierInput: parsed.data.identifier,
    code: parsed.data.code,
    password: parsed.data.password,
    confirmPassword: parsed.data.confirmPassword,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}

function clientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}
