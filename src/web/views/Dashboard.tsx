import type { ReactNode } from 'react';
import { CheckCircle2, GitBranch, Package, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, useLive } from '../lib/api';
import { relativeTime } from '../lib/format';
import type { Dashboard as Data } from '../../server/shared/types';

function Tile({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  );
}

function heatLevel(count: number, max: number): number {
  if (!count) return 0;
  return Math.min(4, Math.ceil((count / max) * 4));
}

export function Dashboard() {
  const { data, error, reload } = useApi<Data>('/api/dashboard');
  useLive(() => reload());
  if (error) return <p className="text-sm text-destructive">Não foi possível carregar o resumo: {error.message}</p>;
  if (!data) return <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>;

  const max = Math.max(1, ...data.activity.map((a) => a.count));
  const total = data.activity.reduce((s, a) => s + a.count, 0);

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Visão geral</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Tile title="Branch">
          <div className="flex items-center gap-2 font-mono text-sm">
            <GitBranch className="size-4" aria-hidden />
            <span>{data.branch ?? 'HEAD destacado'}</span>
          </div>
          {data.upstream ? (
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-mono">{data.upstream}</span> · <span>{`↑${data.ahead} ↓${data.behind}`}</span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">sem upstream</p>
          )}
        </Tile>

        <Tile title="Mudanças pendentes">
          <p className="text-2xl font-semibold">{data.pending.files}</p>
          <p className="text-xs">
            <span className="text-success">+{data.pending.additions}</span>{' '}
            <span className="text-destructive">−{data.pending.deletions}</span>
          </p>
        </Tile>

        <Tile title="Último teste">
          {data.lastTest ? (
            <div className="flex items-center gap-2 text-sm">
              {data.lastTest.status === 'passed' ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <XCircle className="size-4 text-destructive" aria-hidden />}
              <span>{data.lastTest.passed} ok · {data.lastTest.failed} falhas</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">nenhum nesta sessão</p>
          )}
        </Tile>

        <Tile title={`Atividade · ${total} commits em 12 semanas`}>
          <div className="grid w-fit grid-flow-col grid-rows-7 gap-[3px]">
            {data.activity.map((a) => {
              const level = heatLevel(a.count, max);
              return (
                <div
                  key={a.day}
                  data-heat={level}
                  title={`${a.day}: ${a.count} commits`}
                  className="size-3 rounded-[3px] bg-muted"
                  style={level ? { background: `var(--heat-${level})` } : undefined}
                />
              );
            })}
          </div>
        </Tile>

        <Tile title="Quem mais comitou">
          <ul className="space-y-1 text-sm">
            {data.authors.map((a) => (
              <li key={a.name} className="flex justify-between gap-2">
                <span className="truncate">{a.name}</span>
                <span className="text-muted-foreground">{a.count}</span>
              </li>
            ))}
            {!data.authors.length && <li className="text-muted-foreground">nenhum commit</li>}
          </ul>
        </Tile>

        <Tile title="Repositório">
          <div className="flex items-center gap-2 text-sm">
            <Package className="size-4" aria-hidden />
            <span>{data.branches} branches · {data.stashes} stashes</span>
          </div>
        </Tile>
      </div>

      <Card className="gap-2 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground">Últimos commits</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <ul className="divide-y text-sm">
            {data.recent.map((c) => (
              <li key={c.sha} className="flex items-center gap-3 py-1.5">
                <span className="font-mono text-xs text-muted-foreground">{c.sha.slice(0, 7)}</span>
                <span className="min-w-0 flex-1 truncate">{c.subject}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(c.time)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
