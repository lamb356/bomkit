import { NextResponse } from 'next/server';

import { AuthRequiredError } from '@/lib/auth';
import { getCurrentBillingState } from '@/lib/billing';
import { searchParts } from '@/lib/jlc/jlcsearch-client';

export async function GET(request: Request) {
  try {
    await getCurrentBillingState();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const packageFilter = searchParams.get('package') ?? undefined;
    if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 });
    const results = await searchParts(query, packageFilter);
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Lookup failed' }, { status: 500 });
  }
}
