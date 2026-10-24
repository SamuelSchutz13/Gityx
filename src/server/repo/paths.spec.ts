import { join, resolve } from 'node:path';
import { BadPathError, confine } from './paths';

const root = resolve('/repo/root');

describe('confine', () => {
  it('resolves paths inside the root', () => {
    expect(confine(root, 'a b/ç.txt')).toBe(join(root, 'a b', 'ç.txt'));
  });
  it('rejects escapes', () => {
    expect(() => confine(root, '../x')).toThrow(BadPathError);
    expect(() => confine(root, resolve('/etc/passwd'))).toThrow(BadPathError);
    expect(() => confine(root, '')).toThrow(BadPathError);
  });
  it('rejects a sibling sharing the prefix', () => {
    expect(() => confine(root, '../root-evil/x')).toThrow(BadPathError);
  });
});
