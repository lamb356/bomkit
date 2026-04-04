interface RevisionDiffItem {
  key: string;
  kind: 'added' | 'removed' | 'changed';
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

interface RevisionDiffProps {
  added: number;
  removed: number;
  changed: number;
  items?: RevisionDiffItem[];
}

export function RevisionDiff({ added, removed, changed, items = [] }: RevisionDiffProps) {
  return (
    <details className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-700" open={items.length > 0}>
      <summary className="cursor-pointer list-none font-medium text-zinc-900">
        Revision diff: {added} added · {removed} removed · {changed} changed
      </summary>
      {items.length > 0 ? (
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div key={item.key} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
              <div className="font-medium text-zinc-900">{item.kind.toUpperCase()} · {item.key}</div>
              {item.kind === 'changed' && (
                <div className="mt-1 text-xs text-zinc-600">
                  Before: {JSON.stringify(item.before)}
                  <br />
                  After: {JSON.stringify(item.after)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-zinc-500">Import another revision for this project to see added / removed / changed rows.</div>
      )}
    </details>
  );
}
