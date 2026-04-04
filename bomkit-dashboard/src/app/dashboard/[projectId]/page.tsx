import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BOMSummary } from '@/components/BOMSummary';
import { BOMTable } from '@/components/BOMTable';
import { RevisionDiff } from '@/components/RevisionDiff';
import { getProjectSnapshot } from '@/lib/bom/import';

function exportHref(projectId: number, mode: 'full' | 'jlc') {
  return `/api/bom/${projectId}/export?mode=${mode}`;
}

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const snapshot = await getProjectSnapshot(Number(projectId));
  if (!snapshot || !snapshot.latestRevision) notFound();

  const rows = snapshot.rows.map((row) => ({
    ...row,
    designators: row.designators as string[],
    jlcLoadingFee: Number(row.jlcLoadingFee),
    offers: row.offers.map((offer) => ({ ...offer, unitPrice: Number(offer.unitPrice) })),
    lockedChoice: row.lockedChoice ? { ...row.lockedChoice, unitPrice: row.lockedChoice.unitPrice ? Number(row.lockedChoice.unitPrice) : null } : null,
  }));

  const resolvedCount = rows.filter((row) => row.status === 'resolved').length;
  const unresolvedCount = rows.filter((row) => row.status === 'unresolved').length;
  const dnpCount = rows.filter((row) => row.status === 'dnp').length;
  const basicCount = rows.filter((row) => row.jlcTier === 'basic').length;
  const notFoundCount = rows.filter((row) => row.jlcTier === 'not_found').length;
  const feeTotal = rows.reduce((sum, row) => sum + Number(row.jlcLoadingFee || 0), 0);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm text-zinc-500">Project workspace</div>
            <h1 className="text-3xl font-semibold text-zinc-950">{snapshot.project.name}</h1>
            <p className="mt-1 text-zinc-600">Revision {snapshot.latestRevision.version} · Imported from {snapshot.latestRevision.sourceFilename}</p>
            {snapshot.previousRevision && <p className="mt-1 text-sm text-zinc-500">Compared against revision {snapshot.previousRevision.version}</p>}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/dashboard" className="rounded-xl border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-700">All projects</Link>
            <a href={exportHref(snapshot.project.id, 'full')} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-700">Export full CSV</a>
            <a href={exportHref(snapshot.project.id, 'jlc')} className="rounded-xl bg-zinc-900 px-4 py-2 font-medium text-white">Export JLC CSV</a>
          </div>
        </div>
        <BOMSummary
          projectName={snapshot.project.name}
          revisionLabel={`Rev ${snapshot.latestRevision.version}`}
          totalRows={rows.length}
          resolvedCount={resolvedCount}
          unresolvedCount={unresolvedCount}
          dnpCount={dnpCount}
          jlcFeeTotal={feeTotal}
          basicCount={basicCount}
          notFoundCount={notFoundCount}
        />
        <RevisionDiff added={snapshot.diff.added} removed={snapshot.diff.removed} changed={snapshot.diff.changed} items={snapshot.diff.items} />
        <BOMTable projectId={snapshot.project.id} initialRows={rows} />
      </div>
    </main>
  );
}
