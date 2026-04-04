import Link from 'next/link';
import { GitBranch, History, LockKeyhole, ShieldCheck } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions, buildSignInHref, normalizeCallbackUrl } from '@/lib/auth';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function errorCopy(error?: string): string | null {
  if (!error) return null;

  switch (error) {
    case 'OAuthSignin':
    case 'OAuthCallback':
      return 'GitHub sign-in did not complete. Please try again.';
    case 'AccessDenied':
      return 'GitHub sign-in was denied before BOMKit Dashboard could finish authentication.';
    case 'Configuration':
      return 'Authentication is temporarily unavailable. Check the GitHub OAuth configuration.';
    default:
      return 'We could not complete sign-in. Please try again.';
  }
}

const trustSignals = [
  {
    title: 'GitHub-secured login',
    body: 'Use your existing GitHub identity instead of managing another password.',
    icon: ShieldCheck,
  },
  {
    title: 'Private project workspace',
    body: 'Projects, sourcing choices, and revision history stay scoped to your account.',
    icon: LockKeyhole,
  },
  {
    title: 'Persistent BOM memory',
    body: 'Keep cleanup decisions, locked alternates, and JLC fee context across revisions.',
    icon: History,
  },
];

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const callbackUrl = normalizeCallbackUrl(firstValue(params.callbackUrl));
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect(callbackUrl);
  }

  const signInHref = `/api/auth/signin/github?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const errorMessage = errorCopy(firstValue(params.error));

  return (
    <main className="min-h-screen px-6 py-12 text-zinc-100">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="space-y-8">
          <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
            Secure sign-in for persistent BOM intelligence
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
              Sign in to the BOM workspace your team can trust between revisions.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-zinc-400">
              BOMKit Dashboard preserves sourcing decisions, revision diffs, and JLC fee visibility so your cleanup work compounds instead of resetting every time the BOM changes.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {trustSignals.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[26px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(2,6,23,0.32)] backdrop-blur-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/6 p-7 shadow-[0_30px_120px_rgba(2,6,23,0.45)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-sm font-semibold text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.14)]">BK</span>
            <div>
              <p className="text-sm font-semibold text-white">BOMKit Dashboard</p>
              <p className="text-sm text-zinc-500">Persistent BOM intelligence for KiCad teams</p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white">Welcome back</h2>
            <p className="text-sm leading-6 text-zinc-400">
              Continue with GitHub to access your projects, locked sourcing choices, and export entitlements.
            </p>
          </div>

          {errorMessage && (
            <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </div>
          )}

          <a
            href={signInHref}
            className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-base font-semibold text-[#0a0d14] shadow-[0_24px_80px_rgba(255,255,255,0.14)] hover:bg-cyan-100"
          >
            <GitBranch className="h-5 w-5" />
            Continue with GitHub
          </a>

          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0f1421] px-4 py-4 text-sm text-zinc-400">
            <p className="font-medium text-zinc-200">Why GitHub only?</p>
            <p className="mt-2 leading-6">
              BOMKit Dashboard is built for engineering teams. GitHub sign-in keeps access simple, familiar, and auditable without introducing a separate password surface.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
            <span>No password to create. No local credentials to rotate.</span>
            <Link href={buildSignInHref('/dashboard')} className="text-zinc-300 hover:text-white">
              Go to dashboard after sign-in →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
