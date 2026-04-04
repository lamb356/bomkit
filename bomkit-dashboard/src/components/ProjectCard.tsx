import Link from 'next/link';

interface ProjectCardProps {
  project: {
    id: number;
    name: string;
    updatedAt?: string | Date | null;
    summary?: {
      partCount: number;
      unresolvedCount: number;
      feeTotal: number;
    };
  };
}

function formatTimestamp(value?: string | Date | null): string {
  if (!value) return 'No revision imported yet';
  const date = value instanceof Date ? value : new Date(value);
  return `Updated ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/dashboard/${project.id}`}
      className="group rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_90px_rgba(2,6,23,0.32)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-cyan-400/35 hover:bg-white/[0.08]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Project</div>
          <div className="mt-2 text-lg font-semibold text-white group-hover:text-cyan-200">{project.name}</div>
          <div className="mt-2 text-sm text-zinc-500">{formatTimestamp(project.updatedAt)}</div>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
          Workspace
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl border border-white/10 bg-[#0e1421] px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Rows</div>
          <div className="mt-2 font-mono text-lg text-white">{project.summary?.partCount ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0e1421] px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Unresolved</div>
          <div className="mt-2 font-mono text-lg text-amber-200">{project.summary?.unresolvedCount ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0e1421] px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Fees</div>
          <div className="mt-2 font-mono text-lg text-cyan-100">${(project.summary?.feeTotal ?? 0).toFixed(2)}</div>
        </div>
      </div>
    </Link>
  );
}
