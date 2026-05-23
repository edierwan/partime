import { NextRequest } from 'next/server';
import { readStoredUpload } from '@/lib/uploads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, props: { params: Promise<{ parts: string[] }> }) {
  const params = await props.params;
  const key = (params.parts || []).join('/');
  if (!key) return new Response('Not found', { status: 404 });

  try {
    const { data, size } = await readStoredUpload(key);
    const type = key.endsWith('.png') ? 'image/png'
      : key.endsWith('.webp') ? 'image/webp'
      : key.endsWith('.mp4') ? 'video/mp4'
      : key.endsWith('.webm') ? 'video/webm'
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