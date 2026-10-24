import { render, screen } from '@testing-library/react';
import { CommitDetail } from './CommitDetail';

const detail = (files: number) => ({
  sha: 'a'.repeat(40), parents: ['b'.repeat(40)], author: 'Ana', email: 'a@x', time: 1700000000, refs: [], subject: 'feat: x', body: '',
  files: Array.from({ length: files }, (_, i) => ({ path: `f${i}.ts`, status: 'modified', staged: false, binary: false, truncated: false, additions: 1, deletions: 0, hunks: [] })),
});

const serve = (body: unknown) => {
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify(body) }) as any;
};

describe('CommitDetail', () => {
  it('uses the singular for one file', async () => {
    serve(detail(1));
    render(<CommitDetail sha={'a'.repeat(40)} />);
    expect(await screen.findByText(/em 1 arquivo$/)).toBeInTheDocument();
  });

  it('uses the plural for several files', async () => {
    serve(detail(3));
    render(<CommitDetail sha={'a'.repeat(40)} />);
    expect(await screen.findByText(/em 3 arquivos$/)).toBeInTheDocument();
  });
});
