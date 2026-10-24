import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, useLive } from '../lib/api';
import { assignLanes, GraphRow } from '../lib/graph-layout';
import { fullDate, relativeTime } from '../lib/format';
import type { Commit } from '../../server/shared/types';

export interface HistoryFilters {
  author?: string;
  path?: string;
  since?: string;
  until?: string;
}

const PAGE = 200;
const LANE_W = 12;
const color = (lane: number) => `var(--lane-${lane % 8})`;

function query(skip: number, f: HistoryFilters = {}) {
  const q = new URLSearchParams({ skip: String(skip), limit: String(PAGE) });
  for (const [k, v] of Object.entries(f)) if (v) q.set(k, v);
  return `/api/history?${q}`;
}

function Lanes({ row, width, h }: { row: GraphRow; width: number; h: number }) {
  const x = (l: number) => LANE_W / 2 + l * LANE_W + 2;
  const mid = h / 2;
  const curve = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}`;
  return (
    <svg width={width} height={h} className="shrink-0" aria-hidden>
      {row.passThrough.map((k) => <line key={`p${k}`} x1={x(k)} y1={0} x2={x(k)} y2={h} stroke={color(k)} strokeWidth={2} />)}
      {row.hasChild && <line x1={x(row.lane)} y1={0} x2={x(row.lane)} y2={mid} stroke={color(row.lane)} strokeWidth={2} />}
      {row.mergedFrom.map((j) => <path key={`m${j}`} d={curve(x(j), 0, x(row.lane), mid)} stroke={color(j)} strokeWidth={2} fill="none" />)}
      {row.edges.map((e) => <path key={`e${e.toLane}${e.parent}`} d={curve(x(e.fromLane), mid, x(e.toLane), h)} stroke={color(e.toLane)} strokeWidth={2} fill="none" />)}
      <circle cx={x(row.lane)} cy={mid} r={4} fill="var(--background)" stroke={color(row.lane)} strokeWidth={2.5} />
    </svg>
  );
}

function Ref({ name }: { name: string }) {
  if (name.startsWith('tag: ')) return <Badge variant="outline" className="h-5 px-1.5 text-[11px]">{name.slice(5)}</Badge>;
  if (name.startsWith('HEAD')) return <Badge className="h-5 px-1.5 text-[11px]">{name}</Badge>;
  return <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">{name}</Badge>;
}

export function CommitGraph(props: { compact?: boolean; filters?: HistoryFilters; selected?: string | null; onSelect(sha: string): void }) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const filterKey = JSON.stringify(props.filters ?? {});

  const load = useCallback(
    async (skip: number, replace: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const page = await api.get<Commit[]>(query(skip, props.filters));
        setCommits((prev) => (replace ? page : [...prev, ...page]));
        setDone(page.length < PAGE);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey],
  );

  useEffect(() => {
    void load(0, true);
  }, [load]);
  useLive((t) => t === 'history' && void load(0, true));

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) void load(commits.length, false);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [commits.length, done, load]);

  // shortcut: with an author filter, a parent loaded on a later page is not connected; fine for a filtered view.
  const rows = useMemo(() => assignLanes(commits, { dropMissingParents: !!props.filters?.author }), [commits, props.filters?.author]);
  const lanes = Math.max(1, ...rows.map((r) => Math.max(r.lane + 1, r.lanesAfter, ...r.passThrough.map((p) => p + 1))));
  const width = Math.min(lanes, props.compact ? 8 : 24) * LANE_W + 4;
  const h = props.compact ? 26 : 30;

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        {error && <p className="p-4 text-sm text-destructive">Não foi possível carregar o histórico: {error}</p>}
        {!error && !loading && commits.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum commit ainda.</p>}
        <ul className="py-1">
          {rows.map((row) => (
            <li key={row.commit.sha}>
              <button
                type="button"
                onClick={() => props.onSelect(row.commit.sha)}
                title={`${row.commit.sha.slice(0, 10)} · ${row.commit.author} · ${fullDate(row.commit.time)}`}
                className={cn('flex w-full items-center gap-2 overflow-hidden px-2 text-left text-sm hover:bg-accent', props.selected === row.commit.sha && 'bg-accent')}
                style={{ height: h }}
              >
                <Lanes row={row} width={width} h={h} />
                <span className="flex shrink-0 gap-1">{row.commit.refs.map((r) => <Ref key={r} name={r} />)}</span>
                <span className="min-w-0 flex-1 truncate">{row.commit.subject}</span>
                {!props.compact && <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">{row.commit.author}</span>}
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{props.compact ? relativeTime(row.commit.time) : row.commit.sha.slice(0, 7)}</span>
              </button>
            </li>
          ))}
        </ul>
        {loading && <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-4 w-full" />)}</div>}
        {!done && <div ref={sentinel} className="h-4" />}
      </div>
    </div>
  );
}
