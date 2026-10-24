import { createServer, AddressInfo, Server } from 'node:net';
import request from 'supertest';
import { createApp } from '../main';
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
  const cookie = () => `gityx=${ctx.token}`;

  it('listens on loopback only', () => {
    expect((ctx.app.getHttpServer().address() as AddressInfo).address).toBe('127.0.0.1');
    expect(ctx.url).toBe(`${base}/?t=${ctx.token}`);
  });
  it('rejects a foreign Host with 421', async () => {
    await request(base).get('/api/health').set('Host', 'evil.example:80').set('Cookie', cookie()).expect(421);
  });
  it('rejects a foreign Origin with 403', async () => {
    await request(base).get('/api/health').set('Origin', 'http://evil.example').set('Cookie', cookie()).expect(403);
  });
  it('rejects a POST without Origin with 403', async () => {
    await request(base).post('/api/health').set('Cookie', cookie()).expect(403);
  });
  it('rejects requests without the cookie', async () => {
    const res = await request(base).get('/api/health').expect(401);
    expect(res.text).toContain('Abra a URL impressa no terminal.');
  });
  it('rejects a wrong token', async () => {
    await request(base).get('/?t=wrong').expect(401);
  });
  it('exchanges the token for a strict HttpOnly cookie', async () => {
    const res = await request(base).get(`/?t=${ctx.token}`).expect(302);
    expect(res.headers.location).toBe('/');
    const set = String(res.headers['set-cookie']);
    expect(set).toContain('HttpOnly');
    expect(set).toContain('SameSite=Strict');
  });
  it('serves the API with the cookie and security headers', async () => {
    const res = await request(base).get('/api/health').set('Cookie', cookie()).expect(200);
    expect(res.body).toEqual({ ok: true });
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
  });
  it('accepts localhost as host', async () => {
    await request(base).get('/api/health').set('Host', host.replace('127.0.0.1', 'localhost')).set('Cookie', cookie()).expect(200);
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
