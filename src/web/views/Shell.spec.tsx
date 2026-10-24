import { fireEvent, render, screen } from '@testing-library/react';
import { Shell } from './Shell';

describe('Shell', () => {
  it('renders the navigation and the three columns', () => {
    render(
      <Shell view="overview" onNavigate={() => {}} aside={<div>grafo</div>}>
        <div>centro</div>
      </Shell>,
    );
    for (const label of ['Visão geral', 'Mudanças', 'Histórico', 'Testes', 'Exportar']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText('centro')).toBeInTheDocument();
    expect(screen.getByText('grafo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Visão geral' })).toHaveAttribute('aria-current', 'page');
  });

  it('navigates', () => {
    const onNavigate = jest.fn();
    render(<Shell view="overview" onNavigate={onNavigate}>x</Shell>);
    fireEvent.click(screen.getByRole('button', { name: 'Mudanças' }));
    expect(onNavigate).toHaveBeenCalledWith('changes');
  });
});
