"use client";

import { Fragment, useMemo, useState } from 'react';

import { JLCBadge } from './JLCBadge';

export interface DashboardOffer {
  id?: number;
  source: string;
  unitPrice: string | number;
  currency: string;
  moq?: number | null;
  leadTimeDays?: number | null;
  notes?: string | null;
}

export interface DashboardLock {
  source: string;
  sku?: string | null;
  unitPrice?: string | number | null;
  currency?: string;
  notes?: string | null;
}

export interface DashboardRow {
  id: number;
  designators: string[];
  quantity: number;
  value: string;
  footprint: string;
  mpn: string | null;
  manufacturer: string | null;
  lcscPart: string | null;
  status: string;
  jlcTier: string;
  jlcLoadingFee: string | number;
  userNotes: string | null;
  offers?: DashboardOffer[];
  lockedChoice?: DashboardLock | null;
}

function matchesQuery(row: DashboardRow, query: string): boolean {
  if (!query) return true;
  const haystack = [
    row.designators.join(','),
    row.value,
    row.footprint,
    row.mpn ?? '',
    row.lcscPart ?? '',
    row.userNotes ?? '',
  ].join(' ').toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function BOMTable({ projectId, initialRows }: { projectId: number; initialRows: DashboardRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortKey, setSortKey] = useState<'value' | 'footprint' | 'status' | 'quantity'>('value');
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { mpn: string; lcscPart: string; userNotes: string }>>(() => Object.fromEntries(initialRows.map((row) => [row.id, {
    mpn: row.mpn ?? '',
    lcscPart: row.lcscPart ?? '',
    userNotes: row.userNotes ?? '',
  }] )));
  const [offerDrafts, setOfferDrafts] = useState<Record<number, { source: string; unitPrice: string; currency: string; moq: string; leadTimeDays: string; notes: string }>>({});

  const filtered = useMemo(() => {
    return [...rows]
      .filter((row) => matchesQuery(row, query))
      .filter((row) => statusFilter === 'all' || row.status === statusFilter)
      .filter((row) => tierFilter === 'all' || row.jlcTier === tierFilter)
      .sort((a, b) => String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? '')));
  }, [rows, query, statusFilter, tierFilter, sortKey]);

  async function patchRow(rowId: number, body: Record<string, unknown>) {
    setSavingRowId(rowId);
    const response = await fetch(`/api/bom/${projectId}/rows`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowId, ...body }),
    });
    const payload = await response.json();
    setSavingRowId(null);
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to update row');
    }
    return payload;
  }

  async function saveDraft(row: DashboardRow) {
    const draft = drafts[row.id];
    await patchRow(row.id, { updates: { mpn: draft.mpn || null, lcscPart: draft.lcscPart || null, userNotes: draft.userNotes || null } });
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, mpn: draft.mpn || null, lcscPart: draft.lcscPart || null, userNotes: draft.userNotes || null } : item));
  }

  async function lockRow(row: DashboardRow) {
    const draft = drafts[row.id];
    await patchRow(row.id, {
      lockedChoice: {
        source: 'Locked from dashboard',
        sku: draft.lcscPart || row.lcscPart,
        unitPrice: row.offers?.[0]?.unitPrice ?? null,
        currency: row.offers?.[0]?.currency ?? 'USD',
        notes: draft.userNotes || row.userNotes,
      },
    });
    setRows((current) => current.map((item) => item.id === row.id ? {
      ...item,
      lockedChoice: {
        source: 'Locked from dashboard',
        sku: draft.lcscPart || row.lcscPart,
        unitPrice: row.offers?.[0]?.unitPrice ?? null,
        currency: row.offers?.[0]?.currency ?? 'USD',
        notes: draft.userNotes || row.userNotes,
      },
    } : item));
  }

  async function unlockRow(rowId: number) {
    await patchRow(rowId, { unlockChoice: true });
    setRows((current) => current.map((item) => item.id === rowId ? { ...item, lockedChoice: null } : item));
  }

  async function saveOffer(row: DashboardRow) {
    const draft = offerDrafts[row.id] ?? { source: 'Manual quote', unitPrice: '', currency: 'USD', moq: '', leadTimeDays: '', notes: '' };
    await patchRow(row.id, {
      localOffer: {
        source: draft.source,
        unitPrice: Number(draft.unitPrice || 0),
        currency: draft.currency || 'USD',
        moq: draft.moq ? Number(draft.moq) : null,
        leadTimeDays: draft.leadTimeDays ? Number(draft.leadTimeDays) : null,
        notes: draft.notes || null,
      },
    });
    setRows((current) => current.map((item) => item.id === row.id ? {
      ...item,
      offers: [...(item.offers ?? []), {
        source: draft.source,
        unitPrice: draft.unitPrice,
        currency: draft.currency || 'USD',
        moq: draft.moq ? Number(draft.moq) : null,
        leadTimeDays: draft.leadTimeDays ? Number(draft.leadTimeDays) : null,
        notes: draft.notes || null,
      }],
    } : item));
    setOfferDrafts((current) => ({
      ...current,
      [row.id]: { source: 'Manual quote', unitPrice: '', currency: 'USD', moq: '', leadTimeDays: '', notes: '' },
    }));
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 md:flex-row md:items-center">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search rows" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
        <div className="flex gap-2 text-sm">
          {['all', 'resolved', 'unresolved', 'dnp'].map((value) => (
            <button key={value} onClick={() => setStatusFilter(value)} className={`rounded-full px-3 py-1 ${statusFilter === value ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}>{value}</button>
          ))}
        </div>
        <div className="flex gap-2 text-sm">
          {['all', 'basic', 'preferred_extended', 'extended', 'not_found', 'unknown'].map((value) => (
            <button key={value} onClick={() => setTierFilter(value)} className={`rounded-full px-3 py-1 ${tierFilter === value ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-700'}`}>{value}</button>
          ))}
        </div>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as 'value' | 'footprint' | 'status' | 'quantity')} className="rounded-xl border border-zinc-300 px-3 py-2 text-sm">
          <option value="value">Sort by value</option>
          <option value="footprint">Sort by footprint</option>
          <option value="status">Sort by status</option>
          <option value="quantity">Sort by quantity</option>
        </select>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="sticky top-0 bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Footprint</th>
              <th className="px-4 py-3">MPN</th>
              <th className="px-4 py-3">LCSC#</th>
              <th className="px-4 py-3">JLC Tier</th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((row) => {
              const draft = drafts[row.id] ?? { mpn: row.mpn ?? '', lcscPart: row.lcscPart ?? '', userNotes: row.userNotes ?? '' };
              const offerDraft = offerDrafts[row.id] ?? { source: 'Manual quote', unitPrice: '', currency: 'USD', moq: '', leadTimeDays: '', notes: '' };
              const expanded = expandedRowId === row.id;
              return (
                <Fragment key={row.id}>
                  <tr className="align-top">
                    <td className="px-4 py-3 font-mono text-xs">{row.designators.join(', ')}</td>
                    <td className="px-4 py-3">{row.quantity}</td>
                    <td className="px-4 py-3">{row.value}</td>
                    <td className="px-4 py-3">{row.footprint}</td>
                    <td className="px-4 py-3">
                      <input value={draft.mpn} onChange={(e) => setDrafts((current) => ({ ...current, [row.id]: { ...draft, mpn: e.target.value } }))} className="w-36 rounded-lg border border-zinc-300 px-2 py-1 text-xs" />
                    </td>
                    <td className="px-4 py-3">
                      <input value={draft.lcscPart} onChange={(e) => setDrafts((current) => ({ ...current, [row.id]: { ...draft, lcscPart: e.target.value } }))} className="w-28 rounded-lg border border-zinc-300 px-2 py-1 text-xs" />
                    </td>
                    <td className="px-4 py-3"><JLCBadge tier={row.jlcTier} /></td>
                    <td className="px-4 py-3 font-medium text-red-600">${Number(row.jlcLoadingFee || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      <div className="flex flex-col gap-2">
                        <button onClick={() => saveDraft(row)} className="rounded-lg bg-zinc-900 px-2 py-1 text-white">{savingRowId === row.id ? 'Saving…' : 'Save'}</button>
                        <button onClick={() => setExpandedRowId(expanded ? null : row.id)} className="rounded-lg border border-zinc-300 px-2 py-1">{expanded ? 'Hide' : 'Details'}</button>
                        {row.lockedChoice ? (
                          <button onClick={() => unlockRow(row.id)} className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700">Unlock</button>
                        ) : (
                          <button onClick={() => lockRow(row)} className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-700">Lock</button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="bg-zinc-50/80">
                      <td colSpan={10} className="px-4 py-4">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Row notes</div>
                              <textarea value={draft.userNotes} onChange={(e) => setDrafts((current) => ({ ...current, [row.id]: { ...draft, userNotes: e.target.value } }))} className="mt-2 min-h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
                            </div>
                            <div className="text-xs text-zinc-500">Locked choice: {row.lockedChoice ? `${row.lockedChoice.source}${row.lockedChoice.sku ? ` · ${row.lockedChoice.sku}` : ''}` : 'none'}</div>
                          </div>
                          <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
                            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Add local offer</div>
                            <div className="grid gap-2 md:grid-cols-2">
                              <input value={offerDraft.source} onChange={(e) => setOfferDrafts((current) => ({ ...current, [row.id]: { ...offerDraft, source: e.target.value } }))} placeholder="Source" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
                              <input value={offerDraft.unitPrice} onChange={(e) => setOfferDrafts((current) => ({ ...current, [row.id]: { ...offerDraft, unitPrice: e.target.value } }))} placeholder="Unit price" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
                              <input value={offerDraft.currency} onChange={(e) => setOfferDrafts((current) => ({ ...current, [row.id]: { ...offerDraft, currency: e.target.value } }))} placeholder="Currency" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
                              <input value={offerDraft.moq} onChange={(e) => setOfferDrafts((current) => ({ ...current, [row.id]: { ...offerDraft, moq: e.target.value } }))} placeholder="MOQ" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
                              <input value={offerDraft.leadTimeDays} onChange={(e) => setOfferDrafts((current) => ({ ...current, [row.id]: { ...offerDraft, leadTimeDays: e.target.value } }))} placeholder="Lead time (days)" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
                              <input value={offerDraft.notes} onChange={(e) => setOfferDrafts((current) => ({ ...current, [row.id]: { ...offerDraft, notes: e.target.value } }))} placeholder="Notes" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
                            </div>
                            <button onClick={() => saveOffer(row)} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white">Add offer</button>
                            <div className="space-y-2 text-xs text-zinc-600">
                              {(row.offers ?? []).length === 0 && <div>No local offers yet.</div>}
                              {(row.offers ?? []).map((offer, index) => (
                                <div key={`${row.id}-offer-${index}`} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                                  <span className="font-medium text-zinc-900">{offer.source}</span> · {offer.currency} {offer.unitPrice}
                                  {offer.moq ? ` · MOQ ${offer.moq}` : ''}
                                  {offer.leadTimeDays ? ` · ${offer.leadTimeDays}d` : ''}
                                  {offer.notes ? ` · ${offer.notes}` : ''}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
