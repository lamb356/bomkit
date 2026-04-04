import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { AuthRequiredError } from '@/lib/auth';
import { getCurrentBillingState, projectLimitForTier } from '@/lib/billing';
import { createProjectForUser, ProjectLimitError } from '@/lib/bom/import';
import { db } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';

export async function GET() {
  try {
    const { user } = await getCurrentBillingState();
    const items = await db.select().from(projects).where(eq(projects.userId, user.id));
    return NextResponse.json({ projects: items, billingTier: user.billingTier });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, tier } = await getCurrentBillingState();
    const projectLimit = projectLimitForTier(tier);

    const body = await request.json();
    const project = await createProjectForUser({
      userId: user.id,
      projectName: body.name || 'Untitled Project',
      maxProjects: projectLimit,
    });
    return NextResponse.json({ project, billingTier: tier });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ProjectLimitError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create project' }, { status: 500 });
  }
}
