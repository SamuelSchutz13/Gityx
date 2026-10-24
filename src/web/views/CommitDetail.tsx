import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '../lib/api';
import { fullDate } from '../lib/format';
import type { CommitDetail as Detail } from '../../server/shared/types';
import { DiffView } from './DiffView';

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
      <DiffView files={data.files} />
    </div>
  );
}
