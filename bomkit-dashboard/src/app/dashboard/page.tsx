import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { ProjectCard } from '@/components/ProjectCard';
import { buildSignInHref, getCurrentUser } from '@/lib/auth';
import { getCurrentBillingState } from '@/lib/billing';
import { getOwnedProjectSnapshot } from '@/lib/bom/import';
import { db } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';

function tierCopy(tier: string): string {
  if (tier === 'pro') return 'Pro · unlimited projects, exports, and upcoming share links';
  if (tier === 'solo') return 'Solo · unlimited projects and CSV exports enabled';
  return 'Free · 1 project, 50 rows, no exports';
}

export default async function DashboardProjectsPage({ searchParams }: { searchParams?: Promise<{ checkout?: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(buildSignInHref('/dashboard'));
  }

  const { user, tier } = await getCurrentBillingState();
  const items = await db.select().from(projects).where(eq(projects.userId, user.id));
  const params = (await searchParams) ?? {};

  const enriched = await Promise.all(items.map(async (project) => {
    const snapshot = await getOwnedProjectSnapshot(user.id, project.id);
    const rows = snapshot?.rows ?? [];
    return {
      ...project,
      summary: {
        partCount: rows.length,
        unresolvedCount: rows.filter((row) => row.status === 'unresolved').length,
        feeTotal: rows.reduce((sum, row) => sum + Number(row.jlcLoadingFee || 0), 0),
      },
    };
  }));

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_rgba(2,6,23,0.38)] backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">Project index</div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">BOMKit Dashboard</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">A revision-aware engineering workspace for KiCad BOMs, sourcing choices, and JLC loading-fee visibility.</p>
              <p className="mt-3 text-sm text-zinc-500">Signed in as {user.email}</p>
              <div className="mt-4 inline-flex rounded-full border border-white/10 bg-[#0f1421] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">{tierCopy(tier)}</div>
              {params.checkout === 'success' && <p className="mt-3 text-sm text-emerald-300">Checkout completed. Stripe will update your plan as soon as the webhook is configured.</p>}
              {params.checkout === 'cancelled' && <p className="mt-3 text-sm text-amber-300">Checkout cancelled.</p>}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/" className="rounded-2xl bg-white px-5 py-3 font-semibold text-[#0a0d14] hover:bg-cyan-100">Import another BOM</Link>
              <Link href={enriched[0] ? `/dashboard/${enriched[0].id}/settings` : '/dashboard'} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-medium text-zinc-200 hover:border-cyan-400/35 hover:bg-cyan-400/10 hover:text-white">Billing & settings</Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {enriched.map((project) => <ProjectCard key={project.id} project={project} />)}
          {enriched.length === 0 && (
            <div className="rounded-[28px] border border-dashed border-white/15 bg-white/5 p-8 text-sm text-zinc-400 backdrop-blur-sm">
              <div className="text-lg font-semibold text-white">No projects yet</div>
              <p className="mt-2 max-w-sm leading-6">Import a BOMKit Fab export or KiCad CSV from the landing page to create your first persistent workspace.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
