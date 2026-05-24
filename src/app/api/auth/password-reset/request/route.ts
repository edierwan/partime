import { NextResponse } from 'next/server';
import { z } from 'zod';
import { GENERIC_PASSWORD_RESET_MESSAGE } from '@/lib/auth-identifiers';
import { requestPasswordReset } from '@/lib/auth-verification';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({ identifier: z.string().min(1) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: true, message: GENERIC_PASSWORD_RESET_MESSAGE });

  const requestIp = clientIp(req);
  const rateLimit = checkRateLimit({ key: `password-reset:${requestIp || 'unknown'}`, limit: 8, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.ok) return NextResponse.json({ ok: true, message: GENERIC_PASSWORD_RESET_MESSAGE });

  const result = await requestPasswordReset({
    identifierInput: parsed.data.identifier,
    requestIp,
    userAgent: req.headers.get('user-agent')?.slice(0, 250) || null,
  });
  return NextResponse.json(result);
}

function clientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}
