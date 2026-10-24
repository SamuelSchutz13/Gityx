import { createServer, AddressInfo, Server } from 'node:net';
import { createApp } from '../main';
import { req } from '../../../test/helpers/http';
import { makeRepo, TempRepo } from '../../../test/helpers/temp-repo';

describe('server security', () => {
  let repo: TempRepo;
  let ctx: Awaited<ReturnType<typeof createApp>>;
  let base: string;
  let host: string;

  beforeAll(async () => {
    repo = await makeRepo();
    ctx = await createApp(repo.dir, 0);
    const port = (ctx.app.getHttpServer().address() as AddressInfo).port;
    base = `http://127.0.0.1:${port}`;
    host = `127.0.0.1:${port}`;
  });
  afterAll(async () => {
    await ctx.app.close();
    repo.cleanup();
  });
  const cookie = () => ctx.cookie;

  it('listens on loopback only', () => {
    expect((ctx.app.getHttpServer().address() as AddressInfo).address).toBe('127.0.0.1');
    expect(ctx.url).toBe(`${base}/?t=${ctx.token}`);
  });
  it('rejects a foreign Host with 421', async () => {
    expect((await req(base, '/api/health', { headers: { Host: 'evil.example:80', Cookie: cookie() } })).status).toBe(421);
  });
  it('rejects a foreign Origin with 403', async () => {
    expect((await req(base, '/api/health', { headers: { Origin: 'http://evil.example', Cookie: cookie() } })).status).toBe(403);
  });
  it('rejects a POST without Origin with 403', async () => {
    expect((await req(base, '/api/health', { method: 'POST', headers: { Cookie: cookie() } })).status).toBe(403);
  });
  it('rejects requests without the cookie', async () => {
    const res = await req(base, '/api/health');
    expect(res.status).toBe(401);
    expect(res.text).toContain('Abra a URL impressa no terminal.');
  });
  it('rejects a wrong token', async () => {
    expect((await req(base, '/?t=wrong')).status).toBe(401);
  });
  it('exchanges the token for a strict HttpOnly cookie', async () => {
    const res = await req(base, `/?t=${ctx.token}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    const set = String(res.headers['set-cookie']);
    expect(set).toContain('HttpOnly');
    expect(set).toContain('SameSite=Strict');
    // cookies ignore ports, so each instance needs its own name
    expect(set.startsWith(`gityx_${host.split(':')[1]}=`)).toBe(true);
    expect(ctx.cookie).toBe(set.split(';')[0]);
  });
  it('serves the API with the cookie and security headers', async () => {
    const res = await req(base, '/api/health', { headers: { Cookie: cookie() } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    // GitHub photos are opt-in in the UI; only images may come from there, never scripts or fetches
    // (directive tokens, not exact text: local proxies such as AdGuard append their own hosts)
    const csp = String(res.headers['content-security-policy']);
    const directive = (name: string) => (csp.split(';').map((d) => d.trim().split(/\s+/)).find((d) => d[0] === name) ?? []).slice(1);
    expect(directive('img-src')).toEqual(expect.arrayContaining(["'self'", 'https://avatars.githubusercontent.com']));
    expect(directive('connect-src')).not.toContain('https://avatars.githubusercontent.com');
    expect(directive('default-src')).not.toContain('https://avatars.githubusercontent.com');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
  });
  it('serves repository info for the header', async () => {
    const res = await req(base, '/api/info', { headers: { Cookie: cookie() } });
    expect(res.body).toEqual({ repo: require('node:path').basename(repo.dir) });
  });
  it('accepts localhost as host', async () => {
    const res = await req(base, '/api/health', { headers: { Host: host.replace('127.0.0.1', 'localhost'), Cookie: cookie() } });
    expect(res.status).toBe(200);
  });
});

describe('createApp port in use', () => {
  it('rejects with EADDRINUSE', async () => {
    const repo = await makeRepo();
    const blocker: Server = createServer();
    await new Promise<void>((r) => blocker.listen(0, '127.0.0.1', r));
    const port = (blocker.address() as AddressInfo).port;
    await expect(createApp(repo.dir, port)).rejects.toMatchObject({ code: 'EADDRINUSE' });
    blocker.close();
    repo.cleanup();
  });
});
