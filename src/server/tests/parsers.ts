import type { TestCase, TestStatus } from '../shared/types';

const JEST_STATUS: Record<string, TestStatus> = { passed: 'passed', failed: 'failed', pending: 'skipped', skipped: 'skipped', todo: 'skipped', disabled: 'skipped' };

// Jest `--json` and Vitest `--reporter=json` share the testResults[].assertionResults[] shape.
export function parseJestJson(stdout: string): TestCase[] {
  const start = stdout.indexOf('{"');
  const end = stdout.lastIndexOf('}');
  if (start < 0 || end < start) return [];
  let report: any;
  try {
    report = JSON.parse(stdout.slice(start, end + 1));
  } catch {
    return [];
  }
  const cases: TestCase[] = [];
  for (const suite of report.testResults ?? []) {
    const results = suite.assertionResults ?? [];
    if (!results.length && suite.status === 'failed') {
      cases.push({ name: suite.name, file: suite.name, status: 'error', message: suite.message || 'Falha ao carregar o arquivo de teste' });
    }
    for (const a of results) {
      const c: TestCase = { name: a.fullName || a.title, file: suite.name, status: JEST_STATUS[a.status] ?? 'error' };
      if (typeof a.duration === 'number') c.durationMs = a.duration;
      if (a.failureMessages?.length) c.message = a.failureMessages.join('\n');
      cases.push(c);
    }
  }
  return cases;
}

export function parseGoJson(stdout: string): TestCase[] {
  const cases = new Map<string, TestCase>();
  const output = new Map<string, string>();
  const pkgHasTests = new Set<string>();

  for (const line of stdout.split('\n')) {
    let ev: any;
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }
    if (ev.Action === 'build-fail') {
      cases.set(ev.ImportPath, { name: ev.ImportPath, status: 'error', message: 'build failed' });
      continue;
    }
    const key = ev.Test ? `${ev.Package}.${ev.Test}` : ev.Package;
    if (ev.Action === 'output') output.set(key, (output.get(key) ?? '') + ev.Output);
    if (!['pass', 'fail', 'skip'].includes(ev.Action)) continue;
    if (!ev.Test) {
      // Test events precede their package's final event, so a failed package without tests is a build/setup error.
      if (ev.Action === 'fail' && !pkgHasTests.has(ev.Package)) {
        cases.set(ev.Package, { name: ev.Package, status: 'error', message: output.get(ev.Package) ?? 'package failed' });
      }
      continue;
    }
    pkgHasTests.add(ev.Package);
    const c: TestCase = { name: key, status: ev.Action === 'pass' ? 'passed' : ev.Action === 'fail' ? 'failed' : 'skipped' };
    if (typeof ev.Elapsed === 'number') c.durationMs = Math.round(ev.Elapsed * 1000);
    if (c.status === 'failed' && output.has(key)) c.message = output.get(key);
    cases.set(key, c);
  }
  return [...cases.values()];
}
