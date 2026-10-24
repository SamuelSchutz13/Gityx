import type { FileDiff, SearchHit } from '../shared/types';

const MAX_HITS = 5000;

export function searchDiffs(
  files: FileDiff[],
  query: string,
  opts: { caseSensitive: boolean; regex: boolean },
): { hits: SearchHit[]; error: string | null } {
  if (!query) return { hits: [], error: null };
  let re: RegExp;
  try {
    const source = opts.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(source, opts.caseSensitive ? 'g' : 'gi');
  } catch (e) {
    return { hits: [], error: `Regex inválida: ${(e as Error).message}` };
  }

  const hits: SearchHit[] = [];
  const scan = (text: string, at: Omit<SearchHit, 'start' | 'end'>) => {
    re.lastIndex = 0;
    for (let m = re.exec(text); m && hits.length < MAX_HITS; m = re.exec(text)) {
      if (m[0] === '') {
        re.lastIndex++;
        if (re.lastIndex > text.length) break;
        continue;
      }
      hits.push({ ...at, start: m.index, end: m.index + m[0].length });
    }
  };

  for (const [file, f] of files.entries()) {
    scan(f.path, { file, path: f.path, hunk: -1, line: -1 });
    f.hunks.forEach((h, hi) => h.lines.forEach((l, li) => scan(l.text, { file, path: f.path, hunk: hi, line: li })));
    if (hits.length >= MAX_HITS) break;
  }
  return { hits, error: null };
}
