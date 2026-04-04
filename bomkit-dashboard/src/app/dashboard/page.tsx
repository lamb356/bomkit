import Link from 'next/link';
import { eq } from 'drizzle-orm';

import { ProjectCard } from '@/components/ProjectCard';
import { getCurrentBillingState } from '@/lib/billing';
import { db } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';

function tierCopy(tier: string): string {
  if (tier === 'pro') return 'Pro · unlimited projects, exports, and upcoming share links';
  if (tier === 'solo') return 'Solo · unlimited projects and CSV exports enabled';
  return 'Free · 1 project, 50 rows, no exports';
}

export default async function DashboardProjectsPage({ searchParams }: { searchParams?: Promise<{ checkout?: string }> }) {
  const { user, tier } = await getCurrentBillingState();
  const items = await db.select().from(projects).where(eq(projects.userId, user.id));
  const params = (await searchParams) ?? {};

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-950">BOMKit Dashboard</h1>
            <p className="mt-2 text-zinc-600">Your saved BOM workspace with JLC fee intelligence and revision memory.</p>
            <p className="mt-3 text-sm text-zinc-500">Signed in as {user.email}</p>
            <div className="mt-3 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">{tierCopy(tier)}</div>
            {params.checkout === 'success' && <p className="mt-3 text-sm text-emerald-600">Checkout completed. Stripe will update your plan as soon as the webhook is configured.</p>}
            {params.checkout === 'cancelled' && <p className="mt-3 text-sm text-amber-600">Checkout cancelled.</p>}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/" className="rounded-xl border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-700">Import another BOM</Link>
            <form action="/dashboard/1/settings" className="contents">
              <Link href={items[0] ? `/dashboard/${items[0].id}/settings` : '/dashboard'} className="rounded-xl bg-zinc-900 px-4 py-2 font-medium text-white">Billing & settings</Link>
            </form>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((project) => <ProjectCard key={project.id} project={project} />)}
          {items.length === 0 && <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">No projects yet. Import a CSV from the home page to create one.</div>}
        </div>
      </div>
    </main>
  );
}
