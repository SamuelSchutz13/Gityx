import { fireEvent, render, screen } from '@testing-library/react';
import { Shell } from './Shell';

describe('Shell', () => {
  it('renders header tabs, panes and the status bar', () => {
    render(
      <Shell
        view="overview"
        onNavigate={() => {}}
        repo="demo"
        branch="main"
        left={{ title: 'Arquivos', content: <div>lista</div> }}
        right={{ title: 'Árvore do Git', content: <div>grafo</div> }}
        status={<span>3 mudanças</span>}
      >
        <div>centro</div>
      </Shell>,
    );
    for (const label of ['Visão geral', 'Mudanças', 'Histórico', 'Testes', 'Exportar']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('tab', { name: 'Visão geral' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('demo')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('centro')).toBeInTheDocument();
    expect(screen.getByText('lista')).toBeInTheDocument();
    expect(screen.getByText('grafo')).toBeInTheDocument();
    expect(screen.getByText('Árvore do Git')).toBeInTheDocument();
    expect(screen.getByText('3 mudanças')).toBeInTheDocument();
    expect(screen.getByText(/sem IA/)).toBeInTheDocument();
  });

  it('navigates through the tabs', () => {
    const onNavigate = jest.fn();
    render(<Shell view="overview" onNavigate={onNavigate}>x</Shell>);
    fireEvent.click(screen.getByRole('tab', { name: 'Mudanças' }));
    expect(onNavigate).toHaveBeenCalledWith('changes');
  });

  it('collapses and restores a side pane', () => {
    render(<Shell view="overview" onNavigate={() => {}} right={{ title: 'Árvore do Git', content: <div>grafo</div> }}>x</Shell>);
    fireEvent.click(screen.getByRole('button', { name: 'Recolher Árvore do Git' }));
    expect(screen.queryByText('grafo')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar Árvore do Git' }));
    expect(screen.getByText('grafo')).toBeInTheDocument();
  });

  it('toggles the theme', () => {
    render(<Shell view="overview" onNavigate={() => {}}>x</Shell>);
    const before = document.documentElement.classList.contains('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Alternar tema' }));
    expect(document.documentElement.classList.contains('dark')).toBe(!before);
  });
});
