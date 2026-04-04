export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 5);
  const delimiters = [',', ';', '\t'];
  const scores = delimiters.map((delimiter) => ({
    delimiter,
    score: lines.reduce((acc, line) => acc + line.split(delimiter).length, 0),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.delimiter ?? ',';
}

export function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

export function parseCsvText(text: string): string[][] {
  const delimiter = detectDelimiter(text);
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => parseCsvLine(line, delimiter));
}

export function splitDesignators(raw: string): string[] {
  return String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
