import { ChangesService } from './changes.service';
import { GitService } from '../git/git.service';
import { join } from 'node:path';
import { emptyDir, makeRepo } from '../../../test/helpers/temp-repo';

describe('ChangesService', () => {
  it('lists staged, unstaged and untracked files', async () => {
    const repo = await makeRepo();
    repo.write('a.txt', 'one\n');
    repo.write('b.txt', 'b\n');
    await repo.commit('init');
    repo.write('a.txt', 'one\ntwo\n');
    await repo.git('add', 'a.txt');
    repo.write('b.txt', 'B\n');
    repo.write('-rf ação.txt', 'x\ny\n');
    const files = await new ChangesService(new GitService(repo.dir)).list();
    expect(files.map((f) => [f.path, f.status, f.staged])).toEqual([
      ['a.txt', 'modified', true],
      ['b.txt', 'modified', false],
      ['-rf ação.txt', 'untracked', false],
    ]);
    expect(files[2].hunks[0].lines).toHaveLength(2);
    expect(files[2].additions).toBe(2);
    repo.cleanup();
  });

  it('works in a repo with no commits', async () => {
    const repo = await makeRepo();
    repo.write('new.txt', 'hi\n');
    repo.write('staged.txt', 'st\n');
    await repo.git('add', 'staged.txt');
    const files = await new ChangesService(new GitService(repo.dir)).list();
    expect(files.map((f) => [f.path, f.status])).toEqual([['staged.txt', 'added'], ['new.txt', 'untracked']]);
    repo.cleanup();
  });

  it('keeps the exact path of tracked files with spaces', async () => {
    const repo = await makeRepo();
    repo.write('a b.txt', '1\n');
    await repo.commit('init');
    repo.write('a b.txt', '2\n');
    await repo.git('add', 'a b.txt');
    repo.write('c d.txt', 'new\n');
    await repo.git('add', 'c d.txt');
    const files = await new ChangesService(new GitService(repo.dir)).list();
    expect(files.map((f) => f.path)).toEqual(['a b.txt', 'c d.txt']);
    repo.cleanup();
  });

  it('survives an untracked file that disappears before it is read', async () => {
    const repo = await makeRepo();
    const git = new GitService(repo.dir);
    const real = git.run.bind(git);
    git.run = async (args) => (args[0] === 'ls-files' ? 'gone.txt\0' : real(args));
    const files = await new ChangesService(git).list();
    expect(files).toEqual([expect.objectContaining({ path: 'gone.txt', status: 'untracked', hunks: [] })]);
    repo.cleanup();
  });

  it('shows an untracked symlink as its target text, never the target content', async () => {
    const repo = await makeRepo();
    const { symlinkSync, writeFileSync } = await import('node:fs');
    const outside = join(emptyDir(), 'secret.txt');
    writeFileSync(outside, 'TOP SECRET\n');
    try {
      symlinkSync(outside, join(repo.dir, 'link'));
    } catch {
      repo.cleanup();
      return; // symlinks need extra privileges on Windows
    }
    const [f] = await new ChangesService(new GitService(repo.dir)).list();
    expect(f.hunks[0].lines.map((l) => l.text)).toEqual([outside]);
    repo.cleanup();
  });

  it('marks huge and binary untracked files', async () => {
    const repo = await makeRepo();
    repo.write('big.txt', 'x'.repeat(1.5 * 1024 * 1024));
    repo.write('bin.dat', Buffer.from([1, 0, 2]));
    const files = await new ChangesService(new GitService(repo.dir)).list();
    expect(files.find((f) => f.path === 'big.txt')).toMatchObject({ truncated: true, hunks: [] });
    expect(files.find((f) => f.path === 'bin.dat')).toMatchObject({ binary: true, hunks: [] });
    repo.cleanup();
  });

  it('truncates files over 5000 lines', async () => {
    const repo = await makeRepo();
    repo.write('long.txt', 'l\n'.repeat(6000));
    const [f] = await new ChangesService(new GitService(repo.dir)).list();
    expect(f.truncated).toBe(true);
    expect(f.hunks[0].lines).toHaveLength(5000);
    repo.cleanup();
  });
});
