import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { highlightLine } from '../lib/highlight';
import type { FileDiff, SearchHit } from '../../server/shared/types';

type Shown = FileDiff & { omitted?: boolean };

const STATUS: Record<FileDiff['status'], string> = {
  added: 'novo', modified: 'modificado', deleted: 'removido', renamed: 'renomeado', untracked: 'não rastreado',
};

const fileKey = (f: FileDiff) => `${f.staged ? 's' : 'w'}:${f.path}`;

// shortcut: a line with search hits is shown without syntax colors, simpler than merging marks into the token tree.
function withMarks(text: string, hits: { start: number; end: number; active: boolean }[]): ReactNode {
  const out: ReactNode[] = [];
  let at = 0;
  hits.forEach((h, i) => {
    out.push(text.slice(at, h.start));
    out.push(<mark key={i} data-hit={h.active ? 'active' : 'hit'} className={cn('rounded-sm', h.active ? 'bg-yellow-300 text-black' : 'bg-yellow-200/60 text-inherit dark:bg-yellow-500/30')}>{text.slice(h.start, h.end)}</mark>);
    at = h.end;
  });
  out.push(text.slice(at));
  return out;
}

function FileBlock(props: { file: Shown; open: boolean; onToggle(o: boolean): void; hits: SearchHit[]; active: SearchHit | null }) {
  const f = props.file;
  const ref = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    if (props.active) ref.current?.scrollIntoView?.({ block: 'center' });
  }, [props.active]);

  let body: ReactNode;
  if (f.omitted) body = <p className="p-3 text-sm text-muted-foreground">Conteúdo omitido: arquivo potencialmente sensível.</p>;
  else if (f.binary) body = <p className="p-3 text-sm text-muted-foreground">Arquivo binário</p>;
  else if (!f.hunks.length) body = <p className="p-3 text-sm text-muted-foreground">{f.truncated ? 'Diff truncado: arquivo grande demais para exibir.' : 'Sem mudanças de conteúdo.'}</p>;
  else {
    body = (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-xs leading-5">
          <tbody>
            {f.hunks.map((h, hi) => (
              <Fragment key={hi}>
                <tr className="bg-muted/60 text-muted-foreground">
                  <td colSpan={3} className="px-3 py-0.5">{h.header}</td>
                </tr>
                {h.lines.map((l, li) => {
                  const lineHits = props.hits.filter((x) => x.hunk === hi && x.line === li);
                  const isActive = props.active?.hunk === hi && props.active?.line === li;
                  return (
                    <tr key={li} ref={isActive ? ref : undefined} className={cn(l.kind === 'add' && 'bg-diff-add', l.kind === 'del' && 'bg-diff-del')}>
                      <td className="w-12 select-none border-r px-2 text-right text-muted-foreground">{l.oldNo ?? ''}</td>
                      <td className="w-12 select-none border-r px-2 text-right text-muted-foreground">{l.newNo ?? ''}</td>
                      <td className="whitespace-pre px-3">
                        <span className="select-none text-muted-foreground">{l.kind === 'add' ? '+' : l.kind === 'del' ? '-' : ' '}</span>
                        {lineHits.length
                          ? withMarks(l.text, lineHits.map((x) => ({ start: x.start, end: x.end, active: isActive && x.start === props.active!.start })))
                          : highlightLine(l.text, f.path)}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
        {f.truncated && <p className="p-3 text-sm text-muted-foreground">Diff truncado: só as primeiras 5000 linhas aparecem.</p>}
      </div>
    );
  }

  return (
    <Collapsible open={props.open} onOpenChange={props.onToggle} className="overflow-hidden rounded-lg border">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent">
        <ChevronRight className={cn('size-4 shrink-0 transition-transform', props.open && 'rotate-90')} aria-hidden />
        <span className="min-w-0 flex-1 truncate font-mono text-xs">
          {f.oldPath && <span className="text-muted-foreground">{f.oldPath} → </span>}
          {f.path}
        </span>
        {f.staged && <Badge variant="secondary">staged</Badge>}
        <Badge variant="outline">{STATUS[f.status]}</Badge>
        <span className="text-xs text-green-600 dark:text-green-400">+{f.additions}</span>
        <span className="text-xs text-red-600 dark:text-red-400">−{f.deletions}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t">{body}</CollapsibleContent>
    </Collapsible>
  );
}

export function DiffView(props: { files: Shown[]; hits?: SearchHit[]; activeHit?: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const hits = props.hits ?? [];
  const active = props.activeHit !== undefined ? hits[props.activeHit] ?? null : null;

  useEffect(() => {
    const f = active && props.files[active.file];
    if (f) setOpen((o) => ({ ...o, [fileKey(f)]: true }));
  }, [active, props.files]);

  if (!props.files.length) return <p className="text-sm text-muted-foreground">Nenhuma mudança no working tree.</p>;
  return (
    <div className="space-y-2">
      {props.files.map((f, i) => {
        const k = fileKey(f);
        const fileHits = hits.filter((h) => h.file === i);
        return (
          <FileBlock
            key={k}
            file={f}
            open={open[k] ?? props.defaultOpen ?? false}
            onToggle={(o) => setOpen((s) => ({ ...s, [k]: o }))}
            hits={fileHits}
            active={active?.file === i ? active : null}
          />
        );
      })}
    </div>
  );
}
