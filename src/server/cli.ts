import { GitService } from './git/git.service';

export interface CliArgs {
  dir: string;
  port: number;
  open: boolean;
}

export class NotARepoError extends Error {
  constructor() {
    super('Gityx: esta pasta não está dentro de um repositório Git.');
  }
}

function parsePort(v: string | undefined): number {
  const n = Number(v);
  if (!v || !Number.isInteger(n) || n < 0 || n > 65535) throw new Error(`Porta inválida: ${v}`);
  return n;
}

export function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { dir: process.cwd(), port: 0, open: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port') out.port = parsePort(argv[++i]);
    else if (a.startsWith('--port=')) out.port = parsePort(a.slice(7));
    else if (a === '--open' || a === '--open=true') out.open = true;
    else if (a === '--open=false') out.open = false;
    else if (a.startsWith('-')) throw new Error(`Opção desconhecida: ${a}`);
    else out.dir = a;
  }
  return out;
}

export async function resolveRoot(dir: string): Promise<string> {
  const top = await new GitService(dir).tryRun(['rev-parse', '--show-toplevel']);
  if (!top) throw new NotARepoError();
  return top.trim();
}
