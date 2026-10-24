import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CommitGraph, HistoryFilters } from './CommitGraph';
import { CommitDetail } from './CommitDetail';
import { Frame } from './Frame';

export function History() {
  const [draft, setDraft] = useState<HistoryFilters>({});
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [selected, setSelected] = useState<string | null>(null);
  const field = (key: keyof HistoryFilters, label: string, type = 'text') => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <Input type={type} value={draft[key] ?? ''} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="h-8" />
    </label>
  );

  const left = {
    title: 'Filtros',
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
          <Button type="submit" size="sm">Filtrar</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { setDraft({}); setFilters({}); }}>Limpar</Button>
        </div>
      </form>
    ),
  };
  const right = {
    title: 'Commit',
    width: 520,
    content: <div className="p-3">{selected ? <CommitDetail sha={selected} /> : <p className="text-sm text-muted-foreground">Escolha um commit no grafo para ver os detalhes.</p>}</div>,
  };

  return (
    <Frame left={left} right={right}>
      <div className="-m-4 h-[calc(100%+2rem)]">
        <CommitGraph filters={filters} selected={selected} onSelect={setSelected} />
      </div>
    </Frame>
  );
}
