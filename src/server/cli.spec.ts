import { realpathSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { NotARepoError, parseArgs, resolveRoot } from './cli';
import { emptyDir, makeRepo } from '../../test/helpers/temp-repo';

describe('parseArgs', () => {
  it('reads port, open and dir', () => {
    expect(parseArgs(['--port', '8080', '--open=false', '../x'])).toEqual({ dir: '../x', port: 8080, open: false });
  });
  it('accepts --port=N and has defaults', () => {
    expect(parseArgs(['--port=9000'])).toEqual({ dir: process.cwd(), port: 9000, open: true });
  });
  it('rejects unknown options', () => {
    expect(() => parseArgs(['--bogus'])).toThrow('Opção desconhecida: --bogus');
  });
  it('rejects an invalid port', () => {
    expect(() => parseArgs(['--port', 'abc'])).toThrow('Porta inválida: abc');
  });
});

describe('resolveRoot', () => {
  it('returns the toplevel from a subdirectory', async () => {
    const repo = await makeRepo();
    mkdirSync(join(repo.dir, 'sub', 'dir'), { recursive: true });
    expect(realpathSync(await resolveRoot(join(repo.dir, 'sub', 'dir')))).toBe(repo.dir);
    repo.cleanup();
  });
  it('rejects outside a repo', async () => {
    await expect(resolveRoot(emptyDir())).rejects.toBeInstanceOf(NotARepoError);
  });
});
