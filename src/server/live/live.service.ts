import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { FSWatcher, watch } from 'node:fs';
import { Subject } from 'rxjs';
import { GitService } from '../git/git.service';

export interface LiveEvent {
  type: 'changes' | 'history';
}

const POLL_MS = 2000;
const DEBOUNCE_MS = 200;

@Injectable()
export class LiveService implements OnModuleInit, OnModuleDestroy {
  readonly events$ = new Subject<LiveEvent>();
  private last: Record<LiveEvent['type'], string | null> = { changes: null, history: null };
  private watcher?: FSWatcher;
  private timer?: NodeJS.Timeout;
  private debounce?: NodeJS.Timeout;
  private running: Promise<void> | null = null;

  constructor(private readonly git: GitService) {}

  async onModuleInit() {
    await this.check();
    try {
      this.watcher = watch(this.git.root, { recursive: true }, (_e, file) => {
        if (file && /(^|[\\/])node_modules([\\/]|$)/.test(String(file))) return;
        clearTimeout(this.debounce);
        this.debounce = setTimeout(() => void this.check(), DEBOUNCE_MS);
      });
      this.watcher.on('error', () => this.watcher?.close());
    } catch {
      // The polling below still covers platforms or folders where recursive watch fails.
    }
    this.timer = setInterval(() => void this.check(), POLL_MS).unref();
  }

  onModuleDestroy() {
    this.watcher?.close();
    clearInterval(this.timer);
    clearTimeout(this.debounce);
    this.events$.complete();
  }

  check(): Promise<void> {
    this.running ??= this.compute().finally(() => (this.running = null));
    return this.running;
  }

  private async compute() {
    const [status, refs, head] = await Promise.all([
      this.git.tryRun(['status', '--porcelain=v2', '-z', '--untracked-files=all']),
      this.git.tryRun(['for-each-ref', '--format=%(objectname) %(refname)']),
      this.git.tryRun(['rev-parse', '-q', '--verify', 'HEAD']),
    ]);
    this.update('changes', status ?? '');
    this.update('history', `${refs ?? ''}|${head ?? ''}`);
  }

  private update(type: LiveEvent['type'], sig: string) {
    const prev = this.last[type];
    this.last[type] = sig;
    if (prev !== null && prev !== sig) this.events$.next({ type });
  }
}
