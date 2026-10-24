import { assignLanes } from './graph-layout';
import type { Commit } from '../../server/shared/types';

const c = (sha: string, ...parents: string[]): Commit => ({ sha, parents, author: 'a', email: 'e', time: 0, refs: [], subject: sha });

describe('assignLanes', () => {
  it('keeps a linear history on lane 0', () => {
    const rows = assignLanes([c('C', 'B'), c('B', 'A'), c('A')]);
    expect(rows.map((r) => r.lane)).toEqual([0, 0, 0]);
    expect(rows[0].edges).toEqual([{ fromLane: 0, toLane: 0, parent: 'B' }]);
    expect(rows[2].edges).toEqual([]);
    expect(rows[2].lanesAfter).toBe(0);
  });

  it('opens a lane for a merge and closes it at the fork point', () => {
    // M merges X into B; both B and X come from A.
    const rows = assignLanes([c('M', 'B', 'X'), c('X', 'A'), c('B', 'A'), c('A')]);
    expect(rows.map((r) => [r.commit.sha, r.lane])).toEqual([['M', 0], ['X', 1], ['B', 0], ['A', 0]]);
    expect(rows[0].edges).toEqual([
      { fromLane: 0, toLane: 0, parent: 'B' },
      { fromLane: 0, toLane: 1, parent: 'X' },
    ]);
    expect(rows[0].lanesAfter).toBe(2);
    // X's lane continues towards A, then A collapses both lanes into lane 0
    expect(rows[1].edges).toEqual([{ fromLane: 1, toLane: 1, parent: 'A' }]);
    expect(rows[2].lanesAfter).toBe(2);
    expect(rows[3].mergedFrom).toEqual([1]);
    expect(rows[3].lanesAfter).toBe(0);
  });

  it('handles two roots and branch tips without children', () => {
    const rows = assignLanes([c('F', 'R1'), c('G', 'R2'), c('R1'), c('R2')]);
    expect(rows.map((r) => r.lane)).toEqual([0, 1, 0, 1]);
    expect(rows[3].lanesAfter).toBe(0);
  });

  it('keeps the lane of a parent that is not loaded yet open', () => {
    const rows = assignLanes([c('B', 'A')]);
    expect(rows[0].lanesAfter).toBe(1);
  });

  it('does not grow lanes for hidden parents when filtering', () => {
    // --author keeps parents that are not in the result, so every row would open a lane forever.
    const rows = assignLanes([c('C', 'x1'), c('B', 'x2'), c('A', 'x3')], { dropMissingParents: true });
    expect(rows.map((r) => r.lane)).toEqual([0, 0, 0]);
    expect(Math.max(...rows.map((r) => r.lanesAfter))).toBe(0);
    expect(assignLanes([c('C', 'x1'), c('B', 'x2')]).map((r) => r.lane)).toEqual([0, 1]);
  });

  it('reuses freed lanes', () => {
    const rows = assignLanes([c('T1', 'R'), c('T2', 'Q'), c('Q'), c('T3', 'R'), c('R')]);
    expect(rows.map((r) => [r.commit.sha, r.lane])).toEqual([['T1', 0], ['T2', 1], ['Q', 1], ['T3', 1], ['R', 0]]);
  });
});
