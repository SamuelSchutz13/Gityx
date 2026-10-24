import type { Report } from './sensitive';
import { summary } from './render-md';

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const CSS = `
:root{--bg:#fff;--fg:#18181b;--muted:#71717a;--border:#e4e4e7;--add:#dcfce7;--del:#fee2e2;--card:#fafafa}
@media (prefers-color-scheme:dark){:root{--bg:#09090b;--fg:#fafafa;--muted:#a1a1aa;--border:#27272a;--add:#052e16;--del:#450a0a;--card:#18181b}}
*{box-sizing:border-box}body{margin:0 auto;max-width:1100px;padding:24px 16px;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,sans-serif}
h1{font-size:20px;margin:0 0 4px}.muted{color:var(--muted)}details{border:1px solid var(--border);border-radius:8px;margin:12px 0;background:var(--card)}
summary{cursor:pointer;padding:8px 12px;font-family:ui-monospace,monospace}.diff{overflow-x:auto;border-top:1px solid var(--border)}
table{border-collapse:collapse;font:12px/1.45 ui-monospace,monospace;min-width:100%}td{padding:0 8px;white-space:pre;vertical-align:top}
td.n{color:var(--muted);text-align:right;user-select:none;width:1%}tr.add{background:var(--add)}tr.del{background:var(--del)}tr.h td{color:var(--muted);padding:4px 8px}
.note{padding:8px 12px;color:var(--muted)}@media print{details{break-inside:avoid}}`;

export function renderHtml(r: Report): string {
  const e = escapeHtml;
  const files = r.files
    .map((f) => {
      let body: string;
      if (f.omitted) body = '<div class="note">Conteúdo omitido: arquivo potencialmente sensível.</div>';
      else if (f.binary) body = '<div class="note">Arquivo binário.</div>';
      else {
        const rows = f.hunks
          .map((h) => `<tr class="h"><td colspan="3">${e(h.header)}</td></tr>` +
            h.lines.map((l) => `<tr class="${l.kind}"><td class="n">${l.oldNo ?? ''}</td><td class="n">${l.newNo ?? ''}</td><td>${l.kind === 'add' ? '+' : l.kind === 'del' ? '-' : ' '}${e(l.text)}</td></tr>`).join(''))
          .join('');
        body = `<div class="diff"><table>${rows}</table></div>${f.truncated ? '<div class="note">Diff truncado.</div>' : ''}`;
      }
      return `<details><summary>${e(f.path)} <span class="muted">${e(f.status)} · +${f.additions} −${f.deletions}</span></summary>${body}</details>`;
    })
    .join('\n');
  const tests = r.tests
    ? `<h2>Testes</h2><ul>${r.tests.projects.map((p) => `<li>${e(p.project.name)}: ${e(p.status)} (código ${p.exitCode ?? '-'})</li>`).join('')}</ul>`
    : '';
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gityx: ${e(r.repo)}</title><style>${CSS}</style></head>
<body><h1>Gityx: ${e(r.repo)}</h1>
<div class="muted">Branch ${e(r.branch ?? '(HEAD destacado)')} · commit ${e(r.head ?? '(sem commits)')} · ${e(r.generatedAt)}</div>
<p>${e(summary(r))}</p>
${files}
${tests}
</body></html>
`;
}
