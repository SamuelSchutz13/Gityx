import { useT } from '../lib/i18n';
import { useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip, KV, Section, UnderlineTabs } from '@/components/kit';
import { useApi } from '../lib/api';
import { fullDate } from '../lib/format';
import type { CommitDetail as Detail } from '../../server/shared/types';
import { DiffView } from './DiffView';
import { RefChip, STATUS_CHIP } from './chips';

type Tab = 'overview' | 'files' | 'diff';

export function CommitDetail({ sha }: { sha: string }) {
  const t = useT();
  const { data, error, loading } = useApi<Detail>(`/api/commits/${sha}`);
  const [tab, setTab] = useState<Tab>('overview');
  if (error) return <p className="p-3 text-sm text-destructive">{t('Não foi possível carregar o commit: {e}', { e: error.message })}</p>;
  if (loading || !data) return <div className="p-3"><Skeleton className="h-24 w-full" /></div>;

  const add = data.files.reduce((s, f) => s + f.additions, 0);
  const del = data.files.reduce((s, f) => s + f.deletions, 0);

  return (
    <div>
      <div className="space-y-2 px-3 pt-3 pb-3">
        <div className="flex flex-wrap gap-1">
          <Chip tone="info" mono>{data.sha.slice(0, 7)}</Chip>
          {data.parents.length > 1 && <Chip tone="violet" upper>merge</Chip>}
          {data.refs.map((r) => <RefChip key={r} name={r} />)}
        </div>
        <h2 className="text-[15px] leading-snug font-semibold">{data.subject}</h2>
        <p className="font-mono text-xs text-muted-foreground">{data.author} · {fullDate(data.time)}</p>
        <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2 text-xs" onClick={() => void navigator.clipboard?.writeText(data.sha)}>
          <Copy className="size-3.5" /> SHA
        </Button>
      </div>
      <UnderlineTabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: t('Visão geral') },
          { id: 'files', label: <>{t('Arquivos')} <span className="text-muted-foreground">{data.files.length}</span></> },
          { id: 'diff', label: 'Diff' },
        ]}
      />
      {tab === 'overview' && (
        <>
          <Section title={t('Detalhes')}>
            <KV
              rows={[
                [t('Autor'), `${data.author} <${data.email}>`],
                [t('Data'), fullDate(data.time)],
                ['SHA', <span className="font-mono text-xs">{data.sha}</span>],
                [t('Pais'), data.parents.length ? <span className="font-mono text-xs">{data.parents.map((p) => p.slice(0, 7)).join(' ')}</span> : t('commit raiz')],
                [t('Mudanças'), <span><span className="text-success">+{add}</span> <span className="text-destructive">−{del}</span> {t('em {n} arquivos', { n: data.files.length })}</span>],
              ]}
            />
          </Section>
          {data.body && (
            <Section title={t('Mensagem')}>
              <pre className="font-sans text-[13px] whitespace-pre-wrap text-fg-2">{data.body}</pre>
            </Section>
          )}
        </>
      )}
      {tab === 'files' && (
        <ul className="py-1">
          {data.files.map((f) => (
            <li key={f.path} className="flex items-center gap-2 px-3 py-1.5 text-[13px]">
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{f.path}</span>
              <Chip tone={STATUS_CHIP[f.status].tone} upper>{t(STATUS_CHIP[f.status].label)}</Chip>
              <span className="font-mono text-xs text-success">+{f.additions}</span>
              <span className="font-mono text-xs text-destructive">−{f.deletions}</span>
            </li>
          ))}
        </ul>
      )}
      {tab === 'diff' && (
        <div className="p-3">
          <DiffView files={data.files} defaultOpen />
        </div>
      )}
    </div>
  );
}
