import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate, createSessionToken, setSessionCookie } from '@/lib/auth';
import { getGenericLoginError } from '@/lib/auth-identifiers';
import { normalizeLocale } from '@/lib/public-i18n';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  locale: z.string().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const locale = normalizeLocale(
    typeof body === 'object' && body && 'locale' in body && typeof body.locale === 'string'
      ? body.locale
      : req.headers.get('x-partime-locale')
  );
  const genericLoginError = getGenericLoginError(locale);
  const requestIp = clientIp(req);
  const rateLimit = checkRateLimit({ key: `login:${requestIp || 'unknown'}`, limit: 20, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.ok) return NextResponse.json({ error: genericLoginError }, { status: 429 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const result = await authenticate(parsed.data.identifier, parsed.data.password);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: genericLoginError,
        redirectTo: appendLocale(result.redirectTo, locale),
      },
      { status: result.redirectTo ? 403 : 401 }
    );
  }

  const token = await createSessionToken(result.session);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, redirectTo: result.redirectTo });
}

function clientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

function appendLocale(path: string | undefined, locale: string): string | undefined {
  if (!path || !path.startsWith('/')) return path;
  const [pathname, queryString = ''] = path.split('?', 2);
  const params = new URLSearchParams(queryString);
  params.set('lang', locale);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}
