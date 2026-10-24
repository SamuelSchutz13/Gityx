import { isAbsolute, relative, resolve } from 'node:path';

export class BadPathError extends Error {
  constructor(p: string) {
    super(`Caminho fora do repositório: ${p}`);
  }
}

export function confine(root: string, p: string): string {
  if (!p) throw new BadPathError(p);
  const abs = resolve(root, p);
  const fold = (s: string) => (process.platform === 'win32' ? s.toLowerCase() : s);
  const rel = relative(fold(resolve(root)), fold(abs));
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) throw new BadPathError(p);
  return abs;
}
