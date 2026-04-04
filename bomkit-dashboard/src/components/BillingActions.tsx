"use client";

import { useState } from 'react';

export function BillingActions({ canManagePortal = true }: { canManagePortal?: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openEndpoint(endpoint: string, body?: Record<string, unknown>) {
    setLoading(endpoint);
    setError(null);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json();
    setLoading(null);
    if (!response.ok) {
      setError(payload.error || 'Request failed');
      return;
    }
    if (payload.url) {
      window.location.href = payload.url;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => openEndpoint('/api/stripe/checkout', { tier: 'solo' })} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          {loading === '/api/stripe/checkout' ? 'Opening…' : 'Upgrade to Solo'}
        </button>
        <button onClick={() => openEndpoint('/api/stripe/checkout', { tier: 'pro' })} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700">
          {loading === '/api/stripe/checkout' ? 'Opening…' : 'Upgrade to Pro'}
        </button>
        {canManagePortal && (
          <button onClick={() => openEndpoint('/api/stripe/portal')} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700">
            {loading === '/api/stripe/portal' ? 'Opening…' : 'Manage billing portal'}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
