import { act, render, screen } from '@testing-library/react';
import { App } from './App';

const dashboard = {
  branch: 'main', upstream: null, ahead: 0, behind: 0, pending: { files: 2, additions: 5, deletions: 1 },
  recent: [], activity: Array.from({ length: 84 }, (_, i) => ({ day: `d${i}`, count: 0 })), authors: [], lastTest: null, stashes: 0, branches: 1,
};
const responses: Record<string, unknown> = {
  '/api/info': { repo: 'demo' },
  '/api/dashboard': dashboard,
  '/api/changes': [],
  '/api/tests/projects': [],
  '/api/tests/run': null,
};

beforeEach(() => {
  globalThis.fetch = jest.fn(async (url: string) => {
    const key = Object.keys(responses).find((k) => url === k) ?? (url.startsWith('/api/history') ? 'history' : '');
    const body = key === 'history' ? [] : responses[key];
    return { ok: key !== '', status: key ? 200 : 404, text: async () => JSON.stringify(key ? body : {}) };
  }) as any;
});

describe('App', () => {
  it.each([
    ['', 'Árvore do Git'],
    ['#changes', 'Arquivos · 0'],
    ['#history', 'Filtros'],
    ['#tests', 'Rodar todos'],
    ['#export', 'Baixar'],
  ])('renders %s inside the GitView-style frame', async (hash, marker) => {
    location.hash = hash;
    render(<App />);
    expect(await screen.findByText(marker)).toBeInTheDocument();
    expect(await screen.findByText('demo')).toBeInTheDocument();
    expect((await screen.findAllByText('2 arquivos alterados')).length).toBeGreaterThan(0);
    await act(async () => {});
  });
});
