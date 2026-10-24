import { render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import type { Dashboard as Data } from '../../server/shared/types';

const data: Data = {
  branch: 'main', upstream: 'origin/main', ahead: 2, behind: 1,
  pending: { files: 3, additions: 10, deletions: 4 },
  recent: [{ sha: 'a'.repeat(40), parents: [], author: 'Ana', email: 'a@x', time: 1700000000, refs: [], subject: 'primeiro' }],
  activity: Array.from({ length: 84 }, (_, i) => ({ day: `d${i}`, count: i % 5 })),
  authors: [{ name: 'Ana', count: 7 }],
  lastTest: { status: 'passed', passed: 5, failed: 0, finishedAt: 1700000000000 },
  stashes: 1, branches: 4,
};

beforeEach(() => {
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify(data) }) as any;
});

describe('Dashboard', () => {
  it('summarizes the repository', async () => {
    const { container } = render(<Dashboard />);
    expect(await screen.findByText('main')).toBeInTheDocument();
    expect(screen.getByText('origin/main')).toBeInTheDocument();
    expect(screen.getByText('↑2 ↓1')).toBeInTheDocument();
    expect(screen.getByText('primeiro')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-heat]')).toHaveLength(84);
  });
});
