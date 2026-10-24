import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Toggle } from '@/components/ui/toggle';
import { useApi, useLive } from '../lib/api';
import { searchDiffs } from '../../server/search/search';
import type { FileDiff } from '../../server/shared/types';
import { DiffView } from './DiffView';

export function Changes() {
  const { data, error, loading, reload } = useApi<FileDiff[]>('/api/changes');
  useLive((t) => t === 'changes' && reload());
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);
  const [active, setActive] = useState(0);

  const files = data ?? [];
  const result = useMemo(() => searchDiffs(files, query, { caseSensitive, regex }), [files, query, caseSensitive, regex]);
  // Path matches select a file but have no line to jump to, so navigation only walks line hits.
  const lineHits = result.hits.filter((h) => h.line >= 0);
  const current = lineHits.length ? Math.min(active, lineHits.length - 1) : 0;
  const step = (d: number) => lineHits.length && setActive((current + d + lineHits.length) % lineHits.length);
  const add = files.reduce((s, f) => s + f.additions, 0);
  const del = files.reduce((s, f) => s + f.deletions, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-lg font-semibold">Mudanças</h1>
        <span className="text-sm text-muted-foreground">
          {files.length} arquivos · <span className="text-green-600 dark:text-green-400">+{add}</span> <span className="text-red-600 dark:text-red-400">−{del}</span>
        </span>
        <Button size="icon" variant="ghost" onClick={reload} aria-label="Atualizar">
          <RefreshCw className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar nos diffs (Enter: próxima, Shift+Enter: anterior)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') step(e.shiftKey ? -1 : 1);
            if (e.key === 'Escape') setQuery('');
          }}
          className="h-8 max-w-md flex-1"
          aria-invalid={!!result.error}
        />
        <Toggle size="sm" pressed={caseSensitive} onPressedChange={setCaseSensitive} aria-label="Diferenciar maiúsculas" title="Diferenciar maiúsculas">Aa</Toggle>
        <Toggle size="sm" pressed={regex} onPressedChange={setRegex} aria-label="Expressão regular" title="Expressão regular">.*</Toggle>
        <Button size="icon" variant="ghost" onClick={() => step(-1)} aria-label="Ocorrência anterior" disabled={!lineHits.length}><ChevronUp className="size-4" /></Button>
        <Button size="icon" variant="ghost" onClick={() => step(1)} aria-label="Próxima ocorrência" disabled={!lineHits.length}><ChevronDown className="size-4" /></Button>
        {query && !result.error && <span className="text-xs text-muted-foreground">{lineHits.length ? `${current + 1}/${lineHits.length}` : 'nenhuma ocorrência'}</span>}
        {result.error && <span className="text-xs text-destructive">{result.error}</span>}
      </div>

      {error && <p className="text-sm text-destructive">Não foi possível ler as mudanças: {error.message}</p>}
      {loading && !data ? <Skeleton className="h-32 w-full" /> : <DiffView files={files} hits={lineHits} activeHit={query ? current : undefined} />}
    </div>
  );
}
