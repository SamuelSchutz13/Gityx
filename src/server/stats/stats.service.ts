import { Injectable } from '@nestjs/common';
import { GitService } from '../git/git.service';
import type { Stats } from '../shared/types';

const WEEKS = 26;
const TOP_LANGUAGES = 7;
const HOT_FILES = 8;

const lines = (s: string | null) => (s ?? '').split('\n').filter(Boolean);

function weekStart(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

@Injectable()
export class StatsService {
  constructor(private readonly git: GitService) {}

  // shortcut: every call walks HEAD's history (author emails, last year of timestamps); cache per HEAD if huge repos get slow.
  async get(): Promise<Stats> {
    const [count, roots, tag, files, emails, times, touched] = await Promise.all([
      this.git.tryRun(['rev-list', '--count', 'HEAD']),
      this.git.tryRun(['log', 'HEAD', '--max-parents=0', '--format=%at']),
      this.git.tryRun(['describe', '--tags', '--abbrev=0']),
      this.git.tryRun(['ls-files', '-z']),
      this.git.tryRun(['log', 'HEAD', '--format=%ae']),
      this.git.tryRun(['log', 'HEAD', '--since=1.year', '--format=%at']),
      this.git.tryRun(['log', 'HEAD', '--since=90.days', '--name-only', '--format=']),
    ]);

    const byExt = new Map<string, number>();
    const tracked = (files ?? '').split('\0').filter(Boolean);
    for (const f of tracked) {
      const name = f.split('/').pop()!;
      const dot = name.lastIndexOf('.');
      const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '__none__';
      byExt.set(ext, (byExt.get(ext) ?? 0) + 1);
    }
    const sorted = [...byExt].map(([name, n]) => ({ name, files: n })).sort((a, b) => b.files - a.files || a.name.localeCompare(b.name));
    const languages = sorted.length > TOP_LANGUAGES + 1
      ? [...sorted.slice(0, TOP_LANGUAGES), { name: '__other__', files: sorted.slice(TOP_LANGUAGES).reduce((s, l) => s + l.files, 0) }]
      : sorted;

    const hot = new Map<string, number>();
    for (const p of lines(touched)) hot.set(p, (hot.get(p) ?? 0) + 1);
    const hotFiles = [...hot].map(([path, changes]) => ({ path, changes })).sort((a, b) => b.changes - a.changes || a.path.localeCompare(b.path)).slice(0, HOT_FILES);

    const thisWeek = weekStart(new Date());
    const weekly = Array.from({ length: WEEKS }, (_, i) => {
      const d = new Date(thisWeek.getFullYear(), thisWeek.getMonth(), thisWeek.getDate() - 7 * (WEEKS - 1 - i));
      return { week: iso(d), count: 0 };
    });
    const index = new Map(weekly.map((w, i) => [w.week, i]));
    const punchcard = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
    for (const t of lines(times)) {
      const d = new Date(Number(t) * 1000);
      punchcard[d.getDay()][d.getHours()]++;
      const i = index.get(iso(weekStart(d)));
      if (i !== undefined) weekly[i].count++;
    }

    const first = lines(roots).map(Number).sort((a, b) => a - b)[0];
    return {
      totalCommits: Number(count?.trim() ?? 0) || 0,
      contributors: new Set(lines(emails).map((e) => e.toLowerCase())).size,
      firstCommit: first ?? null,
      lastTag: tag?.trim() || null,
      trackedFiles: tracked.length,
      languages,
      hotFiles,
      weekly,
      punchcard,
    };
  }
}
