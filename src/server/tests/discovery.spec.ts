import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { discover } from './discovery';
import { loadConfig } from './config';
import { emptyDir } from '../../../test/helpers/temp-repo';

function tree(files: Record<string, unknown>) {
  const dir = emptyDir();
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(join(dir, p, '..'), { recursive: true });
    writeFileSync(join(dir, p), typeof c === 'string' ? c : JSON.stringify(c));
  }
  return dir;
}

const run = (dir: string) => discover(dir, loadConfig(dir));

describe('discover', () => {
  it('finds jest, vitest, scripts and go modules', () => {
    const dir = tree({
      'package.json': { devDependencies: { jest: '30' } },
      'web/package.json': { devDependencies: { vitest: '3' } },
      'tool/package.json': { scripts: { test: 'node t.js' } },
      'api/go.mod': 'module example.com/api\n',
    });
    expect(run(dir).map((p) => [p.dir, p.kind])).toEqual([
      ['.', 'jest'],
      ['api', 'go'],
      ['tool', 'script'],
      ['web', 'vitest'],
    ]);
  });
  it('ignores the npm default test script and node_modules', () => {
    const dir = tree({
      'package.json': { scripts: { test: 'echo "Error: no test specified" && exit 1' } },
      'node_modules/x/package.json': { devDependencies: { jest: '1' } },
    });
    expect(run(dir)).toEqual([]);
  });
  it('uses config projects instead of discovery', () => {
    const dir = tree({
      'package.json': { devDependencies: { jest: '30' } },
      'sub/package.json': { devDependencies: { vitest: '3' } },
      '.gityx.json': { tests: { projects: [{ name: 'web', kind: 'node', dir: 'sub' }, { name: 'e2e', kind: 'command', dir: '.', command: ['npm', 'run', 'e2e'] }] } },
    });
    expect(run(dir)).toEqual([
      { name: 'web', kind: 'vitest', dir: 'sub' },
      { name: 'e2e', kind: 'command', dir: '.', command: ['npm', 'run', 'e2e'] },
    ]);
  });
});
