import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { AuthRequiredError } from '@/lib/auth';
import { getCurrentBillingState } from '@/lib/billing';
import { db } from '@/lib/db/client';
import { bomRevisions, bomRows, lockedChoices, localOffers, projects } from '@/lib/db/schema';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getCurrentBillingState();
    const { id } = await params;
    const projectId = Number(id);
    const body = await request.json();
    const rowId = Number(body.rowId);

    if (!projectId || !rowId) {
      return NextResponse.json({ error: 'project id and rowId are required' }, { status: 400 });
    }

    const existing = await db.select({ row: bomRows, revision: bomRevisions, project: projects })
      .from(bomRows)
      .innerJoin(bomRevisions, eq(bomRows.revisionId, bomRevisions.id))
      .innerJoin(projects, eq(bomRevisions.projectId, projects.id))
      .where(and(eq(bomRows.id, rowId), eq(projects.id, projectId), eq(projects.userId, user.id)));

    const existingRow = existing[0]?.row;
    if (!existingRow) {
      return NextResponse.json({ error: 'row not found' }, { status: 404 });
    }

    const updates = body.updates || {};
    const rowPatch: Partial<typeof bomRows.$inferInsert> = {};

    if ('mpn' in updates) rowPatch.mpn = updates.mpn;
    if ('lcscPart' in updates) rowPatch.lcscPart = updates.lcscPart;
    if ('userNotes' in updates) rowPatch.userNotes = updates.userNotes;
    if ('status' in updates) rowPatch.status = updates.status;
    if ('jlcTier' in updates) rowPatch.jlcTier = updates.jlcTier;
    if (Object.keys(rowPatch).length > 0) rowPatch.lastRefreshedAt = new Date();

    const [row] = Object.keys(rowPatch).length > 0
      ? await db.update(bomRows).set(rowPatch).where(eq(bomRows.id, rowId)).returning()
      : [existingRow];

    if (body.unlockChoice) {
      await db.delete(lockedChoices).where(eq(lockedChoices.rowId, rowId));
    }

    if (body.lockedChoice) {
      await db.delete(lockedChoices).where(eq(lockedChoices.rowId, rowId));
      await db.insert(lockedChoices).values({
        rowId,
        source: body.lockedChoice.source,
        sku: body.lockedChoice.sku ?? null,
        unitPrice: body.lockedChoice.unitPrice != null ? String(body.lockedChoice.unitPrice) : null,
        currency: body.lockedChoice.currency ?? 'USD',
        notes: body.lockedChoice.notes ?? null,
      });
    }

    if (body.localOffer) {
      await db.insert(localOffers).values({
        rowId,
        source: body.localOffer.source,
        unitPrice: String(body.localOffer.unitPrice ?? 0),
        currency: body.localOffer.currency ?? 'USD',
        moq: body.localOffer.moq ?? null,
        leadTimeDays: body.localOffer.leadTimeDays ?? null,
        notes: body.localOffer.notes ?? null,
      });
    }

    return NextResponse.json({ row });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Row update failed' }, { status: 500 });
  }
}
