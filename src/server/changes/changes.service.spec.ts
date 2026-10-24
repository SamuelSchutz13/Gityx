import { ChangesService } from './changes.service';
import { GitService } from '../git/git.service';
import { makeRepo } from '../../../test/helpers/temp-repo';

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
