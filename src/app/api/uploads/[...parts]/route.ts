import { NextRequest } from 'next/server';
import { readLocalUpload } from '@/lib/uploads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { parts: string[] } }) {
  const key = (params.parts || []).join('/');
  if (!key) return new Response('Not found', { status: 404 });

  try {
    const { data, size } = await readLocalUpload(key);
    const type = key.endsWith('.png') ? 'image/png'
      : key.endsWith('.webp') ? 'image/webp'
      : 'image/jpeg';
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': type,
        'Content-Length': String(size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}