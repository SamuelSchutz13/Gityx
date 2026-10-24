import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Download, FileDiff, FlaskConical, GitBranch, History, LayoutDashboard, Moon, Sun } from 'lucide-react';
import { cn } from 'cn';
import { toggleTheme } from '../lib/theme';
import { useLang } from '../lib/i18n';
import { FlagBR, FlagUS } from '@/components/flags';

export type View = 'overview' | 'changes' | 'history' | 'tests' | 'export';

const TABS: { view: View; label: string; icon: typeof History }[] = [
  { view: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { view: 'changes', label: 'Mudanças', icon: FileDiff },
  { view: 'history', label: 'Histórico', icon: History },
  { view: 'tests', label: 'Testes', icon: FlaskConical },
  { view: 'export', label: 'Exportar', icon: Download },
];

export interface PaneDef {
  title: string;
  content: ReactNode;
  width?: number;
}

/** Small uppercase heading used by every pane, like GitView's SECURITY / INSPECTOR. */
export function PaneTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b px-3">
      <h2 className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{children}</h2>
      {action}
    </div>
  );
}

function SidePane({ pane, side }: { pane: PaneDef; side: 'left' | 'right' }) {
  const { t } = useLang();
  const [open, setOpen] = useState(true);
  const Icon = (side === 'left') === open ? ChevronLeft : ChevronRight;
  const toggle = (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label={t(open ? 'Recolher {x}' : 'Mostrar {x}', { x: pane.title })}
      title={t(open ? 'Recolher {x}' : 'Mostrar {x}', { x: pane.title })}
      className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-4" />
    </button>
  );
  if (!open) {
    return <div className={cn('hidden w-9 shrink-0 flex-col items-center bg-surface pt-2 lg:flex', side === 'left' ? 'border-r' : 'border-l')}>{toggle}</div>;
  }
  return (
    <section
      className={cn(
        'flex max-h-[60vh] min-h-0 w-full shrink-0 flex-col bg-surface max-lg:border-b lg:max-h-none lg:w-[var(--pane-w)] lg:max-w-[45vw]',
        side === 'left' ? 'lg:border-r' : 'lg:border-l',
      )}
      style={{ '--pane-w': `${pane.width ?? 320}px` } as React.CSSProperties}
    >
      <PaneTitle action={toggle}>{pane.title}</PaneTitle>
      <div className="min-h-0 flex-1 overflow-auto">{pane.content}</div>
    </section>
  );
}

export function Shell(props: {
  view: View;
  onNavigate(v: View): void;
  repo?: string;
  branch?: string | null;
  left?: PaneDef;
  right?: PaneDef;
  status?: ReactNode;
  children: ReactNode;
}) {
  const [, rerender] = useState(0);
  const { t, lang, setLang } = useLang();
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <header className="flex h-11 shrink-0 items-center gap-3 overflow-x-auto border-b bg-surface px-3">
        <button
          type="button"
          onClick={() => props.onNavigate('overview')}
          aria-label={`Gityx: ${t('Visão geral')}`}
          title={t('Visão geral')}
          className="flex shrink-0 items-center gap-2 rounded-md px-1 py-0.5 text-primary hover:bg-accent"
        >
          <GitBranch className="size-5" aria-hidden />
          <span className="font-semibold text-foreground">Gityx</span>
        </button>
        {props.repo && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="max-w-56 truncate font-medium text-fg-2">{props.repo}</span>
          </>
        )}
        {props.branch && (
          <span className="hidden max-w-48 shrink-0 truncate rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs text-fg-2 md:inline">{props.branch}</span>
        )}
        <nav role="tablist" aria-label={t('Telas')} className="ml-auto flex shrink-0 gap-0.5 rounded-md border bg-muted p-0.5">
          {TABS.map(({ view, label, icon: Icon }) => {
            const active = props.view === view;
            return (
              <button
                key={view}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={t(label)}
                title={t(label)}
                onClick={() => props.onNavigate(view)}
                className={cn(
                  'flex items-center gap-1.5 rounded px-2.5 py-1 text-[13px] text-fg-2 transition-colors hover:text-foreground',
                  active && 'bg-surface text-foreground shadow-sm ring-1 ring-border',
                )}
              >
                <Icon className="size-3.5 opacity-80" aria-hidden />
                <span className={active ? 'hidden sm:inline' : 'hidden xl:inline'} aria-hidden>{t(label)}</span>
              </button>
            );
          })}
        </nav>
        <div role="group" aria-label={t('Idioma')} className="flex shrink-0 gap-0.5 rounded-md border bg-muted p-0.5">
          {(['pt', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              aria-label={l === 'pt' ? 'Português (Brasil)' : 'English'}
              title={l === 'pt' ? 'Português (Brasil)' : 'English'}
              onClick={() => setLang(l)}
              className={cn('rounded px-1 py-0.5 opacity-50 grayscale-[60%] transition hover:opacity-100 hover:grayscale-0', lang === l && 'bg-surface opacity-100 ring-1 ring-border grayscale-0')}
            >
              {l === 'pt' ? <FlagBR className="h-3.5 w-5" /> : <FlagUS className="h-3.5 w-5" />}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label={t('Alternar tema')}
          title={dark ? t('Tema claro') : t('Tema escuro')}
          onClick={() => {
            toggleTheme();
            rerender((n) => n + 1);
          }}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {props.left && <SidePane pane={props.left} side="left" />}
        <main className="canvas-grid min-h-0 min-w-0 flex-1 overflow-auto p-4">{props.children}</main>
        {props.right && <SidePane pane={props.right} side="right" />}
      </div>

      <footer className="flex h-6 shrink-0 items-center gap-4 border-t bg-surface px-3 text-[11px] text-muted-foreground">
        <div className="flex min-w-0 flex-1 items-center gap-4 truncate">{props.status}</div>
        <span title={t('Servido só nesta máquina (127.0.0.1)')}>
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-success align-middle" />
          {t('ao vivo')} · {typeof location !== 'undefined' ? location.host : ''}
        </span>
        <span>{t('local · sem IA · só leitura')}</span>
      </footer>
    </div>
  );
}
