import { GitService } from './git.service';
import { makeRepo } from '../../../test/helpers/temp-repo';

describe('GitService', () => {
  it('runs git in the repo', async () => {
    const repo = await makeRepo();
    expect(await new GitService(repo.dir).run(['rev-parse', '--is-inside-work-tree'])).toBe('true\n');
    repo.cleanup();
  });
  it('tryRun returns null on failure', async () => {
    const repo = await makeRepo();
    expect(await new GitService(repo.dir).tryRun(['log'])).toBeNull();
    repo.cleanup();
  });
});
