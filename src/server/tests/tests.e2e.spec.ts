import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AddressInfo } from 'node:net';
import { createApp } from '../main';
import { req } from '../../../test/helpers/http';
import { makeRepo } from '../../../test/helpers/temp-repo';

it('runs tests over HTTP with confirmation and shows them on the dashboard', async () => {
  const repo = await makeRepo();
  const command = [process.execPath, '-e', ''];
  writeFileSync(join(repo.dir, '.gityx.json'), JSON.stringify({ tests: { projects: [{ name: 'ok', kind: 'command', dir: '.', command }] } }));
  const ctx = await createApp(repo.dir, 0);
  try {
    const base = `http://127.0.0.1:${(ctx.app.getHttpServer().address() as AddressInfo).port}`;
    const headers = { Cookie: ctx.cookie, Origin: base };
    const get = (p: string) => req(base, p, { headers });
    const post = (p: string, body: unknown) => req(base, p, { method: 'POST', headers, body });

    expect((await get('/api/tests/projects')).body).toEqual([{ name: 'ok', kind: 'command', dir: '.', command }]);
    const first = await post('/api/tests/run', {});
    expect(first.status).toBe(409);
    expect(first.body).toMatchObject({ needsConfirmation: true });
    expect((await post('/api/tests/run', { projects: 'nope' })).status).toBe(400);
    expect((await post('/api/tests/run', { confirm: true })).status).toBe(202);
    for (let i = 0; i < 50 && (await get('/api/tests/run')).body.status === 'running'; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    expect((await get('/api/dashboard')).body.lastTest).toMatchObject({ status: 'passed', passed: 1 });
  } finally {
    await ctx.app.close();
    repo.cleanup();
  }
});
