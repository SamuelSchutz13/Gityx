import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip, Hint, KV, NodeCard, Section } from '@/components/kit';
import { BarChart, Donut, HBars, Punchcard } from '@/components/charts';
import { Avatar, TechIcon } from '@/components/avatars';
import { useState } from 'react';
import { useApi, useLive } from '../lib/api';
import { useT } from '../lib/i18n';
import { relativeTime, shortDate } from '../lib/format';
import type { Dashboard as Data, Framework, Stats } from '../../server/shared/types';

const CATEGORY: Record<Framework['category'], { label: string; stripe: string }> = {
  language: { label: 'Linguagens', stripe: 'border-l-info' },
  framework: { label: 'Frameworks', stripe: 'border-l-[#b083f0]' },
  data: { label: 'Dados', stripe: 'border-l-warning' },
  style: { label: 'Interface e estilo', stripe: 'border-l-success' },
  test: { label: 'Testes', stripe: 'border-l-success' },
  build: { label: 'Build', stripe: 'border-l-node-border' },
  infra: { label: 'Infraestrutura', stripe: 'border-l-node-border' },
};

const COMMIT_TYPE: Record<string, string> = {
  feat: 'Funcionalidades', fix: 'Correções', docs: 'Documentação', chore: 'Manutenção', refactor: 'Refatoração',
  test: 'Testes', style: 'Estilo', perf: 'Performance', ci: 'CI', build: 'Build', revert: 'Reversões', merge: 'Merges', other: 'Outros',
};

function Stack({ items }: { items: Framework[] }) {
  const t = useT();
  if (!items.length) return <p className="text-sm text-muted-foreground">{t('Nenhum manifesto reconhecido (package.json, go.mod, requirements.txt, Cargo.toml...).')}</p>;
  const groups = (Object.keys(CATEGORY) as Framework['category'][]).filter((c) => items.some((i) => i.category === c));
  return (
    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((c) => (
        <div key={c} className="min-w-0">
          <div className="mb-1.5 text-xs text-muted-foreground">{t(CATEGORY[c].label)}</div>
          <div className="flex flex-wrap gap-1.5">
            {items.filter((i) => i.category === c).map((i) => (
              <span key={i.name} title={t('Detectado em {f}', { f: i.source })} className={`inline-flex h-8 items-center gap-2 rounded-md border border-l-2 border-node-border bg-node pr-2.5 pl-2 text-[13px] ${CATEGORY[c].stripe}`}>
                <TechIcon name={i.name} className="size-4" />
                <span className="font-medium">{i.name}</span>
                {i.version && <span className="rounded bg-muted px-1 font-mono text-[11px] text-fg-2">v{i.version}</span>}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function heatLevel(count: number, max: number): number {
  if (!count) return 0;
  return Math.min(4, Math.ceil((count / max) * 4));
}

const PHOTOS_KEY = 'gityx.githubPhotos';

function readPhotos(): boolean {
  try {
    return localStorage.getItem(PHOTOS_KEY) === '1';
  } catch {
    return false;
  }
}

/** Opt-in: loading GitHub photos sends the authors' e-mails and your IP to GitHub, so it starts off. */
function PhotosToggle({ on, onChange }: { on: boolean; onChange(v: boolean): void }) {
  const t = useT();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={t('Busca as fotos em avatars.githubusercontent.com: o GitHub recebe os e-mails dos autores e o seu IP.')}
      onClick={() => {
        try {
          localStorage.setItem(PHOTOS_KEY, on ? '0' : '1');
        } catch {
          // storage blocked: the choice lasts for this page only
        }
        onChange(!on);
      }}
      className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
    >
      <span className={`relative h-3.5 w-6 rounded-full transition-colors ${on ? 'bg-info' : 'bg-muted ring-1 ring-border'}`}>
        <span className={`absolute top-0.5 size-2.5 rounded-full bg-white transition-all ${on ? 'left-3' : 'left-0.5'}`} />
      </span>
      {t('Fotos do GitHub')}
    </button>
  );
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 rounded-md border bg-surface ${className}`}>{children}</div>;
}

function Kpi({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</div>
      <div className="mt-0.5 truncate text-lg font-semibold">{value}</div>
      {sub && <div className="truncate text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Dashboard() {
  const t = useT();
  const [photos, setPhotos] = useState(readPhotos);
  const { data, error, reload } = useApi<Data>('/api/dashboard');
  const stats = useApi<Stats>('/api/stats');
  useLive((type) => {
    reload();
    if (type === 'history') stats.reload();
  });
  if (error) return <p className="text-sm text-destructive">{t('Não foi possível carregar o resumo: {e}', { e: error.message })}</p>;
  if (!data) return <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>;

  const max = Math.max(1, ...data.activity.map((a) => a.count));
  const total = data.activity.reduce((s, a) => s + a.count, 0);
  const head = data.recent[0];
  const last = data.lastTest;
  const s = stats.data;
  const langName = (n: string) => (n === '__other__' ? t('outros') : n === '__none__' ? t('sem extensão') : `.${n}`);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Hint>{t('Clique num commit da árvore para ver a mensagem, os arquivos e o diff.')}</Hint>

      <div className="grid gap-3 md:grid-cols-3">
        <NodeCard tone="info" title={<span className="font-mono">{data.branch ?? t('HEAD destacado')}</span>} subtitle={data.upstream ?? t('sem upstream')}>
          {data.upstream && <Chip tone="info" mono>{`↑${data.ahead} ↓${data.behind}`}</Chip>}
        </NodeCard>
        <NodeCard
          tone={data.pending.files ? 'warning' : 'success'}
          title={data.pending.files ? t('{n} arquivos alterados', { n: data.pending.files }) : t('Working tree limpo')}
          subtitle={t('mudanças pendentes')}
        >
          <div className="flex gap-1">
            <Chip tone="success" mono>+{data.pending.additions}</Chip>
            <Chip tone="danger" mono>−{data.pending.deletions}</Chip>
          </div>
        </NodeCard>
        <NodeCard
          tone={!last ? 'neutral' : last.status === 'passed' ? 'success' : 'danger'}
          title={!last ? t('Testes não executados') : last.status === 'passed' ? t('Testes aprovados') : t('Testes falharam')}
          subtitle={last ? t('{p} ok · {f} falhas', { p: last.passed, f: last.failed }) : t('nesta sessão')}
        >
          {last && <Chip tone={last.status === 'passed' ? 'success' : 'danger'} upper>{last.status === 'passed' ? t('passou') : t('falhou')}</Chip>}
        </NodeCard>
      </div>

      {s && (
        <Panel className="grid grid-cols-2 divide-border sm:grid-cols-4 xl:grid-cols-7 xl:divide-x">
          <Kpi label="Commits" value={s.totalCommits.toLocaleString()} />
          <Kpi label={t('Contribuidores')} value={s.contributors} />
          <Kpi label={t('Idade do repositório')} value={s.firstCommit ? relativeTime(s.firstCommit).replace(/^há |ago$/g, '').trim() : '—'} sub={s.firstCommit ? t('Primeiro commit {t}', { t: relativeTime(s.firstCommit) }) : undefined} />
          <Kpi label={t('Última tag')} value={<span className="font-mono text-base">{s.lastTag ?? t('nenhuma')}</span>} />
          <Kpi label={t('Arquivos rastreados')} value={s.trackedFiles.toLocaleString()} />
          <Kpi label={t('Linhas de código')} value={s.totalLines.toLocaleString()} sub={t('arquivos de texto rastreados')} />
          <Kpi label="Merges" value={s.merges.toLocaleString()} />
        </Panel>
      )}

      {s && (
        <Panel>
          <Section title={t('Stack do projeto')} count={s.frameworks.length}>
            <Stack items={s.frameworks} />
          </Section>
        </Panel>
      )}

      {s && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel>
            <Section title={t('Linhas de código por linguagem')}>
              {s.linesByLanguage.length ? (
                <Donut
                  title={t('Linhas de código por linguagem')}
                  otherLabel={t('outros')}
                  center={<span>{s.totalLines.toLocaleString()}<br /><span className="font-normal text-muted-foreground">{t('linhas')}</span></span>}
                  rows={s.linesByLanguage.map((l) => ({ key: l.name, label: langName(l.name), value: l.lines }))}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{t('Sem dados no período.')}</p>
              )}
            </Section>
          </Panel>
          <Panel>
            <Section title={t('Tipos de commit · último ano')}>
              {s.commitTypes.length ? (
                <Donut
                  title={t('Tipos de commit · último ano')}
                  otherLabel={t('Outros')}
                  center={<span>{s.commitTypes.reduce((a, c) => a + c.count, 0)}<br /><span className="font-normal text-muted-foreground">commits</span></span>}
                  rows={s.commitTypes.map((c) => ({ key: c.type, label: `${t(COMMIT_TYPE[c.type] ?? c.type)}${c.type === 'other' || c.type === 'merge' ? '' : ` (${c.type})`}`, value: c.count }))}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{t('Sem dados no período.')}</p>
              )}
            </Section>
          </Panel>
        </div>
      )}

      {s && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel>
            <Section title={t('Commits por semana · 26 semanas')}>
              <BarChart
                title={t('Commits por semana · 26 semanas')}
                data={s.weekly.map((w) => ({ key: w.week, label: shortDate(w.week), value: w.count, tip: t('semana de {d}: {n} commits', { d: shortDate(w.week), n: w.count }) }))}
              />
            </Section>
          </Panel>
          <Panel>
            <Section title={t('Linguagens · arquivos por extensão')}>
              {s.languages.length ? (
                <HBars rows={s.languages.map((l) => ({ key: l.name, label: langName(l.name), value: l.files, tip: t('{n} arquivos', { n: l.files }) }))} />
              ) : (
                <p className="text-sm text-muted-foreground">{t('Sem dados no período.')}</p>
              )}
            </Section>
          </Panel>
          <Panel>
            <Section title={t('Quando os commits acontecem · último ano')}>
              <Punchcard grid={s.punchcard} />
            </Section>
          </Panel>
          <Panel>
            <Section title={t('Arquivos mais alterados · 90 dias')}>
              {s.hotFiles.length ? (
                <HBars mono rows={s.hotFiles.map((f) => ({ key: f.path, label: f.path, value: f.changes, tip: t('{n} alterações', { n: f.changes }) }))} />
              ) : (
                <p className="text-sm text-muted-foreground">{t('Sem dados no período.')}</p>
              )}
            </Section>
          </Panel>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel>
          <Section title={t('Atividade · {n} commits em 12 semanas', { n: total })}>
            <div className="flex items-end gap-3 overflow-x-auto">
              <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
                {data.activity.map((a) => {
                  const level = heatLevel(a.count, max);
                  return (
                    <div
                      key={a.day}
                      data-heat={level}
                      title={t('{d}: {n} commits', { d: a.day, n: a.count })}
                      className="size-3.5 rounded-[3px] bg-muted"
                      style={level ? { background: `var(--heat-${level})` } : undefined}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {t('menos')}
                {[0, 1, 2, 3, 4].map((l) => (
                  <span key={l} className="size-2.5 rounded-[2px] bg-muted" style={l ? { background: `var(--heat-${l})` } : undefined} />
                ))}
                {t('mais')}
              </div>
            </div>
          </Section>
          <Section title={t('Repositório')}>
            <KV
              rows={[
                ['HEAD', head ? <span><span className="font-mono text-info">{head.sha.slice(0, 7)}</span> {head.subject}</span> : t('sem commits')],
                [t('Último commit'), head ? `${relativeTime(head.time)} · ${head.author}` : '—'],
                ['Branches', data.branches],
                ['Stashes', data.stashes],
              ]}
            />
          </Section>
        </Panel>

        <Panel>
          <Section title={t('Quem mais comitou')} count={data.authors.length} action={<PhotosToggle on={photos} onChange={setPhotos} />}>
            {data.authors.length ? (
              <ul className="space-y-2.5">
                {data.authors.map((a) => (
                  <li key={a.name} className="flex items-center gap-2.5">
                    <Avatar name={a.name} email={a.email} remote={photos} className="size-7" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="truncate">{a.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{a.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted">
                        <div className="h-1.5 rounded-full bg-info" style={{ width: `${(a.count / data.authors[0].count) * 100}%` }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('nenhum commit')}</p>
            )}
          </Section>
        </Panel>
      </div>
    </div>
  );
}
