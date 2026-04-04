import Link from 'next/link';
import { ImportDialog } from '@/components/ImportDialog';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">Persistent BOM workspace + JLC fee intelligence</div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">Octopart for KiCad with memory and JLC fee math.</h1>
              <p className="max-w-2xl text-lg leading-8 text-zinc-600">Upload a BOMKit Fab export or a KiCad Symbol Fields CSV, keep your cleanup decisions across revisions, and see JLC Basic/Extended fee impact without redoing the same work every revision.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/dashboard" className="rounded-xl bg-zinc-900 px-4 py-2 font-medium text-white">Open dashboard</Link>
              <a href="/api/auth/signin" className="rounded-xl border border-zinc-300 px-4 py-2 font-medium text-zinc-700">Sign in with GitHub</a>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                'Saved row cleanup decisions',
                'Locked sourcing choices across revisions',
                'JLC loading fee visibility before order time',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm">{item}</div>
              ))}
            </div>
          </div>
          <ImportDialog />
        </section>
      </div>
    </main>
  );
}
