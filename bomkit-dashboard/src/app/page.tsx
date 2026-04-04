import Link from 'next/link';
import { BarChart3, DatabaseZap, PackageCheck } from 'lucide-react';

import { ImportDialog } from '@/components/ImportDialog';

const valueProps = [
  {
    title: 'Keep cleanup decisions across revisions',
    body: 'Turn one-time BOM cleanup into project memory instead of redoing the same resolution work on every revision.',
    icon: DatabaseZap,
  },
  {
    title: 'See JLC fee impact immediately',
    body: 'Surface Basic, Preferred Extended, Extended, and not-found tiers directly in the workspace before ordering time.',
    icon: BarChart3,
  },
  {
    title: 'Lock sourcing choices with context',
    body: 'Capture notes, local offers, and chosen parts so engineering and purchasing stay aligned as the BOM evolves.',
    icon: PackageCheck,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-12 text-zinc-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-12">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-8">
            <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
              Persistent BOM workspace + JLC fee intelligence
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
                The KiCad BOM workspace that remembers what your team already figured out.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-zinc-400">
                BOMKit Dashboard turns BOMKit Fab exports and KiCad CSVs into a revision-aware engineering workspace with locked sourcing decisions, local offers, and JLC loading-fee visibility.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/dashboard" className="rounded-2xl bg-white px-5 py-3 font-semibold text-[#0a0d14] shadow-[0_24px_80px_rgba(255,255,255,0.14)] hover:bg-cyan-100">
                Open dashboard
              </Link>
              <a href="/api/auth/signin" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-medium text-zinc-200 hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white">
                Sign in with GitHub
              </a>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {valueProps.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(2,6,23,0.35)] backdrop-blur-sm">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-white">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <ImportDialog />
        </section>
      </div>
    </main>
  );
}
