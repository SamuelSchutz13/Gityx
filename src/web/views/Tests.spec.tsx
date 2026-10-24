import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Tests } from './Tests';
import type { TestRun } from '../../server/shared/types';

const project = { name: 'e2e', kind: 'command' as const, dir: '.', command: ['npm', 'run', 'e2e'] };
const finished: TestRun = {
  id: '1', status: 'failed', startedAt: 0,
  projects: [{ project, status: 'failed', exitCode: 1, durationMs: 12, cases: null, log: 'boom' }],
};

function mockServer(handlers: Record<string, (init?: RequestInit) => [number, unknown]>) {
  const fn = jest.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url}`;
    const [status, body] = handlers[key]?.(init) ?? [404, {}];
    return { ok: status < 300, status, text: async () => JSON.stringify(body) };
  });
  globalThis.fetch = fn as any;
  return fn;
}

describe('Tests view', () => {
  it('asks for confirmation before the first run', async () => {
    const posts: unknown[] = [];
    mockServer({
      'GET /api/tests/projects': () => [200, [project]],
      'GET /api/tests/run': () => [200, null],
      'POST /api/tests/run': (init) => {
        const body = JSON.parse(String(init?.body));
        posts.push(body);
        return body.confirm ? [202, { ...finished, status: 'running' }] : [409, { needsConfirmation: true }];
      },
    });
    render(<Tests />);
    await screen.findByText('e2e');
    fireEvent.click(screen.getByRole('button', { name: 'Rodar todos' }));
    expect(await screen.findByText(/Os testes executam código deste repositório/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(posts).toEqual([{ projects: 'all' }, { projects: 'all', confirm: true }]));
  });

  it('explains runs without counts', async () => {
    mockServer({
      'GET /api/tests/projects': () => [200, [project]],
      'GET /api/tests/run': () => [200, finished],
    });
    render(<Tests />);
    expect(await screen.findByText('Sem contagem: comando personalizado, só código de saída e log.')).toBeInTheDocument();
    expect(screen.getByText(/código de saída 1/)).toBeInTheDocument();
  });

  it('shows config errors', async () => {
    mockServer({
      'GET /api/tests/projects': () => [400, { message: '.gityx.json: JSON inválido' }],
      'GET /api/tests/run': () => [200, null],
    });
    render(<Tests />);
    expect(await screen.findByText(/JSON inválido/)).toBeInTheDocument();
  });
});
