import { parseGoJson, parseJestJson } from './parsers';

describe('parseJestJson', () => {
  it('reads assertion results and suite failures', () => {
    const json = {
      testResults: [
        {
          name: '/r/a.spec.ts',
          status: 'failed',
          assertionResults: [
            { fullName: 'a works', status: 'passed', duration: 3, failureMessages: [] },
            { fullName: 'a breaks', status: 'failed', duration: 1, failureMessages: ['boom'] },
            { fullName: 'a later', status: 'pending', failureMessages: [] },
          ],
        },
        { name: '/r/b.spec.ts', status: 'failed', message: 'Cannot find module', assertionResults: [] },
      ],
    };
    const noise = 'some log line\n' + JSON.stringify(json) + '\n';
    expect(parseJestJson(noise)).toEqual([
      { name: 'a works', file: '/r/a.spec.ts', status: 'passed', durationMs: 3 },
      { name: 'a breaks', file: '/r/a.spec.ts', status: 'failed', durationMs: 1, message: 'boom' },
      { name: 'a later', file: '/r/a.spec.ts', status: 'skipped' },
      { name: '/r/b.spec.ts', file: '/r/b.spec.ts', status: 'error', message: 'Cannot find module' },
    ]);
  });
  it('returns [] when there is no JSON', () => {
    expect(parseJestJson('crashed')).toEqual([]);
  });
});

describe('parseGoJson', () => {
  it('reads test events and package failures', () => {
    const lines = [
      { Action: 'run', Package: 'p/a', Test: 'TestOk' },
      { Action: 'pass', Package: 'p/a', Test: 'TestOk', Elapsed: 0.01 },
      { Action: 'run', Package: 'p/a', Test: 'TestBad' },
      { Action: 'output', Package: 'p/a', Test: 'TestBad', Output: 'a_test.go:9: nope\n' },
      { Action: 'fail', Package: 'p/a', Test: 'TestBad', Elapsed: 0.02 },
      { Action: 'skip', Package: 'p/a', Test: 'TestSkip', Elapsed: 0 },
      { Action: 'fail', Package: 'p/a', Elapsed: 0.1 },
      { Action: 'output', Package: 'p/broken', Output: 'syntax error\n' },
      { Action: 'fail', Package: 'p/broken', Elapsed: 0 },
      { ImportPath: 'p/c', Action: 'build-fail' },
    ].map((l) => JSON.stringify(l));
    expect(parseGoJson(['garbage', ...lines].join('\n'))).toEqual([
      { name: 'p/a.TestOk', status: 'passed', durationMs: 10 },
      { name: 'p/a.TestBad', status: 'failed', durationMs: 20, message: 'a_test.go:9: nope\n' },
      { name: 'p/a.TestSkip', status: 'skipped', durationMs: 0 },
      { name: 'p/broken', status: 'error', message: 'syntax error\n' },
      { name: 'p/c', status: 'error', message: 'build failed' },
    ]);
  });
});
