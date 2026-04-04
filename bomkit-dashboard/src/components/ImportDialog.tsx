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
    setStatus('Uploading…');
    const response = await fetch('/api/bom/import', { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || 'Import failed');
      return;
    }
    setStatus(`Imported revision ${data.version}`);
    router.push(`/dashboard/${data.projectId}`);
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Import BOM</h2>
          <p className="mt-1 text-sm text-zinc-600">Upload a BOMKit Fab CSV or KiCad Symbol Fields CSV, preview the first few rows, then save it into a persistent project.</p>
        </div>
        <input className="w-full rounded-xl border border-zinc-300 px-3 py-2" placeholder="Project name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
        <label className="block rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
          <span className="font-medium text-zinc-900">Drag a CSV here or pick a file</span>
          <input className="mt-4 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2" type="file" accept=".csv" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
        </label>

        {preview && (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium text-zinc-900">Detected: {preview.detectedFormat === 'bomkit-fab' ? 'BOMKit Fab export' : preview.detectedFormat === 'kicad-csv' ? 'KiCad Symbol Fields CSV' : 'Unknown'}</div>
                {'error' in preview && preview.error ? <div className="mt-1 text-red-600">{preview.error}</div> : <div className="mt-1 text-zinc-500">Previewing the first {preview.rows.length} parsed rows.</div>}
              </div>
            </div>
            {preview.rows.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-zinc-100 text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Ref</th>
                      <th className="px-3 py-2">Value</th>
                      <th className="px-3 py-2">Footprint</th>
                      <th className="px-3 py-2">MPN</th>
                      <th className="px-3 py-2">LCSC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, index) => (
                      <tr key={`${row.designators.join(',')}-${index}`} className="border-t border-zinc-100">
                        <td className="px-3 py-2 font-mono">{row.designators.join(', ')}</td>
                        <td className="px-3 py-2">{row.value}</td>
                        <td className="px-3 py-2">{row.footprint}</td>
                        <td className="px-3 py-2">{row.mpn ?? '—'}</td>
                        <td className="px-3 py-2">{row.lcscPart ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <button onClick={handleImport} disabled={!file} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Import</button>
        <p className="text-sm text-zinc-500">{status || 'Supports BOMKit Fab export CSV and KiCad Symbol Fields CSV.'}</p>
      </div>
    </div>
  );
}
