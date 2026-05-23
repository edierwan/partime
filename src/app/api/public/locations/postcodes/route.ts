import { NextResponse } from 'next/server';
import { searchMalaysiaPostcodes } from '@/lib/malaysia-locations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60, s-maxage=600, stale-while-revalidate=600',
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get('query') || '';
  const stateCode = url.searchParams.get('stateCode') || '';
  const cityName = url.searchParams.get('cityName') || '';
  const limit = Number(url.searchParams.get('limit') || '10');
  const postcodes = await searchMalaysiaPostcodes({ query, stateCode, cityName, limit });
  return NextResponse.json({ postcodes }, { headers: CACHE_HEADERS });
}