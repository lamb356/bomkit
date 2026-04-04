import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BillingActions } from '@/components/BillingActions';
import { buildSignInHref, getCurrentUser } from '@/lib/auth';
import { getCurrentBillingState, getPriceIdForTier } from '@/lib/billing';
import { getOwnedProject } from '@/lib/bom/import';

export default async function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(buildSignInHref(`/dashboard/${projectId}/settings`));
  }

  const project = await getOwnedProject(currentUser.id, Number(projectId));
  if (!project) {
    redirect('/dashboard');
  }

  const { user, tier } = await getCurrentBillingState();

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-950">Project settings</h1>
              <p className="mt-2 text-sm text-zinc-600">Project {project.name}. Billing, plan management, and export entitlements live here.</p>
            </div>
            <Link href={`/dashboard/${project.id}`} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700">Back to project</Link>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Current plan</h2>
          <p className="mt-2 text-sm text-zinc-600">User: {user.email}</p>
          <div className="mt-3 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">{tier.toUpperCase()}</div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              { tier: 'free', title: 'Free', price: '$0', bullets: ['1 project', 'Up to 50 rows', 'No exports'] },
              { tier: 'solo', title: 'Solo', price: '$15/mo', bullets: ['Unlimited projects', 'CSV exports', 'Persistent locked choices'] },
              { tier: 'pro', title: 'Pro', price: '$29/mo', bullets: ['Everything in Solo', 'Share links (roadmap)', 'Priority support'] },
            ].map((plan) => (
              <div key={plan.tier} className={`rounded-2xl border p-4 ${tier === plan.tier ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-900'}`}>
                <div className="text-sm font-medium">{plan.title}</div>
                <div className="mt-1 text-2xl font-semibold">{plan.price}</div>
                <ul className="mt-3 space-y-1 text-sm opacity-90">
                  {plan.bullets.map((bullet) => <li key={bullet}>• {bullet}</li>)}
                </ul>
                {plan.tier !== 'free' && tier !== plan.tier && getPriceIdForTier(plan.tier as 'solo' | 'pro') && (
                  <div className="mt-4 text-xs opacity-80">Ready for Stripe checkout.</div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6">
            <BillingActions canManagePortal={tier !== 'free'} />
          </div>
          <div className="mt-6 space-y-2 text-sm text-zinc-600">
            <p>Checkout route: <code className="rounded bg-zinc-100 px-1 py-0.5">POST /api/stripe/checkout</code></p>
            <p>Portal route: <code className="rounded bg-zinc-100 px-1 py-0.5">POST /api/stripe/portal</code></p>
            <p className="text-xs text-zinc-500">Stripe webhook support is implemented at <code className="rounded bg-zinc-100 px-1 py-0.5">/api/stripe/webhook</code>.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
