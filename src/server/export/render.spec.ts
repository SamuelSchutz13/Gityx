import { buildReport, isSensitive } from './sensitive';
import { renderHtml } from './render-html';
import { renderMarkdown } from './render-md';
import type { FileDiff } from '../shared/types';

const file = (path: string, ...texts: string[]): FileDiff => ({
  path, status: 'modified', staged: false, binary: false, truncated: false, additions: texts.length, deletions: 0,
  hunks: [{ header: '@@ -0,0 +1 @@', lines: texts.map((text, i) => ({ kind: 'add' as const, oldNo: null, newNo: i + 1, text })) }],
});
const meta = { repo: 'demo', branch: 'main', head: 'abc1234' };

describe('isSensitive', () => {
  it('flags sensitive names', () => {
    expect(isSensitive('.env', '')).toBe(true);
    expect(isSensitive('app/.env.local', '')).toBe(true);
    expect(isSensitive('config/id_rsa', '')).toBe(true);
    expect(isSensitive('certs/server.pem', '')).toBe(true);
    expect(isSensitive('aws/credentials', '')).toBe(true);
  });
  it('flags sensitive content', () => {
    expect(isSensitive('src/a.ts', 'const k = "AKIAABCDEFGHIJKLMNOP"')).toBe(true);
    expect(isSensitive('src/a.ts', `t = "ghp_${'a'.repeat(36)}"`)).toBe(true);
    expect(isSensitive('src/a.ts', 'password = "hunter2"')).toBe(true);
    expect(isSensitive('src/a.ts', '-----BEGIN RSA PRIVATE KEY-----')).toBe(true);
  });
  it('lets ordinary files through', () => {
    expect(isSensitive('src/a.ts', 'const a = 1;')).toBe(false);
    expect(isSensitive('src/environment.ts', '')).toBe(false);
  });
});

describe('buildReport', () => {
  it('omits sensitive content unless asked', () => {
    const files = [file('.env', 'SECRET=1'), file('src/a.ts', 'ok')];
    const r = buildReport(meta, files, null, false);
    expect(r.files[0]).toMatchObject({ path: '.env', omitted: true, hunks: [], additions: 1 });
    expect(r.files[1]).toMatchObject({ path: 'src/a.ts', omitted: false });
    expect(buildReport(meta, files, null, true).files[0]).toMatchObject({ omitted: false });
    expect(r).toMatchObject({ repo: 'demo', branch: 'main', head: 'abc1234', tests: null });
  });
});

describe('renderers', () => {
  const r = buildReport(meta, [file('x<y>.html', '<script>alert(1)</script>'), file('.env', 'A=1')], null, false);

  it('escapes all repository content in HTML and blocks the network', () => {
    const html = renderHtml(r);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('x&lt;y&gt;.html');
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain(`default-src 'none'`);
    expect(html).toContain('<details');
    expect(html).toContain('Conteúdo omitido');
  });

  it('renders markdown with diff fences', () => {
    const md = renderMarkdown(r);
    expect(md).toContain('# Gityx: demo');
    expect(md).toContain('```diff');
    expect(md).toContain('+<script>alert(1)</script>');
    expect(md).toContain('Conteúdo omitido');
  });
});
