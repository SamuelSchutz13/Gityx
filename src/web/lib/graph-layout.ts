import type { Commit } from '../../server/shared/types';

export interface GraphEdge {
  fromLane: number;
  toLane: number;
  parent: string;
}

export interface GraphRow {
  commit: Commit;
  lane: number;
  /** lanes that come from above and end in this commit (besides its own lane) */
  mergedFrom: number[];
  /** lanes that cross this row untouched */
  passThrough: number[];
  /** whether a line arrives from above into the commit's own lane */
  hasChild: boolean;
  edges: GraphEdge[];
  lanesAfter: number;
}

// Input must be ordered newest first (git log --date-order). Lane i waits for commit active[i].
export function assignLanes(commits: Commit[]): GraphRow[] {
  const active: (string | null)[] = [];
  const free = () => {
    const i = active.indexOf(null);
    return i === -1 ? active.length : i;
  };

  return commits.map((commit) => {
    const waiting = active.map((s, i) => (s === commit.sha ? i : -1)).filter((i) => i >= 0);
    const hasChild = waiting.length > 0;
    const lane = hasChild ? waiting[0] : free();
    const mergedFrom = waiting.slice(1);
    const passThrough = active.map((s, i) => (s !== null && s !== commit.sha ? i : -1)).filter((i) => i >= 0);
    for (const j of mergedFrom) active[j] = null;

    const edges: GraphEdge[] = [];
    const [first, ...rest] = commit.parents;
    active[lane] = first ?? null;
    if (first) edges.push({ fromLane: lane, toLane: lane, parent: first });
    for (const p of rest) {
      let k = active.indexOf(p);
      if (k === -1) {
        k = free();
        active[k] = p;
      }
      edges.push({ fromLane: lane, toLane: k, parent: p });
    }
    while (active.length && active[active.length - 1] === null) active.pop();
    return { commit, lane, mergedFrom, passThrough, hasChild, edges, lanesAfter: active.length };
  });
}
