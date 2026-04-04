interface SummaryProps {
  projectName: string;
  revisionLabel: string;
  totalRows: number;
  resolvedCount: number;
  unresolvedCount: number;
  dnpCount: number;
  jlcFeeTotal: number;
  basicCount: number;
  notFoundCount: number;
}

const metrics = [
  { key: 'resolved', label: 'Resolved' },
  { key: 'unresolved', label: 'Unresolved' },
  { key: 'dnp', label: 'DNP' },
  { key: 'fee', label: 'JLC fees' },
  { key: 'basic', label: 'Basic' },
  { key: 'not-found', label: 'Not found' },
] as const;

export function BOMSummary(props: SummaryProps) {
  const metricValues: Record<(typeof metrics)[number]['key'], string> = {
    resolved: String(props.resolvedCount),
    unresolved: String(props.unresolvedCount),
    dnp: String(props.dnpCount),
    fee: `$${props.jlcFeeTotal.toFixed(2)}`,
    basic: String(props.basicCount),
    'not-found': String(props.notFoundCount),
  };

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_90px_rgba(2,6,23,0.35)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Workspace summary</div>
          <div className="mt-2 text-lg font-semibold text-white">{props.projectName}</div>
          <div className="mt-1 text-sm text-zinc-400">{props.revisionLabel} · {props.totalRows} grouped rows</div>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          JLC loading fees currently estimate to <span className="font-semibold">${props.jlcFeeTotal.toFixed(2)}</span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <div key={metric.key} className="rounded-2xl border border-white/10 bg-[#0e1421] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{metric.label}</div>
            <div className="mt-2 text-xl font-semibold text-white">{metricValues[metric.key]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
