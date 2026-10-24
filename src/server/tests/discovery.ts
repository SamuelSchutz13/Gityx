import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
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
    const kind = nodeKind(dir);
    if (kind) found.push({ name: `${rel} · ${kind}`, kind, dir: rel });
    if (existsSync(join(dir, 'go.mod'))) found.push({ name: `${rel} · go`, kind: 'go', dir: rel });
    if (depth >= MAX_DEPTH) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith('.')) walk(join(dir, e.name), depth + 1);
    }
  };
  walk(root, 0);
  return found;
}
