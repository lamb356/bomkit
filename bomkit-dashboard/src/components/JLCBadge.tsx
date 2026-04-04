const toneMap: Record<string, string> = {
  basic: 'border-emerald-400/25 bg-emerald-400/15 text-emerald-200',
  preferred_extended: 'border-yellow-400/25 bg-yellow-400/15 text-yellow-100',
  extended: 'border-orange-400/25 bg-orange-400/15 text-orange-100',
  not_found: 'border-red-400/25 bg-red-400/15 text-red-100',
  unknown: 'border-zinc-500/30 bg-zinc-500/15 text-zinc-200',
};

const labelMap: Record<string, string> = {
  preferred_extended: 'preferred ext',
  not_found: 'not found',
};

export function JLCBadge({ tier }: { tier: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneMap[tier] ?? toneMap.unknown}`}>
      {labelMap[tier] ?? tier}
    </span>
  );
}
