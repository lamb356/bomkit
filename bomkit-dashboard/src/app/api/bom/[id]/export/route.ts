import { NextResponse } from 'next/server';

import { AuthRequiredError } from '@/lib/auth';
import { canExportForTier, getCurrentBillingState } from '@/lib/billing';
import { exportRowsCsv, exportRowsJlcBom } from '@/lib/bom/export';
import { getOwnedProjectSnapshot } from '@/lib/bom/import';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, tier } = await getCurrentBillingState();
    if (!canExportForTier(tier)) {
      return NextResponse.json({ error: 'CSV export requires Solo tier or higher' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') === 'jlc' ? 'jlc' : 'full';
    const snapshot = await getOwnedProjectSnapshot(user.id, Number(id));

    if (!snapshot || !snapshot.latestRevision) {
      return NextResponse.json({ error: 'project not found' }, { status: 404 });
    }

    const exportableRows = snapshot.rows.map((row) => ({
      designators: row.designators as string[],
      quantity: row.quantity,
      value: row.value,
      footprint: row.footprint,
      mpn: row.mpn,
      manufacturer: row.manufacturer,
      lcscPart: row.lcscPart,
      status: row.status,
      jlcTier: row.jlcTier,
      jlcLoadingFee: Number(row.jlcLoadingFee),
      userNotes: row.userNotes,
    }));

    const csv = mode === 'jlc' ? exportRowsJlcBom(exportableRows) : exportRowsCsv(exportableRows);
    const filename = `${snapshot.project.name.replace(/[^a-z0-9-_]+/gi, '_')}_${mode === 'jlc' ? 'jlcpcb' : 'dashboard'}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Export failed' }, { status: 500 });
  }
}
