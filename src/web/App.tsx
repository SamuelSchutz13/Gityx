import { useEffect, useState } from 'react';
import { Shell, View } from './views/Shell';

const VIEWS: View[] = ['overview', 'changes', 'history', 'tests', 'export'];
const fromHash = (): View => {
  const v = location.hash.slice(1) as View;
  return VIEWS.includes(v) ? v : 'overview';
};

export function App() {
  const [view, setView] = useState<View>(fromHash);
  useEffect(() => {
    const on = () => setView(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  return (
    <Shell view={view} onNavigate={(v) => (location.hash = v)} aside={<div className="p-4 text-sm text-muted-foreground">Grafo</div>}>
      <div className="text-sm text-muted-foreground">{view}</div>
    </Shell>
  );
}
