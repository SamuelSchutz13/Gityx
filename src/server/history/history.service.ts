import { Injectable } from '@nestjs/common';
import { relative } from 'node:path';
import { GitService } from '../git/git.service';
import { parseDiff } from '../git/diff-parser';
import { LOG_FORMAT, parseLog, parseRecord } from '../git/log-parser';
import { confine } from '../repo/paths';
import type { Commit, CommitDetail } from '../shared/types';

export interface HistoryQuery {
  skip: number;
  limit: number;
  author?: string;
  path?: string;
  since?: string;
  until?: string;
}

export class CommitNotFoundError extends Error {}

@Injectable()
export class HistoryService {
  constructor(private readonly git: GitService) {}

  async page(q: HistoryQuery): Promise<Commit[]> {
    const args = ['log', '--all', '--date-order', '--parents', '-z', LOG_FORMAT, `--skip=${q.skip}`, `--max-count=${q.limit}`];
    if (q.author) args.push(`--author=${q.author}`);
    if (q.since) args.push(`--since=${q.since}`);
    if (q.until) args.push(`--until=${q.until} 23:59:59`);
    if (q.path) args.push('--', relative(this.git.root, confine(this.git.root, q.path)).split('\\').join('/'));
    const out = await this.git.tryRun(args);
    return out ? parseLog(out) : [];
  }

  async detail(sha: string): Promise<CommitDetail> {
    const head = await this.git.tryRun(['show', '-s', '-z', `${LOG_FORMAT}%x1f%b`, sha, '--']);
    if (head === null) throw new CommitNotFoundError(sha);
    const rec = head.split('\0')[0];
    const body = rec.split('\x1f').slice(7).join('\x1f').trim();
    const patch = await this.git.run(['show', '--format=', '--no-color', '--no-ext-diff', '-M', '--patch', '--diff-merges=first-parent', sha, '--']);
    return { ...parseRecord(rec), body, files: parseDiff(patch, false) };
  }
}
