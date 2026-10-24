import { DashboardService } from './dashboard.service';
import { GitService } from '../git/git.service';
import { ChangesService } from '../changes/changes.service';
import { HistoryService } from '../history/history.service';
import { makeRepo } from '../../../test/helpers/temp-repo';

function service(dir: string, lastTest = () => null) {
  const git = new GitService(dir);
  return new DashboardService(git, new ChangesService(git), new HistoryService(git), lastTest);
}

describe('DashboardService', () => {
  it('summarizes the repository', async () => {
    const repo = await makeRepo();
    repo.write('a.txt', '1\n');
    await repo.commit('one');
    repo.write('a.txt', '1\n2\n');
    await repo.commit('two');
    repo.write('a.txt', '1\n2\n3\n');
    const d = await service(repo.dir).get();
    expect(d.branch).toBe('main');
    expect(d.upstream).toBeNull();
    expect(d.pending).toEqual({ files: 1, additions: 1, deletions: 0 });
    expect(d.recent).toHaveLength(2);
    expect(d.activity).toHaveLength(84);
    expect(d.activity[83].count).toBe(2);
    expect(d.authors).toEqual([{ name: 'Ana', count: 2 }]);
    expect(d.branches).toBe(1);
    expect(d.stashes).toBe(0);
    expect(d.lastTest).toBeNull();
    repo.cleanup();
  });

  it('reads ahead/behind and detached HEAD', async () => {
    const repo = await makeRepo();
    repo.write('a.txt', '1\n');
    const first = await repo.commit('one');
    await repo.git('branch', 'base');
    await repo.git('branch', '--set-upstream-to=base');
    repo.write('a.txt', '2\n');
    await repo.commit('two');
    const d = await service(repo.dir).get();
    expect(d).toMatchObject({ upstream: 'base', ahead: 1, behind: 0, branches: 2 });
    await repo.git('checkout', '-q', first);
    expect((await service(repo.dir).get()).branch).toBeNull();
    repo.cleanup();
  });

  it('works on an empty repo', async () => {
    const repo = await makeRepo();
    const d = await service(repo.dir).get();
    expect(d).toMatchObject({ branch: 'main', recent: [], authors: [], branches: 0 });
    expect(d.activity.every((a) => a.count === 0)).toBe(true);
    repo.cleanup();
  });
});
