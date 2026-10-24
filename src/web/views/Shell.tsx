import type { ReactNode } from 'react';
import { Download, FileDiff, FlaskConical, GitBranch, History, LayoutDashboard } from 'lucide-react';
import { cn } from 'cn';

export type View = 'overview' | 'changes' | 'history' | 'tests' | 'export';

const NAV: { view: View; label: string; icon: typeof History }[] = [
  { view: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { view: 'changes', label: 'Mudanças', icon: FileDiff },
  { view: 'history', label: 'Histórico', icon: History },
  { view: 'tests', label: 'Testes', icon: FlaskConical },
  { view: 'export', label: 'Exportar', icon: Download },
];

export function Shell(props: { view: View; onNavigate(v: View): void; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:flex-row">
      <nav className="flex shrink-0 gap-1 border-b p-2 lg:w-52 lg:flex-col lg:border-r lg:border-b-0 lg:p-3">
        <div className="mr-2 flex items-center gap-2 px-2 py-1 font-semibold lg:mb-3 lg:mr-0">
          <GitBranch className="size-5" aria-hidden />
          <span>Gityx</span>
        </div>
        {NAV.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            type="button"
            aria-current={props.view === view ? 'page' : undefined}
            aria-label={label}
            onClick={() => props.onNavigate(view)}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
              props.view === view && 'bg-accent font-medium text-accent-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span className="hidden sm:inline" aria-hidden>{label}</span>
          </button>
        ))}
        <p className="mt-auto hidden px-2 text-xs text-muted-foreground lg:block">Local · sem IA · só leitura</p>
      </nav>
      <main className="min-w-0 flex-1 overflow-auto p-4">{props.children}</main>
      {props.aside && <aside className="min-w-0 border-t lg:w-[420px] lg:shrink-0 lg:overflow-hidden lg:border-t-0 lg:border-l">{props.aside}</aside>}
    </div>
  );
}
