import { fireEvent, render, screen } from '@testing-library/react';
import { BarChart, HBars, Punchcard } from './charts';

describe('BarChart', () => {
  const data = [3, 0, 5].map((v, i) => ({ key: `w${i}`, label: `semana ${i}`, value: v, tip: `semana ${i}: ${v} commits` }));

  it('draws one bar per value and a tooltip on hover', () => {
    const { container } = render(<BarChart data={data} title="Commits" />);
    const bars = container.querySelectorAll('[data-bar]');
    expect(bars).toHaveLength(3);
    fireEvent.mouseEnter(bars[2]);
    expect(screen.getByRole('tooltip')).toHaveTextContent('semana 2: 5 commits');
    fireEvent.mouseLeave(bars[2]);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('offers a table view', () => {
    render(<BarChart data={data} title="Commits" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver tabela' }));
    expect(screen.getByRole('table')).toHaveTextContent('semana 1');
    expect(screen.getByRole('table')).toHaveTextContent('5');
  });
});

describe('HBars', () => {
  it('labels every row with its value', () => {
    render(<HBars rows={[{ key: 'ts', label: 'ts', value: 10 }, { key: 'md', label: 'md', value: 2 }]} />);
    expect(screen.getByText('ts')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

describe('Punchcard', () => {
  it('draws 7 x 24 cells with tooltips', () => {
    const grid = Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => (d === 1 && h === 9 ? 4 : 0)));
    const { container } = render(<Punchcard grid={grid} />);
    const cells = container.querySelectorAll('[data-cell]');
    expect(cells).toHaveLength(168);
    fireEvent.mouseEnter(cells[24 + 9]);
    expect(screen.getByRole('tooltip')).toHaveTextContent('seg às 9h: 4 commits');
  });
});
