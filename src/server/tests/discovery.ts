import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import type { TestProject } from '../shared/types';
import { ConfigError, GityxConfig, projectDir } from './config';

const SKIP = new Set(['node_modules', 'vendor', '.git', 'testdata', 'dist']);
const MAX_DEPTH = 3;

function nodeKind(dir: string): TestProject['kind'] | null {
  const file = join(dir, 'package.json');
  if (!existsSync(file)) return null;
  let pkg: any;
  try {
    pkg = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps.vitest) return 'vitest';
  if (deps.jest) return 'jest';
  const test = pkg.scripts?.test;
  if (typeof test === 'string' && !test.includes('no test specified')) return 'script';
  return null;
}

function readSmall(file: string): string {
  try {
    return readFileSync(file, 'utf8').slice(0, 200_000);
  } catch {
    return '';
  }
}

function otherRunners(dir: string, files: string[]): [string, string[]][] {
  const has = (n: string) => files.includes(n);
  const out: [string, string[]][] = [];
  if (has('pom.xml')) out.push(['maven', ['mvn', 'test']]);
  if (files.some((f) => /^build\.gradle(\.kts)?$/.test(f))) {
    out.push(['gradle', has('gradlew') ? [process.platform === 'win32' ? 'gradlew.bat' : './gradlew', 'test'] : ['gradle', 'test']]);
  }
  if (files.some((f) => /\.sln$/.test(f) || /tests?\.(cs|fs)proj$/i.test(f))) out.push(['dotnet', ['dotnet', 'test']]);
  if (has('phpunit.xml') || has('phpunit.xml.dist')) out.push(['phpunit', ['vendor/bin/phpunit']]);
  const pytest =
    has('pytest.ini') ||
    has('conftest.py') ||
    (has('pyproject.toml') && readSmall(join(dir, 'pyproject.toml')).includes('pytest')) ||
    (has('setup.cfg') && readSmall(join(dir, 'setup.cfg')).includes('[tool:pytest]')) ||
    files.some((f) => /^requirements.*\.txt$/.test(f) && /^pytest\b/m.test(readSmall(join(dir, f))));
  if (pytest) out.push(['pytest', ['python', '-m', 'pytest']]);
  if (has('.rspec')) out.push(['rspec', ['bundle', 'exec', 'rspec']]);
  if (has('Cargo.toml')) out.push(['cargo', ['cargo', 'test']]);
  return out;
}

export function discover(root: string, config: GityxConfig): TestProject[] {
  if (config.projects) {
    return config.projects.map((p) => {
      if (p.kind !== 'node') return { ...p, kind: p.kind };
      const kind = nodeKind(projectDir(root, p.dir));
      if (!kind) throw new ConfigError(`nenhum Jest, Vitest ou script test em ${p.dir}`);
      return { name: p.name, kind, dir: p.dir };
    });
  }

  const found: TestProject[] = [];
  const walk = (dir: string, depth: number) => {
    const rel = relative(root, dir).split('\\').join('/') || '.';
    const label = rel === '.' ? basename(root) : rel;
    const kind = nodeKind(dir);
    if (kind) found.push({ name: `${label} · ${kind}`, kind, dir: rel });
    if (existsSync(join(dir, 'go.mod'))) found.push({ name: `${label} · go`, kind: 'go', dir: rel });
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    // Other ecosystems run as plain commands: Gityx shows their exit code and log, never invented counts.
    for (const [tool, command] of otherRunners(dir, entries.filter((e) => e.isFile()).map((e) => e.name))) {
      found.push({ name: `${label} · ${tool}`, kind: 'command', dir: rel, command });
    }
    if (depth >= MAX_DEPTH) return;
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith('.')) walk(join(dir, e.name), depth + 1);
    }
  };
  walk(root, 0);
  return found;
}
