"use client";

import { useState } from 'react';

export function LocalOfferForm({ rowId, onSaved }: { rowId: number; onSaved?: () => void }) {
  const [source, setSource] = useState('Manual quote');
  const [unitPrice, setUnitPrice] = useState('');

  async function save() {
    await fetch(`/api/bom/0/rows`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowId, localOffer: { source, unitPrice: Number(unitPrice || 0), currency: 'USD' } }),
    });
    onSaved?.();
  }

  return (
    <div className="rounded-2xl border border-zinc-200 p-4">
      <div className="mb-2 text-sm font-medium text-zinc-900">Add local offer</div>
      <div className="flex gap-2">
        <input value={source} onChange={(e) => setSource(e.target.value)} className="rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
        <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="rounded-xl border border-zinc-300 px-3 py-2 text-sm" placeholder="Unit price" />
        <button onClick={save} className="rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white">Save</button>
      </div>
    </div>
  );
}
