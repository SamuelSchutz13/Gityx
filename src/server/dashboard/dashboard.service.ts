import { Inject, Injectable, Optional } from '@nestjs/common';
import { GitService } from '../git/git.service';
import { ChangesService } from '../changes/changes.service';
import { HistoryService } from '../history/history.service';
import type { Dashboard, TestRunSummary } from '../shared/types';

export const LAST_TEST = 'LAST_TEST';
export type LastTestFn = () => TestRunSummary | null;
const DAYS = 84;

const lines = (s: string | null) => (s ?? '').split('\n').filter(Boolean);

function localDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly git: GitService,
    private readonly changes: ChangesService,
    private readonly history: HistoryService,
    @Optional() @Inject(LAST_TEST) private readonly lastTest: LastTestFn = () => null,
  ) {}

  async get(): Promise<Dashboard> {
    const [status, files, recent, times, names, stashes, heads] = await Promise.all([
      this.git.run(['status', '--porcelain=v2', '--branch', '-z']),
      this.changes.list(),
      this.history.page({ skip: 0, limit: 8 }),
      this.git.tryRun(['log', 'HEAD', `--since=${DAYS}.days`, '--format=%at']),
      this.git.tryRun(['log', 'HEAD', '--format=%an']),
      this.git.tryRun(['stash', 'list']),
      this.git.tryRun(['for-each-ref', 'refs/heads', '--format=%(refname)']),
    ]);

    let branch: string | null = null;
    let upstream: string | null = null;
    let ahead = 0;
    let behind = 0;
    for (const h of status.split('\0')) {
      if (h.startsWith('# branch.head ')) branch = h.slice(14) === '(detached)' ? null : h.slice(14);
      else if (h.startsWith('# branch.upstream ')) upstream = h.slice(18);
      else if (h.startsWith('# branch.ab ')) [ahead, behind] = h.slice(12).split(' ').map((n) => Math.abs(Number(n)));
    }

    const today = new Date();
    const activity = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (DAYS - 1 - i));
      return { day: localDay(d), count: 0 };
    });
    const index = new Map(activity.map((a, i) => [a.day, i]));
    for (const t of lines(times)) {
      const i = index.get(localDay(new Date(Number(t) * 1000)));
      if (i !== undefined) activity[i].count++;
    }

    const counts = new Map<string, number>();
    for (const n of lines(names)) counts.set(n, (counts.get(n) ?? 0) + 1);
    const authors = [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      branch,
      upstream,
      ahead,
      behind,
      pending: {
        files: files.length,
        additions: files.reduce((s, f) => s + f.additions, 0),
        deletions: files.reduce((s, f) => s + f.deletions, 0),
      },
      recent,
      activity,
      authors,
      lastTest: this.lastTest(),
      stashes: lines(stashes).length,
      branches: lines(heads).length,
    };
  }
}
