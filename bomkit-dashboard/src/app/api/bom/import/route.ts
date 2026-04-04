import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { AuthRequiredError } from '@/lib/auth';
import { getCurrentBillingState, projectLimitForTier, rowLimitForTier } from '@/lib/billing';
import { getOwnedProject, importBomCsv, parseInputCsv } from '@/lib/bom/import';
import { db } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';

export async function POST(request: Request) {
  try {
    const { user, tier } = await getCurrentBillingState();
    const formData = await request.formData();
    const file = formData.get('file');
    const projectName = String(formData.get('projectName') || 'Untitled Project');
    const existingProjectId = formData.get('projectId');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const input = await file.text();
    const parsedRows = await parseInputCsv(input);
    const maxRows = rowLimitForTier(tier);
    if (maxRows != null && parsedRows.length > maxRows) {
      return NextResponse.json({ error: `Free tier supports up to ${maxRows} BOM rows. Upgrade to Solo for larger imports.` }, { status: 403 });
    }

    if (existingProjectId) {
      const ownedProject = await getOwnedProject(user.id, Number(existingProjectId));
      if (!ownedProject) {
        return NextResponse.json({ error: 'project not found' }, { status: 404 });
      }
    } else {
      const existingProjects = await db.select().from(projects).where(eq(projects.userId, user.id));
      const projectLimit = projectLimitForTier(tier);
      if (projectLimit != null && existingProjects.length >= projectLimit) {
        return NextResponse.json({ error: `Free tier is limited to ${projectLimit} project. Upgrade to Solo for unlimited projects.` }, { status: 403 });
      }
    }

    const result = await importBomCsv({
      userId: user.id,
      projectName,
      input,
      filename: file.name,
      existingProjectId: existingProjectId ? Number(existingProjectId) : undefined,
    });

    return NextResponse.json({ ...result, billingTier: tier });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Import failed' }, { status: 500 });
  }
}
