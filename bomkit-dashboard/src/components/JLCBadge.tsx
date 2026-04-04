const toneMap: Record<string, string> = {
  basic: 'bg-emerald-100 text-emerald-700',
  preferred_extended: 'bg-yellow-100 text-yellow-700',
  extended: 'bg-orange-100 text-orange-700',
  not_found: 'bg-red-100 text-red-700',
  unknown: 'bg-zinc-200 text-zinc-700',
};

export function JLCBadge({ tier }: { tier: string }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${toneMap[tier] ?? toneMap.unknown}`}>{tier}</span>;
}
