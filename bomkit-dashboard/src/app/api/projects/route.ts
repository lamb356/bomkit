import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { AuthRequiredError } from '@/lib/auth';
import { getCurrentBillingState, projectLimitForTier } from '@/lib/billing';
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
    const existing = await db.select().from(projects).where(eq(projects.userId, user.id));
    const projectLimit = projectLimitForTier(tier);
    if (projectLimit != null && existing.length >= projectLimit) {
      return NextResponse.json({ error: `Free tier is limited to ${projectLimit} project. Upgrade to Solo for unlimited projects.` }, { status: 403 });
    }

    const body = await request.json();
    const [project] = await db.insert(projects).values({ userId: user.id, name: body.name || 'Untitled Project' }).returning();
    return NextResponse.json({ project, billingTier: tier });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create project' }, { status: 500 });
  }
}
