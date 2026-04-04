import { eq, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db/client';
import { bomRevisions } from '@/lib/db/schema';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = Number(searchParams.get('projectId'));
  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  const revisions = await db.select().from(bomRevisions).where(eq(bomRevisions.projectId, projectId)).orderBy(desc(bomRevisions.version));
  return NextResponse.json({ revisions });
}
