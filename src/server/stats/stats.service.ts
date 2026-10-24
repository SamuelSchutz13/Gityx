import { Injectable } from '@nestjs/common';
import { open } from 'node:fs/promises';
import { GitService } from '../git/git.service';
import { confine } from '../repo/paths';
import { detectFrameworks } from './frameworks';
import type { Stats } from '../shared/types';

const WEEKS = 26;
const TOP_LANGUAGES = 7;
const HOT_FILES = 8;
const MAX_LOC_FILES = 5000;
const MAX_LOC_BYTES = 1024 * 1024;
// Lockfiles and minified bundles are generated, not written: they would dwarf the real code.
const GENERATED = /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|go\.sum|poetry\.lock|Pipfile\.lock|composer\.lock|Gemfile\.lock|gradle\.lockfile)$|\.min\.(js|css)$/;
const TYPES = new Set(['feat', 'fix', 'docs', 'chore', 'refactor', 'test', 'style', 'perf', 'ci', 'build', 'revert']);

const lines = (s: string | null) => (s ?? '').split('\n').filter(Boolean);

function weekStart(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function extOf(path: string): string {
  const name = path.split('/').pop()!;
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '__none__';
}

function topWithOther<T extends { name: string }>(items: T[], value: (t: T) => number, other: (n: number) => T): T[] {
  const sorted = [...items].sort((a, b) => value(b) - value(a) || a.name.localeCompare(b.name));
  if (sorted.length <= TOP_LANGUAGES + 1) return sorted;
  return [...sorted.slice(0, TOP_LANGUAGES), other(sorted.slice(TOP_LANGUAGES).reduce((s, x) => s + value(x), 0))];
}

@Injectable()
export class StatsService {
  constructor(private readonly git: GitService) {}

  // shortcut: every call walks HEAD's history and reads tracked text files (capped at 5000 files / 1 MB each); cache per HEAD if huge repos get slow.
  async get(): Promise<Stats> {
    const [count, roots, tag, files, emails, times, touched, subjects, merges, frameworks] = await Promise.all([
      this.git.tryRun(['rev-list', '--count', 'HEAD']),
      this.git.tryRun(['log', 'HEAD', '--max-parents=0', '--format=%at']),
      this.git.tryRun(['describe', '--tags', '--abbrev=0']),
      this.git.tryRun(['ls-files', '-z']),
      this.git.tryRun(['log', 'HEAD', '--format=%ae']),
      this.git.tryRun(['log', 'HEAD', '--since=1.year', '--format=%at']),
      this.git.tryRun(['log', 'HEAD', '--since=90.days', '--name-only', '--format=']),
      this.git.tryRun(['log', 'HEAD', '--since=1.year', '--format=%s']),
      this.git.tryRun(['rev-list', '--count', '--merges', 'HEAD']),
      detectFrameworks(this.git),
    ]);

    const tracked = (files ?? '').split('\0').filter(Boolean);
    const byExt = new Map<string, number>();
    for (const f of tracked) byExt.set(extOf(f), (byExt.get(extOf(f)) ?? 0) + 1);
    const languages = topWithOther([...byExt].map(([name, n]) => ({ name, files: n })), (l) => l.files, (n) => ({ name: '__other__', files: n }));

    const loc = new Map<string, number>();
    for (const f of tracked.filter((p) => !GENERATED.test(p)).slice(0, MAX_LOC_FILES)) {
      const n = await this.countLines(f);
      if (n) loc.set(extOf(f), (loc.get(extOf(f)) ?? 0) + n);
    }
    const linesByLanguage = topWithOther([...loc].map(([name, n]) => ({ name, lines: n })), (l) => l.lines, (n) => ({ name: '__other__', lines: n }));

    const hot = new Map<string, number>();
    for (const p of lines(touched)) hot.set(p, (hot.get(p) ?? 0) + 1);
    const hotFiles = [...hot].map(([path, changes]) => ({ path, changes })).sort((a, b) => b.changes - a.changes || a.path.localeCompare(b.path)).slice(0, HOT_FILES);

    const types = new Map<string, number>();
    for (const subject of lines(subjects)) {
      const m = /^(\w+)(\([^)]*\))?!?:/.exec(subject);
      const type = subject.startsWith('Merge ') ? 'merge' : m && TYPES.has(m[1].toLowerCase()) ? m[1].toLowerCase() : 'other';
      types.set(type, (types.get(type) ?? 0) + 1);
    }
    const commitTypes = [...types].map(([type, n]) => ({ type, count: n })).sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

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
      linesByLanguage,
      totalLines: [...loc.values()].reduce((s, n) => s + n, 0),
      merges: Number(merges?.trim() ?? 0) || 0,
      commitTypes,
      frameworks,
    };
  }

  private async countLines(path: string): Promise<number> {
    try {
      const fh = await open(confine(this.git.root, path), 'r');
      try {
        const { size } = await fh.stat();
        if (!size || size > MAX_LOC_BYTES) return 0;
        const buf = await fh.readFile();
        if (buf.subarray(0, 8000).includes(0)) return 0;
        let n = 0;
        for (const b of buf) if (b === 10) n++;
        return buf[buf.length - 1] === 10 ? n : n + 1;
      } finally {
        await fh.close();
      }
    } catch {
      return 0;
    }
  }
}
