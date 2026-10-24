import type { FileDiff, Hunk } from '../shared/types';

export const MAX_LINES = 5000;

// shortcut: only C-style quoted names with \" \\ and octal escapes are decoded, enough for core.quotePath=false output.
function unquote(s: string): string {
  if (!s.startsWith('"')) return s;
  const bytes: number[] = [];
  for (let i = 1; i < s.length - 1; i++) {
    if (s[i] === '\\') {
      const oct = /^[0-7]{3}/.exec(s.slice(i + 1));
      if (oct) { bytes.push(parseInt(oct[0], 8)); i += 3; continue; }
      const c = s[++i];
      bytes.push(...Buffer.from(({ n: '\n', t: '\t' } as Record<string, string>)[c] ?? c));
    } else bytes.push(...Buffer.from(s[i]));
  }
  return Buffer.from(bytes).toString('utf8');
}

function stripPrefix(p: string): string {
  const u = unquote(p);
  return u.startsWith('a/') || u.startsWith('b/') ? u.slice(2) : u;
}

function headerPath(rest: string): string {
  // "a/P b/P": both halves are equal for non-renames, so the path is the middle-split.
  if (rest.startsWith('"')) return stripPrefix(rest.slice(0, rest.indexOf('" ') + 1) || rest);
  return rest.slice(2, (rest.length - 3) / 2 + 1);
}

export function parseDiff(raw: string, staged: boolean): FileDiff[] {
  const files: FileDiff[] = [];
  let f: FileDiff | null = null;
  let hunk: Hunk | null = null;
  let oldNo = 0;
  let newNo = 0;
  let count = 0;

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (line.startsWith('diff --git ')) {
      f = { path: headerPath(line.slice(11)), status: 'modified', staged, binary: false, truncated: false, additions: 0, deletions: 0, hunks: [] };
      files.push(f);
      hunk = null;
      count = 0;
      continue;
    }
    if (!f) continue;
    if (!hunk) {
      if (line.startsWith('new file mode')) f.status = 'added';
      else if (line.startsWith('deleted file mode')) f.status = 'deleted';
      else if (line.startsWith('rename from ')) { f.oldPath = unquote(line.slice(12)); f.status = 'renamed'; }
      else if (line.startsWith('rename to ')) f.path = unquote(line.slice(10));
      else if (line.startsWith('Binary files ')) f.binary = true;
      else if (line.startsWith('+++ ') && line !== '+++ /dev/null') f.path = stripPrefix(line.slice(4));
    }
    const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (m) {
      oldNo = Number(m[1]);
      newNo = Number(m[2]);
      hunk = { header: line, lines: [] };
      f.hunks.push(hunk);
      continue;
    }
    if (!hunk) continue;
    const c = line[0];
    if (c !== ' ' && c !== '+' && c !== '-') continue;
    if (c === '+') f.additions++;
    if (c === '-') f.deletions++;
    if (count >= MAX_LINES) { f.truncated = true; continue; }
    count++;
    const text = line.slice(1);
    if (c === '+') hunk.lines.push({ kind: 'add', oldNo: null, newNo: newNo++, text });
    else if (c === '-') hunk.lines.push({ kind: 'del', oldNo: oldNo++, newNo: null, text });
    else hunk.lines.push({ kind: 'context', oldNo: oldNo++, newNo: newNo++, text });
  }
  return files;
}
