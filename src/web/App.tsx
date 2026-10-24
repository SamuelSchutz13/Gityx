import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useApi, useLive } from './lib/api';
import type { Dashboard as DashboardData } from '../server/shared/types';
import { View } from './views/Shell';
import { Frame, FrameCtx } from './views/Frame';
import { CommitGraph } from './views/CommitGraph';
import { CommitDetail } from './views/CommitDetail';
import { History } from './views/History';
import { Changes } from './views/Changes';
import { Dashboard } from './views/Dashboard';
import { Export } from './views/Export';
import { Tests } from './views/Tests';

const VIEWS: View[] = ['overview', 'changes', 'history', 'tests', 'export'];
const fromHash = (): View => {
  const v = location.hash.slice(1) as View;
  return VIEWS.includes(v) ? v : 'overview';
};

export function App() {
  const [view, setView] = useState<View>(fromHash);
  const [selected, setSelected] = useState<string | null>(null);
  const info = useApi<{ repo: string }>('/api/info');
  const dash = useApi<DashboardData>('/api/dashboard');
  useLive(() => dash.reload());
  useEffect(() => {
    const on = () => setView(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const p = dash.data?.pending;
  const status = p && (
    <>
      <span>{p.files} arquivos alterados</span>
      <span>
        <span className="text-success">+{p.additions}</span> <span className="text-destructive">−{p.deletions}</span>
      </span>
      {dash.data?.upstream && <span>{`${dash.data.upstream} ↑${dash.data.ahead} ↓${dash.data.behind}`}</span>}
    </>
  );
  const tree = { title: 'Árvore do Git', width: 420, content: <CommitGraph compact selected={selected} onSelect={setSelected} /> };

  return (
    <FrameCtx.Provider value={{ view, onNavigate: (v) => (location.hash = v), repo: info.data?.repo, branch: dash.data?.branch, status }}>
      {view === 'history' ? <History />
        : view === 'changes' ? <Changes tree={tree} />
        : view === 'tests' ? <Tests />
        : view === 'export' ? <Frame><Export /></Frame>
        : <Frame right={tree}><Dashboard /></Frame>}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-4xl">
          <DialogTitle className="sr-only">Commit</DialogTitle>
          {selected && <CommitDetail sha={selected} />}
        </DialogContent>
      </Dialog>
    </FrameCtx.Provider>
  );
}
