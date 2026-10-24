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
  const stats = {
    totalCommits: 42, contributors: 3, firstCommit: 1600000000, lastTag: 'v2.0.0', trackedFiles: 120,
    languages: [{ name: 'ts', files: 80 }, { name: '__other__', files: 5 }],
    hotFiles: [{ path: 'src/app.ts', changes: 9 }],
    weekly: Array.from({ length: 26 }, (_, i) => ({ week: `2026-0${1 + (i % 9)}-01`, count: i })),
    punchcard: Array.from({ length: 7 }, () => Array(24).fill(0)),
    linesByLanguage: [{ name: 'ts', lines: 900 }, { name: 'css', lines: 100 }],
    totalLines: 1000,
    merges: 4,
    commitTypes: [{ type: 'feat', count: 6 }, { type: 'fix', count: 2 }],
    frameworks: [{ name: 'React', version: '19.1.0', category: 'framework', source: 'package.json' }, { name: 'Docker', category: 'infra', source: 'Dockerfile' }],
  };
  globalThis.fetch = jest.fn(async (url: string) => ({ ok: true, status: 200, text: async () => JSON.stringify(url === '/api/stats' ? stats : data) })) as any;
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
    expect(await screen.findByText('v2.0.0')).toBeInTheDocument();
    expect(screen.getAllByText('.ts').length).toBe(2);
    expect(screen.getByText('outros')).toBeInTheDocument();
    expect(screen.getByText('src/app.ts')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-bar]')).toHaveLength(26);
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(168);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('19.1.0')).toBeInTheDocument();
    expect(screen.getByText('Infraestrutura')).toBeInTheDocument();
    expect(screen.getByText('Funcionalidades (feat)')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slice]')).toHaveLength(4);
  });
});
