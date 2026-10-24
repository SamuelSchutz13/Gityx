import { useT } from '../lib/i18n';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CommitGraph, HistoryFilters } from './CommitGraph';
import { CommitDetail } from './CommitDetail';
import { Frame } from './Frame';
import { useApi } from '../lib/api';
import type { Commit } from '../../server/shared/types';

export function History() {
  const t = useT();
  const [draft, setDraft] = useState<HistoryFilters>({});
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [picked, setSelected] = useState<string | null>(null);
  // Like GitView's inspector, start with something to show: the newest commit.
  const newest = useApi<Commit[]>('/api/history?limit=1');
  const selected = picked ?? newest.data?.[0]?.sha ?? null;
  const field = (key: keyof HistoryFilters, label: string, type = 'text') => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {t(label)}
      <Input type={type} value={draft[key] ?? ''} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="h-8" />
    </label>
  );

  const left = {
    title: t('Filtros'),
    width: 260,
    content: (
      <form
        className="flex flex-col gap-3 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters(draft);
        }}
      >
        {field('author', 'Autor')}
        {field('path', 'Caminho')}
        {field('since', 'Desde', 'date')}
        {field('until', 'Até', 'date')}
        <div className="flex gap-2">
          <Button type="submit" size="sm">{t('Filtrar')}</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { setDraft({}); setFilters({}); }}>{t('Limpar')}</Button>
        </div>
      </form>
    ),
  };
  const right = {
    title: t('Inspetor'),
    width: 520,
    content: <div>{selected ? <CommitDetail key={selected} sha={selected} /> : <p className="p-3 text-sm text-muted-foreground">{t('Escolha um commit no grafo para ver os detalhes.')}</p>}</div>,
  };

  return (
    <Frame left={left} right={right}>
      <div className="-m-4 h-[calc(100%+2rem)]">
        <CommitGraph filters={filters} selected={selected} onSelect={setSelected} />
      </div>
    </Frame>
  );
}
