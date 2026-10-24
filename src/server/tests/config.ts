import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { BadPathError, confine } from '../repo/paths';

export interface ConfigProject {
  name: string;
  kind: 'node' | 'go' | 'command';
  dir: string;
  command?: string[];
}

export interface GityxConfig {
  timeoutMs: number;
  projects: ConfigProject[] | null;
}

export class ConfigError extends Error {
  constructor(msg: string) {
    super(`.gityx.json: ${msg}`);
  }
}

const UNITS: Record<string, number> = { ms: 1, s: 1000, m: 60000, h: 3600000 };

export function projectDir(root: string, dir: string): string {
  return dir === '.' || dir === '' ? resolve(root) : confine(root, dir);
}

export function loadConfig(root: string): GityxConfig {
  const file = join(root, '.gityx.json');
  const out: GityxConfig = { timeoutMs: 10 * 60000, projects: null };
  if (!existsSync(file)) return out;

  let raw: any;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new ConfigError(`JSON inválido (${(e as Error).message})`);
  }
  const tests = raw?.tests ?? {};

  if (tests.timeout !== undefined) {
    const m = /^(\d+)(ms|s|m|h)$/.exec(String(tests.timeout));
    if (!m) throw new ConfigError(`tests.timeout inválido: ${tests.timeout} (use 500ms, 30s, 5m ou 1h)`);
    out.timeoutMs = Number(m[1]) * UNITS[m[2]];
  }

  if (tests.projects !== undefined) {
    if (!Array.isArray(tests.projects)) throw new ConfigError('tests.projects deve ser uma lista');
    out.projects = tests.projects.map((p: any, i: number): ConfigProject => {
      const where = `tests.projects[${i}]`;
      if (typeof p?.name !== 'string' || !p.name) throw new ConfigError(`${where}.name é obrigatório`);
      if (!['node', 'go', 'command'].includes(p.kind)) throw new ConfigError(`${where}.kind deve ser node, go ou command`);
      if (typeof p.dir !== 'string') throw new ConfigError(`${where}.dir é obrigatório`);
      try {
        projectDir(root, p.dir);
      } catch (e) {
        if (e instanceof BadPathError) throw new ConfigError(`${where}.dir está fora do repositório`);
        throw e;
      }
      const project: ConfigProject = { name: p.name, kind: p.kind, dir: p.dir };
      if (p.kind === 'command') {
        if (!Array.isArray(p.command) || !p.command.length || !p.command.every((c: unknown) => typeof c === 'string')) {
          throw new ConfigError(`${where}.command deve ser uma lista de strings não vazia`);
        }
        project.command = p.command;
      }
      return project;
    });
  }
  return out;
}
