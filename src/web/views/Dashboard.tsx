import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip, Hint, KV, NodeCard, Section } from '@/components/kit';
import { BarChart, HBars, Punchcard } from '@/components/charts';
import { useApi, useLive } from '../lib/api';
import { useT } from '../lib/i18n';
import { relativeTime, shortDate } from '../lib/format';
import type { Dashboard as Data, Stats } from '../../server/shared/types';

function heatLevel(count: number, max: number): number {
  if (!count) return 0;
  return Math.min(4, Math.ceil((count / max) * 4));
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
        <Panel className="grid grid-cols-2 divide-border sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
          <Kpi label="Commits" value={s.totalCommits.toLocaleString()} />
          <Kpi label={t('Contribuidores')} value={s.contributors} />
          <Kpi label={t('Idade do repositório')} value={s.firstCommit ? relativeTime(s.firstCommit).replace(/^há |ago$/g, '').trim() : '—'} sub={s.firstCommit ? t('Primeiro commit {t}', { t: relativeTime(s.firstCommit) }) : undefined} />
          <Kpi label={t('Última tag')} value={<span className="font-mono text-base">{s.lastTag ?? t('nenhuma')}</span>} />
          <Kpi label={t('Arquivos rastreados')} value={s.trackedFiles.toLocaleString()} />
        </Panel>
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
          <Section title={t('Quem mais comitou')} count={data.authors.length}>
            {data.authors.length ? (
              <HBars rows={data.authors.map((a) => ({ key: a.name, label: a.name, value: a.count }))} />
            ) : (
              <p className="text-sm text-muted-foreground">{t('nenhum commit')}</p>
            )}
          </Section>
        </Panel>
      </div>
    </div>
  );
}
