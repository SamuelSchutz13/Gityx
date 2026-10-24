import { LiveEvent, LiveService } from './live.service';
import { GitService } from '../git/git.service';
import { makeRepo } from '../../../test/helpers/temp-repo';

describe('LiveService', () => {
  it('emits changes and history only when they change', async () => {
    const repo = await makeRepo();
    repo.write('a.txt', '1\n');
    await repo.commit('one');
    const live = new LiveService(new GitService(repo.dir));
    const seen: LiveEvent['type'][] = [];
    live.events$.subscribe((e) => seen.push(e.type));

    await live.check();
    await live.check();
    expect(seen).toEqual([]);

    repo.write('a.txt', '2\n');
    await live.check();
    expect(seen).toEqual(['changes']);

    await repo.commit('two');
    await live.check();
    expect(seen).toEqual(['changes', 'changes', 'history']);
    repo.cleanup();
  });

  it('starts and stops the watcher and polling', async () => {
    const repo = await makeRepo();
    const live = new LiveService(new GitService(repo.dir));
    await live.onModuleInit();
    live.onModuleDestroy();
    repo.cleanup();
  });
});
