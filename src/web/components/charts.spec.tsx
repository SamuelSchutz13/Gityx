import { fireEvent, render, screen } from '@testing-library/react';
import { BarChart, Donut, HBars, Punchcard } from './charts';

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

describe('Donut', () => {
  const rows = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((k, i) => ({ key: k, label: k.toUpperCase(), value: 70 - i * 10 }));

  it('folds beyond five slices into "outros" and labels every slice with its share', () => {
    const { container } = render(<Donut rows={rows} title="Linhas" otherLabel="outros" />);
    expect(container.querySelectorAll('[data-slice]')).toHaveLength(6);
    expect(screen.getByText('outros')).toBeInTheDocument();
    // A = 70 of 280 total
    expect(screen.getByText('25%')).toBeInTheDocument();
    // E = 30 and outros = F + G = 20 + 10 = 30, both of 280
    expect(screen.getAllByText('11%')).toHaveLength(2);
  });

  it('keeps colors tied to the entity order and shows a tooltip on hover', () => {
    const { container } = render(<Donut rows={rows.slice(0, 3)} title="Linhas" otherLabel="outros" />);
    const slices = container.querySelectorAll('[data-slice]');
    expect(slices[0].getAttribute('fill')).toBe('var(--series-1)');
    expect(slices[2].getAttribute('fill')).toBe('var(--series-3)');
    fireEvent.mouseEnter(slices[1]);
    expect(screen.getByRole('tooltip')).toHaveTextContent('B: 60 (33%)');
  });

  it('shows tiny shares as <1% instead of 0%', () => {
    render(<Donut rows={[{ key: 'a', label: 'A', value: 999 }, { key: 'b', label: 'B', value: 1 }]} title="x" otherLabel="o" />);
    expect(screen.getByText('<1%')).toBeInTheDocument();
    expect(screen.queryByText('0%')).toBeNull();
  });

  it('shows the total in the middle', () => {
    render(<Donut rows={rows.slice(0, 2)} title="Linhas" otherLabel="outros" center="130 linhas" />);
    expect(screen.getByText('130 linhas')).toBeInTheDocument();
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
