import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionForAccess, createSessionToken, getSession, setSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  role: z.enum(['ADMIN', 'EMPLOYER', 'WORKER']),
  tenantId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const contentType = req.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await req.json().catch(() => null)
    : Object.fromEntries((await req.formData()).entries());

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: 'invalid input' }, { status: 400 });

  const selected = await createSessionForAccess(session.sub, parsed.data.role, parsed.data.tenantId || null);
  if (!selected) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  await setSessionCookie(await createSessionToken(selected.session));

  if (contentType.includes('application/json')) {
    return NextResponse.json({ ok: true, redirectTo: selected.redirectTo });
  }

  return NextResponse.redirect(new URL(selected.redirectTo, req.url), { status: 303 });
}
