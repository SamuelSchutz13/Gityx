import { fireEvent, render, screen } from '@testing-library/react';
import { DiffView } from './DiffView';
import type { FileDiff } from '../../server/shared/types';

const base: FileDiff = {
  path: 'src/a.ts', status: 'modified', staged: false, binary: false, truncated: false, additions: 1, deletions: 1,
  hunks: [{
    header: '@@ -1,2 +1,2 @@',
    lines: [
      { kind: 'context', oldNo: 1, newNo: 1, text: 'keep token' },
      { kind: 'del', oldNo: 2, newNo: null, text: 'old' },
      { kind: 'add', oldNo: null, newNo: 2, text: 'new' },
    ],
  }],
};

describe('DiffView', () => {
  it('starts collapsed and opens on click', () => {
    render(<DiffView files={[base]} />);
    expect(screen.queryByText('@@ -1,2 +1,2 @@')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /src\/a\.ts/ }));
    expect(screen.getByText('@@ -1,2 +1,2 @@')).toBeInTheDocument();
  });

  it('shows old and new line numbers in separate columns', () => {
    render(<DiffView files={[base]} defaultOpen />);
    const del = screen.getByText('old').closest('tr')!;
    const cells = del.querySelectorAll('td');
    expect(cells[0].textContent).toBe('2');
    expect(cells[1].textContent).toBe('');
    const add = screen.getByText('new').closest('tr')!;
    expect(add.querySelectorAll('td')[1].textContent).toBe('2');
  });

  it('shows notices for binary, truncated and omitted files', () => {
    render(<DiffView files={[{ ...base, path: 'img.png', binary: true, hunks: [] }, { ...base, path: 'big.txt', truncated: true }]} defaultOpen />);
    expect(screen.getByText('Arquivo binário')).toBeInTheDocument();
    expect(screen.getByText(/Diff truncado/)).toBeInTheDocument();
  });

  it('marks search hits and the active one', () => {
    const hits = [{ file: 0, path: 'src/a.ts', hunk: 0, line: 0, start: 5, end: 10 }];
    const { container } = render(<DiffView files={[base]} hits={hits} activeHit={0} />);
    const mark = container.querySelector('mark[data-hit="active"]');
    expect(mark?.textContent).toBe('token');
  });

  it('keeps hits on the right copy when a path is both staged and unstaged', () => {
    const files = [{ ...base, staged: true }, base];
    const hits = [{ file: 1, path: 'src/a.ts', hunk: 0, line: 0, start: 5, end: 10 }];
    const { container } = render(<DiffView files={files} hits={hits} activeHit={0} />);
    const blocks = container.querySelectorAll('[data-slot="collapsible"]');
    expect(blocks[0].querySelector('mark')).toBeNull();
    expect(blocks[1].querySelector('mark')).not.toBeNull();
  });
});
