import { Injectable } from '@nestjs/common';
import { open, stat } from 'node:fs/promises';
import { GitService } from '../git/git.service';
import { MAX_LINES, parseDiff } from '../git/diff-parser';
import { confine } from '../repo/paths';
import type { FileDiff } from '../shared/types';

export const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const MAX_UNTRACKED_BYTES = 1024 * 1024;
const DIFF_ARGS = ['--no-color', '--no-ext-diff', '-M', '--patch'];

@Injectable()
export class ChangesService {
  constructor(private readonly git: GitService) {}

  async headOrEmpty(): Promise<string> {
    return (await this.git.tryRun(['rev-parse', '--verify', '-q', 'HEAD']))?.trim() || EMPTY_TREE;
  }

  async list(): Promise<FileDiff[]> {
    const base = await this.headOrEmpty();
    const [staged, unstaged, others] = await Promise.all([
      this.git.run(['diff', '--cached', ...DIFF_ARGS, base]),
      this.git.run(['diff', ...DIFF_ARGS]),
      this.git.run(['ls-files', '--others', '--exclude-standard', '-z']),
    ]);
    const untracked = await Promise.all(others.split('\0').filter(Boolean).map((p) => this.untracked(p)));
    return [...parseDiff(staged, true), ...parseDiff(unstaged, false), ...untracked];
  }

  private async untracked(path: string): Promise<FileDiff> {
    const f: FileDiff = { path, status: 'untracked', staged: false, binary: false, truncated: false, additions: 0, deletions: 0, hunks: [] };
    const abs = confine(this.git.root, path);
    const size = (await stat(abs)).size;
    const fh = await open(abs, 'r');
    try {
      const head = Buffer.alloc(Math.min(size, 8000));
      await fh.read(head, 0, head.length, 0);
      if (head.includes(0)) return { ...f, binary: true };
      if (size > MAX_UNTRACKED_BYTES) return { ...f, truncated: true };
      const text = (await fh.readFile()).toString('utf8');
      const lines = text.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();
      f.additions = lines.length;
      f.truncated = lines.length > MAX_LINES;
      const shown = lines.slice(0, MAX_LINES);
      f.hunks = [{
        header: `@@ -0,0 +1,${lines.length} @@`,
        lines: shown.map((t, i) => ({ kind: 'add', oldNo: null, newNo: i + 1, text: t.endsWith('\r') ? t.slice(0, -1) : t })),
      }];
      return f;
    } finally {
      await fh.close();
    }
  }
}
