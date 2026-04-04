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

function rowStatusTone(status: string): string {
  if (status === 'resolved') return 'text-emerald-300';
  if (status === 'unresolved') return 'text-amber-300';
  if (status === 'dnp') return 'text-zinc-400';
  return 'text-zinc-300';
}

export function BOMTable({ projectId, initialRows }: { projectId: number; initialRows: DashboardRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortKey, setSortKey] = useState<'value' | 'footprint' | 'status' | 'quantity'>('value');
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
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
    setTableError(null);
    const response = await fetch(`/api/bom/${projectId}/rows`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowId, ...body }),
    });
    const payload = await response.json();
    setSavingRowId(null);
    if (!response.ok) {
      setTableError(payload.error || 'Failed to update row');
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
    <div className="rounded-[30px] border border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(2,6,23,0.35)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Engineering workspace</div>
          <div className="mt-2 text-lg font-semibold text-white">Dense BOM editing surface</div>
        </div>
        <div className="flex flex-col gap-3 xl:items-end">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search value, footprint, MPN, LCSC" className="w-full rounded-2xl border border-white/10 bg-[#0f1421] px-4 py-3 text-sm text-white placeholder:text-zinc-500 xl:w-80" />
          <div className="flex flex-wrap gap-2 text-xs">
            {['all', 'resolved', 'unresolved', 'dnp'].map((value) => (
              <button key={value} onClick={() => setStatusFilter(value)} className={`rounded-full px-3 py-1.5 uppercase tracking-[0.18em] ${statusFilter === value ? 'bg-white text-[#0a0d14]' : 'border border-white/10 bg-white/5 text-zinc-400'}`}>{value}</button>
            ))}
            {['all', 'basic', 'preferred_extended', 'extended', 'not_found', 'unknown'].map((value) => (
              <button key={value} onClick={() => setTierFilter(value)} className={`rounded-full px-3 py-1.5 uppercase tracking-[0.18em] ${tierFilter === value ? 'bg-cyan-300 text-[#0a0d14]' : 'border border-white/10 bg-white/5 text-zinc-400'}`}>{value.replace('_', ' ')}</button>
            ))}
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as 'value' | 'footprint' | 'status' | 'quantity')} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 uppercase tracking-[0.18em] text-zinc-300">
              <option value="value">value</option>
              <option value="footprint">footprint</option>
              <option value="status">status</option>
              <option value="quantity">quantity</option>
            </select>
          </div>
        </div>
      </div>

      {tableError && <div className="border-b border-red-400/20 bg-red-400/10 px-5 py-3 text-sm text-red-200">{tableError}</div>}
      {filtered.length === 0 && (
        <div className="px-5 py-12 text-center text-sm text-zinc-400">
          <div className="text-lg font-semibold text-white">No rows match the current filters</div>
          <p className="mt-2">Try clearing the search or switching JLC/status filters.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="max-h-[72vh] overflow-auto">
          <table className="min-w-full text-sm text-zinc-200">
            <thead className="sticky top-0 z-10 bg-[#0d1320]/95 backdrop-blur-xl text-left text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Footprint</th>
                <th className="px-4 py-3">MPN</th>
                <th className="px-4 py-3">LCSC#</th>
                <th className="px-4 py-3">JLC tier</th>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => {
                const draft = drafts[row.id] ?? { mpn: row.mpn ?? '', lcscPart: row.lcscPart ?? '', userNotes: row.userNotes ?? '' };
                const offerDraft = offerDrafts[row.id] ?? { source: 'Manual quote', unitPrice: '', currency: 'USD', moq: '', leadTimeDays: '', notes: '' };
                const expanded = expandedRowId === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr className={`align-top border-t border-white/5 ${index % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'} hover:bg-cyan-400/[0.04]`}>
                      <td className="px-4 py-3 font-mono text-xs text-cyan-100">{row.designators.join(', ')}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-300">{row.quantity}</td>
                      <td className="px-4 py-3">{row.value}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">{row.footprint}</td>
                      <td className="px-4 py-3">
                        <input value={draft.mpn} onChange={(e) => setDrafts((current) => ({ ...current, [row.id]: { ...draft, mpn: e.target.value } }))} className="w-40 rounded-xl border border-white/10 bg-[#0f1421] px-3 py-2 text-xs font-mono text-zinc-100" />
                      </td>
                      <td className="px-4 py-3">
                        <input value={draft.lcscPart} onChange={(e) => setDrafts((current) => ({ ...current, [row.id]: { ...draft, lcscPart: e.target.value } }))} className="w-32 rounded-xl border border-white/10 bg-[#0f1421] px-3 py-2 text-xs font-mono text-cyan-100" />
                      </td>
                      <td className="px-4 py-3"><JLCBadge tier={row.jlcTier} /></td>
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-red-200">${Number(row.jlcLoadingFee || 0).toFixed(2)}</td>
                      <td className={`px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] ${rowStatusTone(row.status)}`}>{row.status}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        <div className="flex flex-col gap-2">
                          <button onClick={() => saveDraft(row)} className="rounded-xl bg-white px-3 py-2 font-semibold text-[#0a0d14] disabled:opacity-60">{savingRowId === row.id ? 'Saving…' : 'Save'}</button>
                          <button onClick={() => setExpandedRowId(expanded ? null : row.id)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-zinc-200">{expanded ? 'Hide' : 'Details'}</button>
                          {row.lockedChoice ? (
                            <button onClick={() => unlockRow(row.id)} className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-amber-200">Unlock</button>
                          ) : (
                            <button onClick={() => lockRow(row)} className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-200">Lock</button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-[#0d1320]">
                        <td colSpan={10} className="px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Row notes</div>
                                <textarea value={draft.userNotes} onChange={(e) => setDrafts((current) => ({ ...current, [row.id]: { ...draft, userNotes: e.target.value } }))} className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-[#0f1421] px-3 py-3 text-sm text-zinc-100" />
                              </div>
                              <div className="text-xs text-zinc-500">Locked choice: {row.lockedChoice ? `${row.lockedChoice.source}${row.lockedChoice.sku ? ` · ${row.lockedChoice.sku}` : ''}` : 'none'}</div>
                            </div>
                            <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Add local offer</div>
                              <div className="grid gap-2 md:grid-cols-2">
                                <input value={offerDraft.source} onChange={(e) => setOfferDrafts((current) => ({ ...current, [row.id]: { ...offerDraft, source: e.target.value } }))} placeholder="Source" className="rounded-2xl border border-white/10 bg-[#0f1421] px-3 py-2 text-sm text-zinc-100" />
                                <input value={offerDraft.unitPrice} onChange={(e) => setOfferDrafts((current) => ({ ...current, [row.id]: { ...offerDraft, unitPrice: e.target.value } }))} placeholder="Unit price" className="rounded-2xl border border-white/10 bg-[#0f1421] px-3 py-2 text-sm text-zinc-100" />
                                <input value={offerDraft.currency} onChange={(e) => setOfferDrafts((current) => ({ ...current, [row.id]: { ...offerDraft, currency: e.target.value } }))} placeholder="Currency" className="rounded-2xl border border-white/10 bg-[#0f1421] px-3 py-2 text-sm text-zinc-100" />
                                <input value={offerDraft.moq} onChange={(e) => setOfferDrafts((current) => ({ ...current, [row.id]: { ...offerDraft, moq: e.target.value } }))} placeholder="MOQ" className="rounded-2xl border border-white/10 bg-[#0f1421] px-3 py-2 text-sm text-zinc-100" />
                                <input value={offerDraft.leadTimeDays} onChange={(e) => setOfferDrafts((current) => ({ ...current, [row.id]: { ...offerDraft, leadTimeDays: e.target.value } }))} placeholder="Lead time (days)" className="rounded-2xl border border-white/10 bg-[#0f1421] px-3 py-2 text-sm text-zinc-100" />
                                <input value={offerDraft.notes} onChange={(e) => setOfferDrafts((current) => ({ ...current, [row.id]: { ...offerDraft, notes: e.target.value } }))} placeholder="Notes" className="rounded-2xl border border-white/10 bg-[#0f1421] px-3 py-2 text-sm text-zinc-100" />
                              </div>
                              <button onClick={() => saveOffer(row)} className="rounded-2xl bg-cyan-300 px-3 py-2 text-sm font-semibold text-[#0a0d14]">Add offer</button>
                              <div className="space-y-2 text-xs text-zinc-400">
                                {(row.offers ?? []).length === 0 && <div className="rounded-2xl border border-dashed border-white/10 px-3 py-3">No local offers yet.</div>}
                                {(row.offers ?? []).map((offer, index) => (
                                  <div key={`${row.id}-offer-${index}`} className="rounded-2xl border border-white/10 bg-[#0f1421] px-3 py-3">
                                    <span className="font-medium text-white">{offer.source}</span> · {offer.currency} {offer.unitPrice}
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
      )}
    </div>
  );
}
