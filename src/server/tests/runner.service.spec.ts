import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AlreadyRunning, NeedsConfirmation, RunnerService } from './runner.service';
import { GitService } from '../git/git.service';
import { emptyDir } from '../../../test/helpers/temp-repo';

function runner(projects: { name: string; command: string[] }[], timeout = '10s') {
  const dir = emptyDir();
  const cfg = { tests: { timeout, projects: projects.map((p) => ({ ...p, kind: 'command', dir: '.' })) } };
  writeFileSync(join(dir, '.gityx.json'), JSON.stringify(cfg));
  return new RunnerService(new GitService(dir));
}

const node = (code: string) => [process.execPath, '-e', code];

describe('RunnerService', () => {
  it('asks for confirmation on the first run', () => {
    const r = runner([{ name: 'x', command: node('') }]);
    expect(() => r.start('all', false)).toThrow(NeedsConfirmation);
  });

  it('runs a command and reports only exit code and log', async () => {
    const r = runner([{ name: 'x', command: node('console.log("hello"); process.exit(1)') }]);
    r.start('all', true);
    const run = await r.wait();
    expect(run?.status).toBe('failed');
    expect(run?.projects[0]).toMatchObject({ status: 'failed', exitCode: 1, cases: null });
    expect(run?.projects[0].log).toContain('hello');
    expect(r.lastSummary()).toMatchObject({ status: 'failed', passed: 0, failed: 1 });
    // confirmation is remembered for the rest of the process
    r.start('all', false);
    await r.wait();
  });

  it('allows only one run at a time', async () => {
    const r = runner([{ name: 'x', command: node('setTimeout(()=>{},300)') }]);
    r.start('all', true);
    expect(() => r.start('all', true)).toThrow(AlreadyRunning);
    await r.wait();
  });

  it('cancels and kills the process tree', async () => {
    const r = runner([{ name: 'x', command: node('console.log(process.pid); setInterval(()=>{},1000)') }]);
    r.start('all', true);
    await new Promise((res) => setTimeout(res, 500));
    r.cancel();
    const run = await r.wait();
    expect(run?.status).toBe('cancelled');
    const pid = Number(run?.projects[0].log.trim().split('\n')[0]);
    expect(() => process.kill(pid, 0)).toThrow();
  });

  it('times out', async () => {
    const r = runner([{ name: 'x', command: node('setInterval(()=>{},1000)') }], '300ms');
    r.start('all', true);
    const run = await r.wait();
    expect(run?.projects[0].status).toBe('error');
    expect(run?.projects[0].log).toContain('Tempo limite excedido.');
  });

  it('reports a missing executable as error and runs only selected projects', async () => {
    const r = runner([{ name: 'a', command: ['definitely-not-a-binary-gityx'] }, { name: 'b', command: node('') }]);
    r.start(['a'], true);
    const run = await r.wait();
    expect(run?.projects.map((p) => [p.project.name, p.status])).toEqual([['a', 'error']]);
  });
});
