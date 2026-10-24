import { render } from '@testing-library/react';
import { highlightLine } from './highlight';

describe('highlightLine', () => {
  it('renders repository content as text, never as HTML', () => {
    const { container } = render(<div>{highlightLine('<b>x</b> <img src=x onerror=alert(1)>', 'a.html')}</div>);
    expect(container.textContent).toBe('<b>x</b> <img src=x onerror=alert(1)>');
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('adds token classes for known languages', () => {
    const { container } = render(<div>{highlightLine('const a = "s";', 'src/a.ts')}</div>);
    expect(container.textContent).toBe('const a = "s";');
    expect(container.querySelector('.hljs-keyword')?.textContent).toBe('const');
  });

  it('falls back to plain text', () => {
    const { container } = render(<div>{highlightLine('whatever', 'file.unknownext')}</div>);
    expect((container.firstChild as HTMLElement).innerHTML).toBe('whatever');
  });
});
