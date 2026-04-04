import { NextResponse } from 'next/server';

import { searchParts } from '@/lib/jlc/jlcsearch-client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const packageFilter = searchParams.get('package') ?? undefined;
  if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 });
  const results = await searchParts(query, packageFilter);
  return NextResponse.json({ results });
}
