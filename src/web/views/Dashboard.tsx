import { Skeleton } from '@/components/ui/skeleton';
import { Chip, Hint, KV, NodeCard, Section } from '@/components/kit';
import { useApi, useLive } from '../lib/api';
import { relativeTime } from '../lib/format';
import type { Dashboard as Data } from '../../server/shared/types';

function heatLevel(count: number, max: number): number {
  if (!count) return 0;
  return Math.min(4, Math.ceil((count / max) * 4));
}

export function Dashboard() {
  const { data, error, reload } = useApi<Data>('/api/dashboard');
  useLive(() => reload());
  if (error) return <p className="text-sm text-destructive">Não foi possível carregar o resumo: {error.message}</p>;
  if (!data) return <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>;

  const max = Math.max(1, ...data.activity.map((a) => a.count));
  const total = data.activity.reduce((s, a) => s + a.count, 0);
  const topAuthor = Math.max(1, ...data.authors.map((a) => a.count));
  const head = data.recent[0];
  const t = data.lastTest;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Hint>Clique num commit da árvore para ver a mensagem, os arquivos e o diff.</Hint>

      <div className="grid gap-3 md:grid-cols-3">
        <NodeCard tone="info" title={<span className="font-mono">{data.branch ?? 'HEAD destacado'}</span>} subtitle={data.upstream ?? 'sem upstream'}>
          {data.upstream && <Chip tone="info" mono>{`↑${data.ahead} ↓${data.behind}`}</Chip>}
        </NodeCard>
        <NodeCard
          tone={data.pending.files ? 'warning' : 'success'}
          title={data.pending.files ? `${data.pending.files} arquivos alterados` : 'Working tree limpo'}
          subtitle="mudanças pendentes"
        >
          <div className="flex gap-1">
            <Chip tone="success" mono>+{data.pending.additions}</Chip>
            <Chip tone="danger" mono>−{data.pending.deletions}</Chip>
          </div>
        </NodeCard>
        <NodeCard
          tone={!t ? 'neutral' : t.status === 'passed' ? 'success' : 'danger'}
          title={!t ? 'Testes não executados' : t.status === 'passed' ? 'Testes aprovados' : 'Testes falharam'}
          subtitle={t ? `${t.passed} ok · ${t.failed} falhas` : 'nesta sessão'}
        >
          {t && <Chip tone={t.status === 'passed' ? 'success' : 'danger'} upper>{t.status === 'passed' ? 'passou' : 'falhou'}</Chip>}
        </NodeCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-md border bg-surface">
          <Section title={`Atividade · ${total} commits em 12 semanas`}>
            <div className="flex items-end gap-3 overflow-x-auto">
              <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
                {data.activity.map((a) => {
                  const level = heatLevel(a.count, max);
                  return (
                    <div
                      key={a.day}
                      data-heat={level}
                      title={`${a.day}: ${a.count} commits`}
                      className="size-3.5 rounded-[3px] bg-muted ring-1 ring-border/40 ring-inset"
                      style={level ? { background: `var(--heat-${level})` } : undefined}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                menos
                {[0, 1, 2, 3, 4].map((l) => (
                  <span key={l} className="size-2.5 rounded-[2px] bg-muted" style={l ? { background: `var(--heat-${l})` } : undefined} />
                ))}
                mais
              </div>
            </div>
          </Section>
          <Section title="Repositório">
            <KV
              rows={[
                ['HEAD', head ? <span><span className="font-mono text-info">{head.sha.slice(0, 7)}</span> {head.subject}</span> : 'sem commits'],
                ['Último commit', head ? `${relativeTime(head.time)} · ${head.author}` : '—'],
                ['Branches', data.branches],
                ['Stashes', data.stashes],
              ]}
            />
          </Section>
        </div>

        <div className="rounded-md border bg-surface">
          <Section title="Quem mais comitou" count={data.authors.length}>
            <ul className="space-y-2">
              {data.authors.map((a) => (
                <li key={a.name} className="text-[13px]">
                  <div className="flex justify-between gap-2">
                    <span className="truncate">{a.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{a.count}</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-muted">
                    <div className="h-1 rounded-full bg-info" style={{ width: `${(a.count / topAuthor) * 100}%` }} />
                  </div>
                </li>
              ))}
              {!data.authors.length && <li className="text-sm text-muted-foreground">nenhum commit</li>}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
