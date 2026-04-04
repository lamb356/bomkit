import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db/client';
import { jlcPartsCache } from '@/lib/db/schema';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lcsc = searchParams.get('lcsc');
  if (!lcsc) return NextResponse.json({ error: 'lcsc is required' }, { status: 400 });
  const part = await db.query.jlcPartsCache.findFirst({ where: eq(jlcPartsCache.lcscPart, lcsc) });
  return NextResponse.json({ lcsc, tier: part?.classification ?? 'not_found', part });
}
