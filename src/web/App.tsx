import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Shell, View } from './views/Shell';
import { CommitGraph } from './views/CommitGraph';
import { CommitDetail } from './views/CommitDetail';
import { History } from './views/History';

const VIEWS: View[] = ['overview', 'changes', 'history', 'tests', 'export'];
const fromHash = (): View => {
  const v = location.hash.slice(1) as View;
  return VIEWS.includes(v) ? v : 'overview';
};

export function App() {
  const [view, setView] = useState<View>(fromHash);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const on = () => setView(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const center =
    view === 'history' ? <History />
    : <div className="text-sm text-muted-foreground">{view}</div>;

  return (
    <>
      <Shell view={view} onNavigate={(v) => (location.hash = v)} aside={view === 'history' ? undefined : <CommitGraph compact selected={selected} onSelect={setSelected} />}>
        {center}
      </Shell>
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-3xl">
          <DialogTitle className="sr-only">Commit</DialogTitle>
          {selected && <CommitDetail sha={selected} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
