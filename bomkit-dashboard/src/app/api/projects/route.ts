import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';
import { getCurrentBillingState, projectLimitForTier } from '@/lib/billing';

export async function GET() {
  const { user } = await getCurrentBillingState();
  const items = await db.select().from(projects).where(eq(projects.userId, user.id));
  return NextResponse.json({ projects: items, billingTier: user.billingTier });
}

export async function POST(request: Request) {
  const { user, tier } = await getCurrentBillingState();
  const existing = await db.select().from(projects).where(eq(projects.userId, user.id));
  const projectLimit = projectLimitForTier(tier);
  if (projectLimit != null && existing.length >= projectLimit) {
    return NextResponse.json({ error: `Free tier is limited to ${projectLimit} project. Upgrade to Solo for unlimited projects.` }, { status: 403 });
  }

  const body = await request.json();
  const [project] = await db.insert(projects).values({ userId: user.id, name: body.name || 'Untitled Project' }).returning();
  return NextResponse.json({ project, billingTier: tier });
}
