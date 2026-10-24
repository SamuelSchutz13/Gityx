import { AddressInfo } from 'node:net';
import { createApp } from '../main';
import { req } from '../../../test/helpers/http';
import { makeRepo } from '../../../test/helpers/temp-repo';

it('downloads reports as attachments', async () => {
  const repo = await makeRepo();
  repo.write('a.txt', '1\n');
  await repo.commit('one');
  repo.write('a.txt', '2\n');
  const ctx = await createApp(repo.dir, 0);
  try {
    const base = `http://127.0.0.1:${(ctx.app.getHttpServer().address() as AddressInfo).port}`;
    const get = (p: string) => req(base, p, { headers: { Cookie: ctx.cookie } });
    const md = await get('/api/export?format=md');
    expect(md.status).toBe(200);
    expect(md.headers['content-disposition']).toMatch(/^attachment; filename="gityx-.+-\d{8}-\d{4}\.md"$/);
    expect(md.text).toContain('a.txt');
    const json = await get('/api/export?format=json');
    expect(json.body.files[0].path).toBe('a.txt');
    expect((await get('/api/export?format=html')).headers['content-type']).toMatch(/^text\/html/);
    expect((await get('/api/export?format=pdf')).status).toBe(400);
  } finally {
    await ctx.app.close();
    repo.cleanup();
  }
});
