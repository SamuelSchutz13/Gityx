import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export class GitService {
  constructor(readonly root: string) {}

  async run(args: string[], opts: { maxBuffer?: number } = {}): Promise<string> {
    const { stdout } = await exec('git', ['-c', 'core.quotePath=false', ...args], {
      cwd: this.root,
      // status/diff would otherwise refresh .git/index and race the user's own git add/commit.
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
      maxBuffer: opts.maxBuffer ?? 64 * 1024 * 1024,
      windowsHide: true,
    });
    return stdout;
  }

  async tryRun(args: string[]): Promise<string | null> {
    try {
      return await this.run(args);
    } catch {
      return null;
    }
  }
}
