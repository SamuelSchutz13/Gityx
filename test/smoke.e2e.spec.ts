import { execSync, spawn, ChildProcess } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { req } from './helpers/http';
import { makeRepo, TempRepo } from './helpers/temp-repo';

const root = join(__dirname, '..');
// Namespace URIs and library console-message links are strings in the bundle, not requests.
const ALLOWED = [/^http:\/\/www\.w3\.org\//, /^https:\/\/react\.dev\/errors\//, /^https:\/\/github\.com\/highlightjs\/highlight\.js\/(issues|wiki)\//];

describe('packaged CLI', () => {
  let repo: TempRepo;
  let child: ChildProcess;
  let url: string;

  beforeAll(async () => {
    execSync('npm run build', { cwd: root, stdio: 'ignore', env: { ...process.env, NODE_ENV: 'production' } });
    repo = await makeRepo();
    repo.write('a.txt', '1\n');
    await repo.commit('one');
    child = spawn(process.execPath, [join(root, 'dist/server/main.js'), repo.dir, '--open=false']);
    url = await new Promise<string>((resolve, reject) => {
      let out = '';
      child.stdout!.on('data', (d) => {
        out += d;
        const m = /http:\/\/127\.0\.0\.1:\d+\/\?t=\S+/.exec(out);
        if (m) resolve(m[0]);
      });
      child.on('exit', (code) => reject(new Error(`exited ${code}: ${out}`)));
    });
  }, 180000);

  afterAll(() => {
    child?.kill();
    repo?.cleanup();
  });

  it('serves the app behind the token', async () => {
    const base = new URL(url).origin;
    const login = await req(base, new URL(url).pathname + new URL(url).search);
    expect(login.status).toBe(302);
    const cookie = String(login.headers['set-cookie']).split(';')[0];
    const page = await req(base, '/', { headers: { Cookie: cookie } });
    expect(page.status).toBe(200);
    expect(page.text).toContain('<div id="root">');
    const dash = await req(base, '/api/dashboard', { headers: { Cookie: cookie } });
    expect(dash.status).toBe(200);
    expect(dash.body.recent[0].subject).toBe('one');
    expect((await req(base, '/assets/does-not-exist.js')).status).toBe(401);
  });

  // Windows has no SIGINT delivery to a child process; this runs on Linux/macOS CI.
  (process.platform === 'win32' ? it.skip : it)('kills running tests on Ctrl+C', async () => {
    const r = await makeRepo();
    const script = 'console.log(process.pid); setInterval(() => {}, 1000)';
    require('node:fs').writeFileSync(join(r.dir, '.gityx.json'), JSON.stringify({ tests: { projects: [{ name: 'slow', kind: 'command', dir: '.', command: [process.execPath, '-e', script] }] } }));
    const cli = spawn(process.execPath, [join(root, 'dist/server/main.js'), r.dir, '--open=false']);
    const link = await new Promise<string>((resolve) => cli.stdout!.on('data', (d) => {
      const m = /http:\/\/127\.0\.0\.1:\d+\/\?t=\S+/.exec(String(d));
      if (m) resolve(m[0]);
    }));
    const base = new URL(link).origin;
    const cookie = String((await req(base, new URL(link).pathname + new URL(link).search)).headers['set-cookie']).split(';')[0];
    await req(base, '/api/tests/run', { method: 'POST', headers: { Cookie: cookie, Origin: base }, body: { confirm: true } });
    let pid = 0;
    for (let i = 0; i < 50 && !pid; i++) {
      await new Promise((res) => setTimeout(res, 100));
      pid = Number((await req(base, '/api/tests/run', { headers: { Cookie: cookie } })).body?.projects?.[0]?.log?.trim()) || 0;
    }
    expect(pid).toBeGreaterThan(0);
    cli.kill('SIGINT');
    await new Promise((res) => cli.on('exit', res));
    await new Promise((res) => setTimeout(res, 300));
    expect(() => process.kill(pid, 0)).toThrow();
    r.cleanup();
  }, 30000);

  it('prints a friendly error outside a repository', () => {
    let msg = '';
    try {
      execSync(`"${process.execPath}" dist/server/main.js "${require('node:os').tmpdir()}" --open=false`, { cwd: root, stdio: 'pipe' });
    } catch (e: any) {
      msg = String(e.stderr);
      expect(e.status).toBe(1);
    }
    expect(msg.trim()).toBe('Gityx: esta pasta não está dentro de um repositório Git.');
  });

  it('ships no external network references in the web build', () => {
    const dir = join(root, 'dist/web');
    const files = [join(dir, 'index.html'), ...readdirSync(join(dir, 'assets')).map((f) => join(dir, 'assets', f))];
    for (const f of files) {
      const text = readFileSync(f, 'utf8').replace(/\/\*![\s\S]*?\*\//g, '');
      expect(text).not.toMatch(/fonts\.googleapis|fonts\.gstatic|cdn\.|fetch\(["'`]https?:/);
      const urls = text.match(/https?:\/\/[^\s"'`)]+/g) ?? [];
      expect(urls.filter((u) => !ALLOWED.some((a) => a.test(u)))).toEqual([]);
    }
  });
});
