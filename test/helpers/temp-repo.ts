import { execFile } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export interface TempRepo {
  dir: string;
  git(...args: string[]): Promise<string>;
  write(p: string, c: string | Buffer): void;
  commit(msg: string): Promise<string>;
  cleanup(): void;
}

export async function makeRepo(): Promise<TempRepo> {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'gityx-')));
  const git = async (...args: string[]) => (await exec('git', args, { cwd: dir })).stdout;
  await git('init', '-q', '-b', 'main');
  await git('config', 'user.name', 'Ana');
  await git('config', 'user.email', 'ana@example.com');
  await git('config', 'core.autocrlf', 'false');
  return {
    dir,
    git,
    write(p, c) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), c);
    },
    async commit(msg) {
      await git('add', '-A');
      await git('commit', '-q', '-m', msg);
      return (await git('rev-parse', 'HEAD')).trim();
    },
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

export function emptyDir(): string {
  return realpathSync(mkdtempSync(join(tmpdir(), 'gityx-norepo-')));
}
