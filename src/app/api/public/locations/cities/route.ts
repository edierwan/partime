import { NextResponse } from 'next/server';
import { listMalaysiaCities } from '@/lib/malaysia-locations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const stateCode = url.searchParams.get('stateCode') || '';
  const cities = await listMalaysiaCities(stateCode);
  return NextResponse.json({ cities }, { headers: CACHE_HEADERS });
}