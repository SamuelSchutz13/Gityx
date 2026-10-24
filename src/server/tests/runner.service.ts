import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import spawn from 'cross-spawn';
import { Subject } from 'rxjs';
import { GitService } from '../git/git.service';
import type { ProjectRun, TestProject, TestRun, TestRunSummary } from '../shared/types';
import { loadConfig, projectDir } from './config';
import { discover } from './discovery';
import { killTree } from './kill-tree';
import { parseGoJson, parseJestJson } from './parsers';

export class NeedsConfirmation extends Error {}
export class AlreadyRunning extends Error {}
export class UnknownProject extends Error {}

const MAX_LOG = 2 * 1024 * 1024;

function lockfileTool(dir: string, root: string): string {
  for (const d of [dir, root]) {
    if (existsSync(join(d, 'pnpm-lock.yaml'))) return 'pnpm';
    if (existsSync(join(d, 'yarn.lock'))) return 'yarn';
  }
  return 'npm';
}

@Injectable()
export class RunnerService implements OnModuleDestroy {
  readonly run$ = new Subject<TestRun>();
  private confirmed = false;
  private run: TestRun | null = null;
  private done: Promise<TestRun> | null = null;
  private child: ChildProcess | null = null;
  private cancelled = false;
  private summary: TestRunSummary | null = null;

  constructor(private readonly git: GitService) {}

  projects(): TestProject[] {
    return discover(this.git.root, loadConfig(this.git.root));
  }

  current(): TestRun | null {
    return this.run;
  }

  lastSummary(): TestRunSummary | null {
    return this.summary;
  }

  wait(): Promise<TestRun | null> {
    return this.done ?? Promise.resolve(this.run);
  }

  start(names: string[] | 'all', confirm: boolean): TestRun {
    if (this.run?.status === 'running') throw new AlreadyRunning();
    if (!this.confirmed && !confirm) throw new NeedsConfirmation();
    const config = loadConfig(this.git.root);
    const all = discover(this.git.root, config);
    const chosen = names === 'all' ? all : names.map((n) => all.find((p) => p.name === n) ?? (() => { throw new UnknownProject(n); })());
    this.confirmed = true;
    this.cancelled = false;
    const run: TestRun = {
      id: randomUUID(),
      status: 'running',
      startedAt: Date.now(),
      projects: chosen.map((project) => ({ project, status: 'pending', exitCode: null, durationMs: 0, cases: null, log: '' })),
    };
    this.run = run;
    this.emit();
    this.done = this.execute(run, config.timeoutMs);
    return run;
  }

  cancel(): void {
    if (this.run?.status !== 'running') return;
    this.cancelled = true;
    if (this.child?.pid) killTree(this.child.pid);
  }

  onModuleDestroy() {
    this.cancel();
    this.run$.complete();
  }

  private emit() {
    if (this.run) this.run$.next(this.run);
  }

  private async execute(run: TestRun, timeoutMs: number): Promise<TestRun> {
    for (const pr of run.projects) {
      if (this.cancelled) {
        pr.status = 'cancelled';
        continue;
      }
      await this.runProject(pr, timeoutMs);
    }
    const statuses = run.projects.map((p) => p.status);
    run.status = this.cancelled ? 'cancelled' : statuses.some((s) => s === 'failed' || s === 'error') ? 'failed' : 'passed';
    const cases = run.projects.flatMap((p) => p.cases ?? []);
    const counted = run.projects.filter((p) => p.cases === null);
    this.summary = {
      status: run.status,
      passed: cases.filter((c) => c.status === 'passed').length + counted.filter((p) => p.status === 'passed').length,
      failed: cases.filter((c) => c.status === 'failed' || c.status === 'error').length + counted.filter((p) => p.status === 'failed' || p.status === 'error').length,
      finishedAt: Date.now(),
    };
    this.child = null;
    this.emit();
    return run;
  }

  private command(p: TestProject, dir: string): string[] {
    switch (p.kind) {
      case 'jest':
        return [process.execPath, join(dir, 'node_modules', 'jest', 'bin', 'jest.js'), '--json'];
      case 'vitest':
        return [process.execPath, join(dir, 'node_modules', 'vitest', 'vitest.mjs'), 'run', '--reporter=json'];
      case 'script':
        return [lockfileTool(dir, this.git.root), 'test'];
      case 'go':
        return ['go', 'test', '-json', './...'];
      case 'command':
        return p.command!;
    }
  }

  private runProject(pr: ProjectRun, timeoutMs: number): Promise<void> {
    const dir = projectDir(this.git.root, pr.project.dir);
    const [cmd, ...args] = this.command(pr.project, dir);
    pr.status = 'running';
    this.emit();
    const started = Date.now();
    let stdout = '';
    const append = (chunk: Buffer | string) => {
      if (pr.log.length < MAX_LOG) pr.log += chunk.toString();
      if (pr.log.length >= MAX_LOG && !pr.log.endsWith('[log truncado]\n')) pr.log = pr.log.slice(0, MAX_LOG) + '\n[log truncado]\n';
    };

    if ((pr.project.kind === 'jest' || pr.project.kind === 'vitest') && !existsSync(args[0])) {
      pr.status = 'error';
      pr.log = 'jest/vitest não está instalado neste projeto (rode npm install).\n';
      this.emit();
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let timedOut = false;
      const child = spawn(cmd, args, {
        cwd: dir,
        env: { ...process.env, FORCE_COLOR: '0', CI: '1' },
        detached: process.platform !== 'win32',
        windowsHide: true,
      });
      this.child = child;
      const timer = setTimeout(() => {
        timedOut = true;
        if (child.pid) killTree(child.pid);
      }, timeoutMs);
      child.stdout?.on('data', (d) => {
        stdout += d;
        append(d);
      });
      child.stderr?.on('data', append);
      const finish = (code: number | null, error?: Error) => {
        clearTimeout(timer);
        pr.durationMs = Date.now() - started;
        pr.exitCode = code;
        if (pr.project.kind === 'jest' || pr.project.kind === 'vitest') pr.cases = parseJestJson(stdout);
        else if (pr.project.kind === 'go') pr.cases = parseGoJson(stdout);
        const failedCases = (pr.cases ?? []).some((c) => c.status === 'failed' || c.status === 'error');
        if (error) {
          pr.status = 'error';
          append(`Não foi possível executar ${cmd}: ${error.message}\n`);
        } else if (timedOut) {
          pr.status = 'error';
          append('Tempo limite excedido.\n');
        } else if (this.cancelled) pr.status = 'cancelled';
        else pr.status = code === 0 && !failedCases ? 'passed' : 'failed';
        this.emit();
        resolve();
      };
      let spawnError: Error | undefined;
      child.on('error', (e) => (spawnError = e));
      child.on('close', (code) => finish(code, spawnError));
    });
  }
}
