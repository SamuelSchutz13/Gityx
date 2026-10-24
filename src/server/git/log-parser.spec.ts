import { parseLog } from './log-parser';

const US = '\x1f';
const rec = (...f: string[]) => f.join(US);

describe('parseLog', () => {
  it('parses commits, parents and refs', () => {
    const raw = [
      rec('m'.repeat(40), `${'b'.repeat(40)} ${'x'.repeat(40)}`, 'Ana', 'ana@example.com', '1700000000', 'HEAD -> main, tag: v1', 'Merge x'),
      rec('a'.repeat(40), '', 'Bia', 'bia@example.com', '1600000000', '', 'root: first'),
    ].join('\0') + '\0';
    expect(parseLog(raw)).toEqual([
      { sha: 'm'.repeat(40), parents: ['b'.repeat(40), 'x'.repeat(40)], author: 'Ana', email: 'ana@example.com', time: 1700000000, refs: ['HEAD -> main', 'tag: v1'], subject: 'Merge x' },
      { sha: 'a'.repeat(40), parents: [], author: 'Bia', email: 'bia@example.com', time: 1600000000, refs: [], subject: 'root: first' },
    ]);
  });

  it('returns [] for empty output', () => {
    expect(parseLog('')).toEqual([]);
  });
});
