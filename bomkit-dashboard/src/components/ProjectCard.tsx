import Link from 'next/link';

export function ProjectCard({ project }: { project: { id: number; name: string } }) {
  return (
    <Link href={`/dashboard/${project.id}`} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow-md">
      <div className="text-sm text-zinc-500">Project</div>
      <div className="mt-1 text-lg font-semibold text-zinc-900">{project.name}</div>
    </Link>
  );
}
