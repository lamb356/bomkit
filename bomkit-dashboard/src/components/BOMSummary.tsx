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

export function BOMSummary(props: SummaryProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-zinc-500">Project: {props.projectName} | {props.revisionLabel} | {props.totalRows} rows</div>
      <div className="mt-2 grid gap-2 text-sm text-zinc-700 md:grid-cols-3">
        <div>Resolved: <span className="font-semibold">{props.resolvedCount}</span></div>
        <div>Unresolved: <span className="font-semibold">{props.unresolvedCount}</span></div>
        <div>DNP: <span className="font-semibold">{props.dnpCount}</span></div>
        <div>JLC fees: <span className="font-semibold">${props.jlcFeeTotal.toFixed(2)}</span></div>
        <div>Basic: <span className="font-semibold">{props.basicCount}</span></div>
        <div>Not found: <span className="font-semibold">{props.notFoundCount}</span></div>
      </div>
    </div>
  );
}
