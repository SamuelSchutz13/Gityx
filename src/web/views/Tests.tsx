import { useT } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { CheckCircle2, CircleDashed, CircleSlash, FlaskConical, Loader2, MinusCircle, XCircle } from 'lucide-react';
import { Chip, Empty, Hint } from '@/components/kit';
import { Frame } from './Frame';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { api, ApiError, useApi } from '../lib/api';
import type { TestProject, TestRun, TestStatus } from '../../server/shared/types';

const ICON: Record<TestStatus, typeof CheckCircle2> = {
  pending: CircleDashed, running: Loader2, passed: CheckCircle2, failed: XCircle, skipped: MinusCircle, cancelled: CircleSlash, error: XCircle,
};
const LABEL: Record<TestStatus, string> = {
  pending: 'aguardando', running: 'executando', passed: 'aprovado', failed: 'falhou', skipped: 'ignorado', cancelled: 'cancelado', error: 'erro',
};

function Status({ s }: { s: TestStatus }) {
  const t = useT();
  const Icon = ICON[s];
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <Icon className={`size-4 ${s === 'running' ? 'animate-spin' : ''} ${s === 'passed' ? 'text-success' : s === 'failed' || s === 'error' ? 'text-destructive' : 'text-muted-foreground'}`} aria-hidden />
      {t(LABEL[s])}
    </span>
  );
}

export function Tests() {
  const t = useT();
  const projects = useApi<TestProject[]>('/api/tests/projects');
  const [run, setRun] = useState<TestRun | null>(null);
  const [pending, setPending] = useState<string[] | 'all' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<TestRun | null>('/api/tests/run').then(setRun).catch(() => {});
    if (typeof EventSource === 'undefined') return;
    const es = new EventSource('/api/tests/events');
    es.addEventListener('run', (e) => setRun(JSON.parse((e as MessageEvent).data)));
    return () => es.close();
  }, []);

  const start = async (which: string[] | 'all', confirm = false) => {
    setError(null);
    try {
      setRun(await api.post<TestRun>('/api/tests/run', confirm ? { projects: which, confirm } : { projects: which }));
      setPending(null);
    } catch (e) {
      const body = e instanceof ApiError ? (e.body as any) : null;
      if (body?.needsConfirmation) setPending(which);
      else if (body?.alreadyRunning) setError(t('Já existe uma execução em andamento.'));
      else setError((e as Error).message);
    }
  };

  const running = run?.status === 'running';
  const tone = (st: TestStatus) => (st === 'passed' ? 'success' : st === 'failed' || st === 'error' ? 'danger' : st === 'running' ? 'info' : 'neutral');

  const left = {
    title: t('Projetos · {n}', { n: projects.data?.length ?? 0 }),
    width: 300,
    content: (
      <div>
        {projects.error && <p className="p-3 text-sm text-destructive">{projects.error.message}</p>}
        {projects.data && !projects.data.length && (
          <p className="p-3 text-sm text-muted-foreground">{t('Nenhum projeto de teste encontrado (Jest, Vitest, script test, Go ou .gityx.json).')}</p>
        )}
        <ul className="py-1">
          {projects.data?.map((p) => (
            <li key={p.name} className="flex items-center gap-2 px-3 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]">{p.name}</span>
                <span className="block truncate font-mono text-[11px] text-muted-foreground">{p.dir}</span>
              </span>
              <Chip tone="info" upper>{p.kind}</Chip>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={running} onClick={() => void start([p.name])}>{t('Rodar')}</Button>
            </li>
          ))}
        </ul>
      </div>
    ),
  };

  return (
    <Frame left={left}>
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Hint>{t('Os testes rodam o código do repositório nesta máquina; a primeira execução pede confirmação.')}</Hint>
        <span className="ml-auto" />
        {running && <Button variant="outline" size="sm" onClick={() => void api.post('/api/tests/cancel', {})}>{t('Cancelar')}</Button>}
        <Button size="sm" disabled={running || !projects.data?.length} onClick={() => void start('all')}>{t('Rodar todos')}</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!run && <Empty icon={<FlaskConical className="size-8" />} title={t('Nenhuma execução nesta sessão')}>{t('Escolha um projeto à esquerda ou rode todos.')}</Empty>}

      {run && (
        <div className="space-y-3">
          {run.projects.map((pr) => (
            <div key={pr.project.name} className={`rounded-md border border-l-[3px] bg-surface ${tone(pr.status) === 'success' ? 'border-l-success' : tone(pr.status) === 'danger' ? 'border-l-destructive' : tone(pr.status) === 'info' ? 'border-l-info' : 'border-l-node-border'}`}>
              <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
                <span className="text-[13px] font-medium">{pr.project.name}</span>
                <Chip tone={tone(pr.status)} upper>{t(LABEL[pr.status])}</Chip>
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                  {t('código de saída {c} · {s} s', { c: pr.exitCode ?? '-', s: (pr.durationMs / 1000).toFixed(1) })}
                </span>
              </div>
              {pr.cases === null ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">{t('Sem contagem: comando personalizado, só código de saída e log.')}</p>
              ) : (
                <ul className="max-h-80 overflow-auto px-3 py-2 text-[13px]">
                  {pr.cases.map((c, i) => (
                    <li key={i} className="py-0.5">
                      <div className="flex items-center gap-2">
                        <Status s={c.status} />
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      </div>
                      {c.message && <pre className="mt-1 ml-6 overflow-x-auto text-xs whitespace-pre-wrap text-destructive">{c.message}</pre>}
                    </li>
                  ))}
                </ul>
              )}
              {pr.log && (
                <details className="border-t px-3 py-2">
                  <summary className="cursor-pointer text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{t('Log completo')}</summary>
                  <pre className="mt-2 max-h-96 overflow-auto rounded bg-background p-2 font-mono text-xs whitespace-pre-wrap">{pr.log}</pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogTitle>{t('Rodar testes?')}</DialogTitle>
          <DialogDescription>{t('Os testes executam código deste repositório e podem ter efeitos fora dele. Continuar?')}</DialogDescription>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>{t('Cancelar')}</Button>
            <Button onClick={() => pending && void start(pending, true)}>{t('Continuar')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </Frame>
  );
}
