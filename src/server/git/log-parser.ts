import type { Commit } from '../shared/types';

// Use with `-z`: records end in NUL, fields are split by the unit separator.
export const LOG_FORMAT = '--format=%H%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%D%x1f%s';

export function parseRecord(rec: string): Commit {
  const [sha, parents, author, email, time, refs, subject] = rec.split('\x1f');
  return {
    sha,
    parents: parents ? parents.split(' ') : [],
    author,
    email,
    time: Number(time),
    refs: refs ? refs.split(', ') : [],
    subject: subject ?? '',
  };
}

export function parseLog(raw: string): Commit[] {
  return raw
    .split('\0')
    .map((r) => r.replace(/^\n/, ''))
    .filter(Boolean)
    .map(parseRecord);
}
