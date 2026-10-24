import { fireEvent, render, screen } from '@testing-library/react';
import { CommitGraph } from './CommitGraph';
import type { Commit } from '../../server/shared/types';

const c = (sha: string, subject: string, refs: string[] = [], ...parents: string[]): Commit => ({
  sha, parents, author: 'Ana', email: 'ana@example.com', time: Math.floor(Date.now() / 1000) - 3600, refs, subject,
});

beforeEach(() => {
  const page = [c('b'.repeat(40), 'segundo commit', ['HEAD -> main', 'tag: v1'], 'a'.repeat(40)), c('a'.repeat(40), 'primeiro commit')];
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify(page) }) as any;
});

describe('CommitGraph', () => {
  it('renders one row per commit with refs', async () => {
    render(<CommitGraph onSelect={() => {}} />);
    expect(await screen.findByText('segundo commit')).toBeInTheDocument();
    expect(screen.getByText('primeiro commit')).toBeInTheDocument();
    expect(screen.getByText('HEAD -> main')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).toBe('/api/history?skip=0&limit=200');
  });

  it('selects a commit on click', async () => {
    const onSelect = jest.fn();
    render(<CommitGraph onSelect={onSelect} />);
    fireEvent.click(await screen.findByText('primeiro commit'));
    expect(onSelect).toHaveBeenCalledWith('a'.repeat(40));
  });

  it('passes filters to the API', async () => {
    render(<CommitGraph onSelect={() => {}} filters={{ author: 'Ana Maria', path: 'src/a b.ts' }} />);
    await screen.findByText('segundo commit');
    expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).toBe('/api/history?skip=0&limit=200&author=Ana+Maria&path=src%2Fa+b.ts');
  });
});
