import { ConfigError, loadConfig } from './config';
import { emptyDir } from '../../../test/helpers/temp-repo';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const withConfig = (cfg: unknown) => {
  const dir = emptyDir();
  writeFileSync(join(dir, '.gityx.json'), typeof cfg === 'string' ? cfg : JSON.stringify(cfg));
  return dir;
};

describe('loadConfig', () => {
  it('defaults without a file', () => {
    expect(loadConfig(emptyDir())).toEqual({ timeoutMs: 600000, projects: null });
  });
  it('parses timeout and projects', () => {
    const dir = withConfig({ tests: { timeout: '5m', projects: [{ name: 'e2e', kind: 'command', dir: '.', command: ['node', '-v'] }] } });
    expect(loadConfig(dir)).toEqual({ timeoutMs: 300000, projects: [{ name: 'e2e', kind: 'command', dir: '.', command: ['node', '-v'] }] });
  });
  it('parses ms, s and h', () => {
    expect(loadConfig(withConfig({ tests: { timeout: '200ms' } })).timeoutMs).toBe(200);
    expect(loadConfig(withConfig({ tests: { timeout: '2s' } })).timeoutMs).toBe(2000);
    expect(loadConfig(withConfig({ tests: { timeout: '1h' } })).timeoutMs).toBe(3600000);
  });
  it('rejects directories outside the repo', () => {
    expect(() => loadConfig(withConfig({ tests: { projects: [{ name: 'x', kind: 'go', dir: '../x' }] } }))).toThrow(ConfigError);
  });
  it('rejects a bad timeout, kind or command', () => {
    expect(() => loadConfig(withConfig({ tests: { timeout: 'soon' } }))).toThrow(ConfigError);
    expect(() => loadConfig(withConfig({ tests: { projects: [{ name: 'x', kind: 'ruby', dir: '.' }] } }))).toThrow(ConfigError);
    expect(() => loadConfig(withConfig({ tests: { projects: [{ name: 'x', kind: 'command', dir: '.', command: [] }] } }))).toThrow(ConfigError);
  });
  it('rejects invalid JSON', () => {
    expect(() => loadConfig(withConfig('{'))).toThrow(ConfigError);
  });
});
