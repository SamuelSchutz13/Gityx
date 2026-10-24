import { StatsService } from './stats.service';
import { GitService } from '../git/git.service';
import { makeRepo } from '../../../test/helpers/temp-repo';

describe('StatsService', () => {
  it('summarizes history, languages and hot files', async () => {
    const repo = await makeRepo();
    repo.write('src/a.ts', '1\n');
    repo.write('src/b.ts', '1\n');
    repo.write('README.md', '#\n');
    await repo.commit('one');
    await repo.git('tag', 'v1.0.0');
    repo.write('src/a.ts', '2\n');
    await repo.commit('two');
    repo.write('src/a.ts', '3\n');
    await repo.git('add', '-A');
    await repo.git('-c', 'user.name=Bia', '-c', 'user.email=bia@example.com', 'commit', '-q', '-m', 'three');

    const s = await new StatsService(new GitService(repo.dir)).get();
    expect(s.totalCommits).toBe(3);
    expect(s.contributors).toBe(2);
    expect(s.lastTag).toBe('v1.0.0');
    expect(s.trackedFiles).toBe(3);
    expect(s.firstCommit).toBeGreaterThan(0);
    expect(s.languages).toEqual([{ name: 'ts', files: 2 }, { name: 'md', files: 1 }]);
    expect(s.hotFiles[0]).toEqual({ path: 'src/a.ts', changes: 3 });
    expect(s.weekly).toHaveLength(26);
    expect(s.weekly[25].count).toBe(3);
    expect(s.punchcard).toHaveLength(7);
    expect(s.punchcard.every((d) => d.length === 24)).toBe(true);
    expect(s.punchcard.flat().reduce((a, b) => a + b, 0)).toBe(3);
    repo.cleanup();
  });

  it('works on an empty repo', async () => {
    const repo = await makeRepo();
    const s = await new StatsService(new GitService(repo.dir)).get();
    expect(s).toMatchObject({ totalCommits: 0, contributors: 0, lastTag: null, firstCommit: null, trackedFiles: 0, languages: [], hotFiles: [] });
    expect(s.weekly.every((w) => w.count === 0)).toBe(true);
    repo.cleanup();
  });

  it('folds languages beyond the top 7 into "__other__"', async () => {
    const repo = await makeRepo();
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].forEach((ext, i) => repo.write(`f${i}.${ext}`, 'x'));
    repo.write('Makefile', 'x');
    await repo.commit('many');
    const s = await new StatsService(new GitService(repo.dir)).get();
    expect(s.languages).toHaveLength(8);
    expect(s.languages[7]).toEqual({ name: '__other__', files: 3 });
    repo.cleanup();
  });
});
