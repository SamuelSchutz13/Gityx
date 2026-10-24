import { useT } from '../lib/i18n';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Toggle } from '@/components/ui/toggle';
import { useApi, useLive } from '../lib/api';
import { searchDiffs } from '../../server/search/search';
import type { FileDiff } from '../../server/shared/types';
import { DiffView } from './DiffView';
import { Frame } from './Frame';
import type { PaneDef } from './Shell';
import { Chip, Empty, GroupHeader, Hint } from '@/components/kit';
import { FileCheck2 } from 'lucide-react';
import { STATUS_CHIP } from './chips';

const DOT: Record<FileDiff['status'], string> = {
  added: 'bg-success', untracked: 'bg-success', modified: 'bg-warning', renamed: 'bg-primary', deleted: 'bg-destructive',
};

const GROUPS: { title: string; match(f: FileDiff): boolean }[] = [
  { title: 'Staged', match: (f) => f.staged },
  { title: 'Não staged', match: (f) => !f.staged && f.status !== 'untracked' },
  { title: 'Não rastreados', match: (f) => f.status === 'untracked' },
];

function FileList({ files, onPick }: { files: FileDiff[]; onPick(i: number): void }) {
  const t = useT();
  const [filter, setFilter] = useState('');
  const shown = files.map((f, i) => ({ f, i })).filter(({ f }) => f.path.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div>
      <div className="border-b p-2">
        <Input placeholder={t('Filtrar arquivos...')} value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8 bg-background" />
      </div>
      {!files.length && <p className="p-3 text-sm text-muted-foreground">{t('Working tree limpo.')}</p>}
      {GROUPS.map((g) => {
        const items = shown.filter(({ f }) => g.match(f));
        if (!items.length) return null;
        return (
          <div key={g.title}>
            <GroupHeader title={t(g.title)} count={items.length} />
            <ul>
              {items.map(({ f, i }) => {
                const slash = f.path.lastIndexOf('/');
                return (
                  <li key={`${f.staged}:${f.path}`}>
                    <button type="button" onClick={() => onPick(i)} className="flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-accent">
                      <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[f.status])} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px]">{f.path.slice(slash + 1)}</span>
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">{slash > 0 ? f.path.slice(0, slash) : '.'}</span>
                        <span className="mt-1 flex gap-1">
                          <Chip tone={STATUS_CHIP[f.status].tone} upper>{t(STATUS_CHIP[f.status].label)}</Chip>
                          <Chip tone="success" mono>+{f.additions}</Chip>
                          <Chip tone="danger" mono>−{f.deletions}</Chip>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function Changes({ tree }: { tree?: PaneDef }) {
  const t = useT();
  const { data, error, loading, reload } = useApi<FileDiff[]>('/api/changes');
  useLive((t) => t === 'changes' && reload());
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);
  const [active, setActive] = useState(0);
  const [focus, setFocus] = useState<{ file: number; seq: number }>();

  const files = data ?? [];
  const result = useMemo(() => searchDiffs(files, query, { caseSensitive, regex }), [files, query, caseSensitive, regex]);
  // Path matches select a file but have no line to jump to, so navigation only walks line hits.
  const lineHits = result.hits.filter((h) => h.line >= 0);
  const current = lineHits.length ? Math.min(active, lineHits.length - 1) : 0;
  const step = (d: number) => lineHits.length && setActive((current + d + lineHits.length) % lineHits.length);

  const left = {
    title: t('Arquivos · {n}', { n: files.length }),
    width: 280,
    content: <FileList files={files} onPick={(file) => setFocus((f) => ({ file, seq: (f?.seq ?? 0) + 1 }))} />,
  };

  return (
    <Frame left={left} right={tree}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={t('Buscar nos diffs (Enter: próxima, Shift+Enter: anterior)')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') step(e.shiftKey ? -1 : 1);
              if (e.key === 'Escape') setQuery('');
            }}
            className="h-8 max-w-md flex-1 bg-surface"
            aria-invalid={!!result.error}
          />
          <Toggle size="sm" pressed={caseSensitive} onPressedChange={setCaseSensitive} aria-label={t('Diferenciar maiúsculas')} title={t('Diferenciar maiúsculas')}>Aa</Toggle>
          <Toggle size="sm" pressed={regex} onPressedChange={setRegex} aria-label={t('Expressão regular')} title={t('Expressão regular')}>.*</Toggle>
          <Button size="icon" variant="ghost" onClick={() => step(-1)} aria-label={t('Ocorrência anterior')} disabled={!lineHits.length}><ChevronUp className="size-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => step(1)} aria-label={t('Próxima ocorrência')} disabled={!lineHits.length}><ChevronDown className="size-4" /></Button>
          {query && !result.error && <span className="text-xs text-muted-foreground">{lineHits.length ? `${current + 1}/${lineHits.length}` : t('nenhuma ocorrência')}</span>}
          {result.error && <span className="text-xs text-destructive">{result.error}</span>}
          <Button size="icon" variant="ghost" onClick={reload} aria-label={t('Atualizar')} className="ml-auto">
            <RefreshCw className="size-4" />
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{t('Não foi possível ler as mudanças: {e}', { e: error.message })}</p>}
        {loading && !data ? (
          <Skeleton className="h-32 w-full" />
        ) : files.length ? (
          <>
            <Hint>{t('Os diffs se atualizam sozinhos quando um arquivo muda. Clique num arquivo à esquerda para ir até ele.')}</Hint>
            <DiffView files={files} hits={lineHits} activeHit={query ? current : undefined} focus={focus} defaultOpen={files.length <= 8} />
          </>
        ) : (
          <Empty icon={<FileCheck2 className="size-8" />} title={t('Nenhuma mudança no working tree')}>
            {t('Edite um arquivo do repositório e o diff aparece aqui na hora.')}
          </Empty>
        )}
      </div>
    </Frame>
  );
}
