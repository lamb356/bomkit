import { NextResponse } from 'next/server';

import { searchParts } from '@/lib/jlc/jlcsearch-client';

export async function POST(request: Request) {
  const body = await request.json();
  const lcsc = body.lcscPart || body.query;
  if (!lcsc) return NextResponse.json({ error: 'lcscPart or query is required' }, { status: 400 });
  const results = await searchParts(lcsc, body.packageFilter);
  return NextResponse.json({ checkedAt: new Date().toISOString(), results });
}
