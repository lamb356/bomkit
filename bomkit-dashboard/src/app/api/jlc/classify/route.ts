import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { AuthRequiredError } from '@/lib/auth';
import { getCurrentBillingState } from '@/lib/billing';
import { db } from '@/lib/db/client';
import { jlcPartsCache } from '@/lib/db/schema';

export async function GET(request: Request) {
  try {
    await getCurrentBillingState();
    const { searchParams } = new URL(request.url);
    const lcsc = searchParams.get('lcsc');
    if (!lcsc) return NextResponse.json({ error: 'lcsc is required' }, { status: 400 });
    const part = await db.query.jlcPartsCache.findFirst({ where: eq(jlcPartsCache.lcscPart, lcsc) });
    return NextResponse.json({ lcsc, tier: part?.classification ?? 'not_found', part });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to classify part' }, { status: 500 });
  }
}
