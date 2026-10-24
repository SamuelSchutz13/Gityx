// DTOs shared by the server API and the web app.
export type LineKind = 'context' | 'add' | 'del';
export interface DiffLine { kind: LineKind; oldNo: number | null; newNo: number | null; text: string }
export interface Hunk { header: string; lines: DiffLine[] }
export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';
export interface FileDiff { path: string; oldPath?: string; status: FileStatus; staged: boolean; binary: boolean; truncated: boolean; additions: number; deletions: number; hunks: Hunk[] }
export interface Commit { sha: string; parents: string[]; author: string; email: string; time: number; refs: string[]; subject: string }
export interface CommitDetail extends Commit { body: string; files: FileDiff[] }
export interface Dashboard { branch: string | null; upstream: string | null; ahead: number; behind: number; pending: { files: number; additions: number; deletions: number }; recent: Commit[]; activity: { day: string; count: number }[]; authors: { name: string; count: number; email: string }[]; lastTest: TestRunSummary | null; stashes: number; branches: number }
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'cancelled' | 'error';
export interface TestProject { name: string; kind: 'jest' | 'vitest' | 'script' | 'go' | 'command'; dir: string; command?: string[] }
export interface TestCase { name: string; file?: string; status: TestStatus; durationMs?: number; message?: string }
export interface ProjectRun { project: TestProject; status: TestStatus; exitCode: number | null; durationMs: number; cases: TestCase[] | null; log: string }
export interface TestRun { id: string; status: TestStatus; startedAt: number; projects: ProjectRun[] }
export interface TestRunSummary { status: TestStatus; passed: number; failed: number; finishedAt: number }
export interface SearchHit { file: number; path: string; hunk: number; line: number; start: number; end: number }
export interface Stats {
  totalCommits: number;
  contributors: number;
  firstCommit: number | null;
  lastTag: string | null;
  trackedFiles: number;
  languages: { name: string; files: number }[];
  hotFiles: { path: string; changes: number }[];
  weekly: { week: string; count: number }[];
  /** [weekday 0=Sunday][hour] commit counts over the last year */
  punchcard: number[][];
  /** lines of tracked text files, by extension (top 7 + __other__) */
  linesByLanguage: { name: string; lines: number }[];
  totalLines: number;
  merges: number;
  /** conventional-commit type of last year's subjects: feat, fix, docs... plus merge and other */
  commitTypes: { type: string; count: number }[];
  frameworks: Framework[];
}
export interface Framework {
  name: string;
  version?: string;
  category: 'language' | 'framework' | 'data' | 'style' | 'test' | 'build' | 'infra';
  /** manifest the detection came from */
  source: string;
}
