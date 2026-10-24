import type { FileDiff, TestRun } from '../shared/types';

const NAME_PATTERNS = [/(^|\/)\.env(\..*)?$/i, /\.(pem|key|p12|pfx)$/i, /id_(rsa|ed25519|ecdsa)/i, /credentials/i, /secrets?\./i];
const CONTENT_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,
  /gh[pousr]_[A-Za-z0-9]{36}/,
  /xox[baprs]-/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /password\s*[:=]\s*["'][^"']+/i,
];

export function isSensitive(path: string, content: string): boolean {
  const p = path.split('\\').join('/');
  return NAME_PATTERNS.some((r) => r.test(p)) || CONTENT_PATTERNS.some((r) => r.test(content));
}

export interface ReportMeta {
  repo: string;
  branch: string | null;
  head: string | null;
}

export interface Report extends ReportMeta {
  generatedAt: string;
  files: (FileDiff & { omitted: boolean })[];
  tests: TestRun | null;
}

export function buildReport(meta: ReportMeta, files: FileDiff[], tests: TestRun | null, includeSensitive: boolean): Report {
  return {
    ...meta,
    generatedAt: new Date().toISOString(),
    tests,
    files: files.map((f) => {
      const content = f.hunks.flatMap((h) => h.lines.map((l) => l.text)).join('\n');
      const omitted = !includeSensitive && isSensitive(f.path, content);
      return { ...f, hunks: omitted ? [] : f.hunks, omitted };
    }),
  };
}
