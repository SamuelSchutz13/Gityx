import { searchDiffs } from './search';
import type { FileDiff } from '../shared/types';

const file = (path: string, ...texts: string[]): FileDiff => ({
  path, status: 'modified', staged: false, binary: false, truncated: false, additions: texts.length, deletions: 0,
  hunks: [{ header: '@@', lines: texts.map((text, i) => ({ kind: 'add' as const, oldNo: null, newNo: i + 1, text })) }],
});

const files = [file('src/auth.ts', 'const token_a = 1;', 'const TOKEN_B = 2;'), file('README.md', 'nothing')];
const off = { caseSensitive: false, regex: false };

describe('searchDiffs', () => {
  it('is case-insensitive by default', () => {
    const { hits, error } = searchDiffs(files, 'token', off);
    expect(error).toBeNull();
    expect(hits).toEqual([
      { path: 'src/auth.ts', hunk: 0, line: 0, start: 6, end: 11 },
      { path: 'src/auth.ts', hunk: 0, line: 1, start: 6, end: 11 },
    ]);
  });
  it('respects case sensitivity', () => {
    expect(searchDiffs(files, 'token', { ...off, caseSensitive: true }).hits).toHaveLength(1);
  });
  it('supports regex', () => {
    expect(searchDiffs(files, 'tok.n_', { ...off, regex: true }).hits).toHaveLength(2);
  });
  it('reports an invalid regex', () => {
    const r = searchDiffs(files, '(', { ...off, regex: true });
    expect(r.hits).toEqual([]);
    expect(r.error).toMatch(/^Regex inválida: /);
  });
  it('terminates on zero-length matches', () => {
    expect(searchDiffs(files, '^', { ...off, regex: true }).hits).toEqual([]);
  });
  it('matches paths', () => {
    expect(searchDiffs(files, 'readme', off).hits).toEqual([{ path: 'README.md', hunk: -1, line: -1, start: 0, end: 6 }]);
  });
  it('treats special characters literally without regex', () => {
    expect(searchDiffs([file('a', 'a.b', 'axb')], 'a.b', off).hits).toHaveLength(1);
  });
  it('returns nothing for an empty query', () => {
    expect(searchDiffs(files, '', off)).toEqual({ hits: [], error: null });
  });
});
