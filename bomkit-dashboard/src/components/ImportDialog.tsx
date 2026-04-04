"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { detectFormat, parseBomkitCsv, parseKicadCsv, type ParsedBOMRow } from '@/lib/parsers';

function previewRows(fileText: string): { detectedFormat: string; rows: ParsedBOMRow[] } {
  const detectedFormat = detectFormat(fileText);
  const rows = detectedFormat === 'bomkit-fab' ? parseBomkitCsv(fileText) : parseKicadCsv(fileText);
  return { detectedFormat, rows: rows.slice(0, 5) };
}

export function ImportDialog() {
  const router = useRouter();
  const [projectName, setProjectName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileText, setFileText] = useState('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => {
    if (!fileText) return null;
    try {
      return previewRows(fileText);
    } catch (error) {
      return { detectedFormat: 'unknown', rows: [], error: error instanceof Error ? error.message : 'Unable to parse file' };
    }
  }, [fileText]);

  async function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setStatus('');
    if (!nextFile) {
      setFileText('');
      return;
    }
    setFileText(await nextFile.text());
    if (!projectName) {
      setProjectName(nextFile.name.replace(/\.csv$/i, ''));
    }
  }

  async function handleImport() {
    if (!file) return;
    const formData = new FormData();
    formData.set('file', file);
    formData.set('projectName', projectName || file.name.replace(/\.csv$/i, ''));
    setLoading(true);
    setStatus('Importing BOM into workspace…');
    const response = await fetch('/api/bom/import', { method: 'POST', body: formData });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setStatus(data.error || 'Import failed');
      return;
    }
    setStatus(`Imported revision ${data.version}`);
    router.push(`/dashboard/${data.projectId}`);
    router.refresh();
  }

  const statusTone = status.toLowerCase().includes('failed') || status.toLowerCase().includes('error')
    ? 'text-red-300'
    : status
      ? 'text-cyan-300'
      : 'text-zinc-500';

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.45)] backdrop-blur-xl">
      <div className="space-y-5">
        <div>
          <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
            Import pipeline
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">Upload a BOM and keep the engineering context.</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Bring in a BOMKit Fab CSV or KiCad Symbol Fields export, preview the normalized rows, and turn it into a persistent project with revision memory.</p>
        </div>

        <input
          className="w-full rounded-2xl border border-white/10 bg-[#0f1421] px-4 py-3 text-sm text-white placeholder:text-zinc-500"
          placeholder="Project name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />

        <label className="block rounded-3xl border border-dashed border-white/15 bg-[#0d1320] px-5 py-7 text-center text-sm text-zinc-400 hover:border-cyan-400/40 hover:bg-cyan-400/5">
          <span className="block font-medium text-white">Drag a CSV here or browse from disk</span>
          <span className="mt-2 block text-xs text-zinc-500">Supports BOMKit Fab export CSV and KiCad Symbol Fields CSV.</span>
          <input className="mt-5 w-full cursor-pointer rounded-2xl border border-white/10 bg-[#131a2b] px-4 py-3 text-sm text-zinc-300 file:hidden" type="file" accept=".csv" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
        </label>

        {preview && (
          <div className="rounded-3xl border border-white/10 bg-[#0d1320] p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium text-white">Detected: {preview.detectedFormat === 'bomkit-fab' ? 'BOMKit Fab export' : preview.detectedFormat === 'kicad-csv' ? 'KiCad Symbol Fields CSV' : 'Unknown'}</div>
                {'error' in preview && preview.error ? <div className="mt-1 text-red-300">{preview.error}</div> : <div className="mt-1 text-zinc-500">Previewing the first {preview.rows.length} normalized rows.</div>}
              </div>
            </div>
            {preview.rows.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0f19]">
                <table className="min-w-full text-left text-xs text-zinc-300">
                  <thead className="bg-white/5 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                    <tr>
                      <th className="px-3 py-2.5">Ref</th>
                      <th className="px-3 py-2.5">Value</th>
                      <th className="px-3 py-2.5">Footprint</th>
                      <th className="px-3 py-2.5">MPN</th>
                      <th className="px-3 py-2.5">LCSC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, index) => (
                      <tr key={`${row.designators.join(',')}-${index}`} className="border-t border-white/5 odd:bg-white/[0.02]">
                        <td className="px-3 py-2 font-mono text-cyan-100">{row.designators.join(', ')}</td>
                        <td className="px-3 py-2">{row.value}</td>
                        <td className="px-3 py-2">{row.footprint}</td>
                        <td className="px-3 py-2 font-mono">{row.mpn ?? '—'}</td>
                        <td className="px-3 py-2 font-mono">{row.lcscPart ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!file || loading}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#0a0d14] shadow-[0_20px_60px_rgba(255,255,255,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Importing…' : 'Import into dashboard'}
        </button>
        <p className={`text-sm ${statusTone}`}>{status || 'No file selected yet.'}</p>
      </div>
    </div>
  );
}
