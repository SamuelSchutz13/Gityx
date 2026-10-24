import type { Report } from './sensitive';

const SIGN = { add: '+', del: '-', context: ' ' } as const;

export function summary(r: Report): string {
  const add = r.files.reduce((s, f) => s + f.additions, 0);
  const del = r.files.reduce((s, f) => s + f.deletions, 0);
  const tests = r.tests ? ` · testes: ${r.tests.status}` : ' · testes não executados';
  return `${r.files.length} arquivos alterados · ${add} adições · ${del} remoções${tests}`;
}

export function renderMarkdown(r: Report): string {
  const out = [
    `# Gityx: ${r.repo}`,
    '',
    `- Branch: ${r.branch ?? '(HEAD destacado)'}`,
    `- Commit base: ${r.head ?? '(sem commits)'}`,
    `- Gerado em: ${r.generatedAt}`,
    '',
    summary(r),
    '',
  ];
  for (const f of r.files) {
    out.push(`## ${f.path}`, '', `${f.status}${f.staged ? ' (staged)' : ''} · +${f.additions} −${f.deletions}`, '');
    if (f.omitted) out.push('> Conteúdo omitido: arquivo potencialmente sensível.', '');
    else if (f.binary) out.push('> Arquivo binário.', '');
    else {
      const body = f.hunks.flatMap((h) => [h.header, ...h.lines.map((l) => SIGN[l.kind] + l.text)]).join('\n');
      const longest = Math.max(2, ...(body.match(/`+/g) ?? []).map((m) => m.length));
      const fence = '`'.repeat(longest + 1);
      out.push(fence + 'diff', body, fence, '');
      if (f.truncated) out.push('> Diff truncado.', '');
    }
  }
  if (r.tests) {
    out.push('## Testes', '');
    for (const p of r.tests.projects) {
      out.push(`- ${p.project.name}: ${p.status} (código de saída ${p.exitCode ?? '-'}, ${p.durationMs} ms)`);
      for (const c of p.cases ?? []) out.push(`  - ${c.status}: ${c.name}`);
    }
    out.push('');
  }
  return out.join('\n');
}
