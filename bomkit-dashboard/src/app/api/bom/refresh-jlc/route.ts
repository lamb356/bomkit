import { NextResponse } from 'next/server';

import { AuthRequiredError } from '@/lib/auth';
import { getCurrentBillingState } from '@/lib/billing';
import { searchParts } from '@/lib/jlc/jlcsearch-client';

export async function POST(request: Request) {
  try {
    await getCurrentBillingState();
    const body = await request.json();
    const lcsc = body.lcscPart || body.query;
    if (!lcsc) return NextResponse.json({ error: 'lcscPart or query is required' }, { status: 400 });
    const results = await searchParts(lcsc, body.packageFilter);
    return NextResponse.json({ checkedAt: new Date().toISOString(), results });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Refresh failed' }, { status: 500 });
  }
}
