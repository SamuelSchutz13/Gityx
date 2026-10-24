import { Chip, Tone } from '@/components/kit';
import type { FileDiff } from '../../server/shared/types';

export const STATUS_CHIP: Record<FileDiff['status'], { label: string; tone: Tone }> = {
  added: { label: 'novo', tone: 'success' },
  untracked: { label: 'novo', tone: 'success' },
  modified: { label: 'modificado', tone: 'warning' },
  renamed: { label: 'renomeado', tone: 'info' },
  deleted: { label: 'removido', tone: 'danger' },
};

/** Git ref as a chip: HEAD in blue, tags in amber, remote branches in violet, local branches in green. */
export function RefChip({ name }: { name: string }) {
  if (name.startsWith('tag: ')) return <Chip tone="warning" mono>{name.slice(5)}</Chip>;
  if (name.startsWith('HEAD')) return <Chip tone="info" mono>{name}</Chip>;
  // shortcut: only the usual remote names count as remote; local "feat/x" branches also contain a slash.
  if (/^(origin|upstream)\//.test(name)) return <Chip tone="violet" mono>{name}</Chip>;
  return <Chip tone="success" mono>{name}</Chip>;
}
