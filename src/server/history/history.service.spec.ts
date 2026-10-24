import request from 'supertest';
import { AddressInfo } from 'node:net';
import { HistoryService } from './history.service';
import { GitService } from '../git/git.service';
import { createApp } from '../main';
import { makeRepo, TempRepo } from '../../../test/helpers/temp-repo';

describe('HistoryService', () => {
  let repo: TempRepo;
  let svc: HistoryService;
  let shas: Record<string, string>;

  beforeAll(async () => {
    repo = await makeRepo();
    repo.write('a.txt', '1\n');
    const c1 = await repo.commit('one');
    await repo.git('checkout', '-q', '-b', 'feature');
    repo.write('b.txt', 'b\n');
    await repo.git('add', '-A');
    await repo.git('-c', 'user.name=Bia', '-c', 'user.email=bia@example.com', 'commit', '-q', '-m', 'feature b');
    const fb = (await repo.git('rev-parse', 'HEAD')).trim();
    await repo.git('checkout', '-q', 'main');
    repo.write('a.txt', '1\n2\n');
    const c2 = await repo.commit('two');
    await repo.git('merge', '-q', '--no-ff', '-m', 'merge feature', 'feature');
    const m = (await repo.git('rev-parse', 'HEAD')).trim();
    shas = { c1, fb, c2, m };
    svc = new HistoryService(new GitService(repo.dir));
  });
  afterAll(() => repo.cleanup());

  it('pages newest first', async () => {
    const first = await svc.page({ skip: 0, limit: 2 });
    expect(first.map((c) => c.subject)).toEqual(['merge feature', 'two']);
    expect(first[0].parents).toHaveLength(2);
    const rest = await svc.page({ skip: 2, limit: 10 });
    expect(rest).toHaveLength(2);
  });

  it('filters by author', async () => {
    expect((await svc.page({ skip: 0, limit: 10, author: 'Bia' })).map((c) => c.sha)).toEqual([shas.fb]);
  });

  it('filters by path', async () => {
    const subjects = (await svc.page({ skip: 0, limit: 10, path: 'a.txt' })).map((c) => c.subject);
    expect(subjects).toEqual(['two', 'one']);
  });

  it('returns commit detail with files', async () => {
    const d = await svc.detail(shas.c2);
    expect(d.subject).toBe('two');
    expect(d.files[0].path).toBe('a.txt');
    expect(d.files[0].additions).toBe(1);
  });

  it('diffs a merge against its first parent', async () => {
    const d = await svc.detail(shas.m);
    expect(d.files.map((f) => f.path)).toEqual(['b.txt']);
  });

  it('returns [] for an empty repo', async () => {
    const empty = await makeRepo();
    expect(await new HistoryService(new GitService(empty.dir)).page({ skip: 0, limit: 10 })).toEqual([]);
    empty.cleanup();
  });
});

describe('history HTTP', () => {
  it('validates sha, dates and limits', async () => {
    const repo = await makeRepo();
    repo.write('a.txt', '1\n');
    await repo.commit('one');
    const ctx = await createApp(repo.dir, 0);
    const base = `http://127.0.0.1:${(ctx.app.getHttpServer().address() as AddressInfo).port}`;
    const get = (p: string) => request(base).get(p).set('Cookie', `gityx=${ctx.token}`);
    await get('/api/commits/zzz').expect(400);
    await get(`/api/commits/${'0'.repeat(40)}`).expect(404);
    await get('/api/history?since=yesterday').expect(400);
    await get('/api/history?limit=501').expect(400);
    await get('/api/history?path=../x').expect(400);
    expect((await get('/api/history').expect(200)).body).toHaveLength(1);
    await ctx.app.close();
    repo.cleanup();
  });
});
