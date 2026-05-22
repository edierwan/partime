import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate, createSessionToken, setSessionCookie } from '@/lib/auth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

  const token = await createSessionToken(user);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
