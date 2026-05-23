import { NextResponse } from 'next/server';
import { listMalaysiaStates } from '@/lib/malaysia-locations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
};

export async function GET() {
  const states = await listMalaysiaStates();
  return NextResponse.json({ states }, { headers: CACHE_HEADERS });
}