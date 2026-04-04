import { NextResponse } from 'next/server';

import { getProjectSnapshot } from '@/lib/bom/import';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = await getProjectSnapshot(Number(id));
  if (!snapshot) {
    return NextResponse.json({ error: 'project not found' }, { status: 404 });
  }
  return NextResponse.json(snapshot);
}
