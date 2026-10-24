import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '../lib/api';
import { fullDate } from '../lib/format';
import type { CommitDetail as Detail } from '../../server/shared/types';

export function CommitDetail({ sha }: { sha: string }) {
  const { data, error, loading } = useApi<Detail>(`/api/commits/${sha}`);
  if (error) return <p className="text-sm text-destructive">Não foi possível carregar o commit: {error.message}</p>;
  if (loading || !data) return <Skeleton className="h-24 w-full" />;
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">{data.subject}</h2>
        {data.body && <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted-foreground">{data.body}</pre>}
        <p className="mt-2 text-xs text-muted-foreground">
          {data.author} &lt;{data.email}&gt; · {fullDate(data.time)} · <span className="font-mono">{data.sha.slice(0, 10)}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {data.parents.map((p) => <Badge key={p} variant="outline" className="font-mono">pai {p.slice(0, 7)}</Badge>)}
        </div>
      </div>
      <ul className="divide-y rounded-md border text-sm">
        {data.files.map((f) => (
          <li key={f.path} className="flex items-center gap-2 px-3 py-1.5">
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{f.path}</span>
            <span className="text-xs text-green-600 dark:text-green-400">+{f.additions}</span>
            <span className="text-xs text-red-600 dark:text-red-400">−{f.deletions}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
