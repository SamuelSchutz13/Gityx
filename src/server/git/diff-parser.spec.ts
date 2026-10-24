import { parseDiff } from './diff-parser';

const modified = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 1111111..2222222 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1,3 +1,3 @@ header',
  ' one',
  '-two',
  '+TWO',
  ' three',
  '@@ -10,2 +10,3 @@',
  ' ten',
  '+ten and a half',
  ' eleven',
  '',
].join('\n');

describe('parseDiff', () => {
  it('parses hunks with old/new line numbers', () => {
    const [f] = parseDiff(modified, true);
    expect(f).toMatchObject({ path: 'src/a.ts', status: 'modified', staged: true, binary: false, additions: 2, deletions: 1 });
    expect(f.hunks).toHaveLength(2);
    expect(f.hunks[0].header).toBe('@@ -1,3 +1,3 @@ header');
    expect(f.hunks[0].lines).toEqual([
      { kind: 'context', oldNo: 1, newNo: 1, text: 'one' },
      { kind: 'del', oldNo: 2, newNo: null, text: 'two' },
      { kind: 'add', oldNo: null, newNo: 2, text: 'TWO' },
      { kind: 'context', oldNo: 3, newNo: 3, text: 'three' },
    ]);
    expect(f.hunks[1].lines[1]).toEqual({ kind: 'add', oldNo: null, newNo: 11, text: 'ten and a half' });
  });

  it('detects renames', () => {
    const raw = ['diff --git a/old name.txt b/new name.txt', 'similarity index 100%', 'rename from old name.txt', 'rename to new name.txt', ''].join('\n');
    expect(parseDiff(raw, false)[0]).toMatchObject({ path: 'new name.txt', oldPath: 'old name.txt', status: 'renamed', hunks: [] });
  });

  it('detects binary, added and deleted files', () => {
    const raw = [
      'diff --git a/img.png b/img.png', 'new file mode 100644', 'index 0000000..1111111', 'Binary files /dev/null and b/img.png differ',
      'diff --git a/gone.txt b/gone.txt', 'deleted file mode 100644', 'index 1111111..0000000', '--- a/gone.txt', '+++ /dev/null', '@@ -1 +0,0 @@', '-bye', '',
    ].join('\n');
    const [img, gone] = parseDiff(raw, false);
    expect(img).toMatchObject({ path: 'img.png', status: 'added', binary: true });
    expect(gone).toMatchObject({ path: 'gone.txt', status: 'deleted', deletions: 1 });
  });

  it('ignores the no-newline marker and strips CR', () => {
    const raw = ['diff --git a/x b/x', '--- a/x', '+++ b/x', '@@ -1 +1 @@', '-a\r', '\\ No newline at end of file', '+b', ''].join('\n');
    const [f] = parseDiff(raw, false);
    expect(f.hunks[0].lines.map((l) => l.text)).toEqual(['a', 'b']);
  });
});
