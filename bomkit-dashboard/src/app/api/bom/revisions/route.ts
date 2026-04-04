import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { AuthRequiredError } from '@/lib/auth';
import { getCurrentBillingState } from '@/lib/billing';
import { getOwnedProject } from '@/lib/bom/import';
import { db } from '@/lib/db/client';
import { bomRevisions } from '@/lib/db/schema';

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentBillingState();
    const { searchParams } = new URL(request.url);
    const projectId = Number(searchParams.get('projectId'));
    if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });

    const project = await getOwnedProject(user.id, projectId);
    if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 });

    const revisions = await db.select().from(bomRevisions).where(eq(bomRevisions.projectId, projectId)).orderBy(desc(bomRevisions.version));
    return NextResponse.json({ revisions });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load revisions' }, { status: 500 });
  }
}
