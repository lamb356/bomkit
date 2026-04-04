import { NextResponse } from 'next/server';

import { AuthRequiredError } from '@/lib/auth';
import { getCurrentBillingState } from '@/lib/billing';
import { getOwnedProjectSnapshot } from '@/lib/bom/import';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getCurrentBillingState();
    const { id } = await params;
    const snapshot = await getOwnedProjectSnapshot(user.id, Number(id));
    if (!snapshot) {
      return NextResponse.json({ error: 'project not found' }, { status: 404 });
    }
    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load project' }, { status: 500 });
  }
}
