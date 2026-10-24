import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CommitGraph, HistoryFilters } from './CommitGraph';
import { CommitDetail } from './CommitDetail';

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

  return (
    <div className="flex h-full flex-col gap-4">
      <form
        className="grid grid-cols-2 gap-2 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters(draft);
        }}
      >
        {field('author', 'Autor')}
        {field('path', 'Caminho')}
        {field('since', 'Desde', 'date')}
        {field('until', 'Até', 'date')}
        <div className="col-span-2 flex gap-2 md:col-span-4">
          <Button type="submit" size="sm">Filtrar</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { setDraft({}); setFilters({}); }}>Limpar</Button>
        </div>
      </form>
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-h-[300px] overflow-hidden rounded-lg border">
          <CommitGraph filters={filters} selected={selected} onSelect={setSelected} />
        </div>
        <div className="min-w-0 overflow-auto">
          {selected ? <CommitDetail sha={selected} /> : <p className="text-sm text-muted-foreground">Escolha um commit para ver os detalhes.</p>}
        </div>
      </div>
    </div>
  );
}
