// Small dependency-free SVG charts. One series each, so no legend: the section title names it.
import { useState, type ReactNode } from 'react';
import { useT } from '../lib/i18n';

export interface Datum {
  key: string;
  label: string;
  value: number;
  tip?: string;
}

function Tooltip({ x, y, children }: { x: number | string; y: number; children: ReactNode }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md"
      style={{ left: x, top: y - 6 }}
    >
      {children}
    </div>
  );
}

function TableToggle({ table, children }: { table: ReactNode; children: ReactNode }) {
  const t = useT();
  const [asTable, setAsTable] = useState(false);
  return (
    <div>
      {asTable ? table : children}
      <button type="button" onClick={() => setAsTable(!asTable)} className="mt-2 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
        {asTable ? t('Ver gráfico') : t('Ver tabela')}
      </button>
    </div>
  );
}

/** Vertical bars over time, 4px rounded tops on a shared baseline, 2px gaps. */
export function BarChart({ data, title, height = 120 }: { data: Datum[]; title: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const W = 100; // viewBox units per bar column, scaled by CSS
  const gap = 2;
  const table = (
    <table className="w-full text-xs">
      <caption className="sr-only">{title}</caption>
      <tbody>
        {data.map((d) => (
          <tr key={d.key} className="border-b last:border-b-0">
            <td className="py-0.5 text-muted-foreground">{d.label}</td>
            <td className="py-0.5 text-right font-mono">{d.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  return (
    <TableToggle table={table}>
      <div className="relative" onMouseLeave={() => setHover(null)}>
        <div className="flex items-stretch gap-2">
          <div className="flex w-6 shrink-0 flex-col justify-between py-0.5 text-right font-mono text-[10px] text-muted-foreground" style={{ height }}>
            <span>{max}</span>
            <span>0</span>
          </div>
          <svg viewBox={`0 0 ${n * W} ${height}`} preserveAspectRatio="none" className="min-w-0 flex-1" style={{ height }} role="img" aria-label={title}>
            <line x1={0} x2={n * W} y1={height / 2} y2={height / 2} stroke="var(--border)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            <line x1={0} x2={n * W} y1={height} y2={height} stroke="var(--border)" vectorEffect="non-scaling-stroke" />
            {data.map((d, i) => {
              const h = d.value ? Math.max(2, (d.value / max) * (height - 2)) : 0;
              return (
                <g key={d.key}>
                  {/* hit target is the whole column, bigger than the bar */}
                  <rect
                    data-bar
                    x={i * W}
                    y={0}
                    width={W}
                    height={height}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                  {h > 0 && (
                    <path
                      pointerEvents="none"
                      fill={hover === i ? 'var(--primary)' : 'var(--info)'}
                      opacity={hover === null || hover === i ? 1 : 0.55}
                      d={roundedTop(i * W + gap * 6, height - h, W - gap * 12, h, 4)}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="mt-1 flex justify-between pl-6 font-mono text-[10px] text-muted-foreground">
          <span>{data[0]?.label}</span>
          <span>{data[Math.floor(n / 2)]?.label}</span>
          <span>{data[n - 1]?.label}</span>
        </div>
        {hover !== null && (
          // the svg starts after the 24px axis column + 8px gap
          <Tooltip x={`calc(32px + (100% - 32px) * ${(hover + 0.5) / n})`} y={0}>
            {data[hover].tip ?? `${data[hover].label}: ${data[hover].value}`}
          </Tooltip>
        )}
      </div>
    </TableToggle>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h, w / 2);
  return `M${x} ${y + h} V${y + rr} Q${x} ${y} ${x + rr} ${y} H${x + w - rr} Q${x + w} ${y} ${x + w} ${y + rr} V${y + h} Z`;
}

/** Horizontal bars with the label left and the value right: for ranked lists. */
export function HBars({ rows, mono }: { rows: Datum[]; mono?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.key} title={r.tip} className="text-[13px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className={`min-w-0 truncate ${mono ? 'font-mono text-xs' : ''}`}>{r.label}</span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{r.value}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-info" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const DAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Weekday x hour heat grid, sequential green ramp shared with the activity calendar. */
export function Punchcard({ grid }: { grid: number[][] }) {
  const t = useT();
  const [hover, setHover] = useState<{ d: number; h: number; x: number; y: number } | null>(null);
  const max = Math.max(1, ...grid.flat());
  return (
    <div className="relative overflow-x-auto" onMouseLeave={() => setHover(null)}>
      <div className="inline-grid grid-cols-[32px_repeat(24,minmax(14px,1fr))] gap-[3px] text-[10px] text-muted-foreground">
        {grid.map((row, d) => (
          <div key={d} className="contents">
            <span className="pr-1 text-right leading-[14px]">{t(DAYS[d])}</span>
            {row.map((v, h) => {
              const level = v ? Math.min(4, Math.ceil((v / max) * 4)) : 0;
              return (
                <span
                  key={h}
                  data-cell
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    setHover({ d, h, x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop });
                  }}
                  className="h-3.5 rounded-[3px] bg-muted"
                  style={level ? { background: `var(--heat-${level})` } : undefined}
                />
              );
            })}
          </div>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-center">{h % 6 === 0 ? h : ''}</span>
        ))}
      </div>
      {hover && (
        <Tooltip x={hover.x} y={hover.y}>
          {t('{d} às {h}h: {n} commits', { d: t(DAYS[hover.d]), h: hover.h, n: grid[hover.d][hover.h] })}
        </Tooltip>
      )}
    </div>
  );
}
