import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Shell } from './Shell';
import { LangProvider } from '../lib/i18n';
import { SettingsProvider } from '../lib/settings';

const Providers = ({ children }: { children: ReactNode }) => (
  <LangProvider>
    <SettingsProvider>{children}</SettingsProvider>
  </LangProvider>
);

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

  it('goes back to the overview from the logo', () => {
    const onNavigate = jest.fn();
    render(<Shell view="history" onNavigate={onNavigate}>x</Shell>);
    fireEvent.click(screen.getByRole('button', { name: 'Gityx: Visão geral' }));
    expect(onNavigate).toHaveBeenCalledWith('overview');
  });

  it('shows the Gityx logo mark', () => {
    const { container } = render(<Shell view="overview" onNavigate={() => {}}>x</Shell>);
    expect(container.querySelector('header svg[data-logo]')).not.toBeNull();
  });

  it('keeps language, theme and GitHub photos inside the settings popover', () => {
    render(<Providers><Shell view="overview" onNavigate={() => {}}>x</Shell></Providers>);
    expect(screen.queryByRole('button', { name: 'English' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Configurações' }));

    expect(screen.getByRole('button', { name: /Português \(Brasil\)/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /English/ }));
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Português \(Brasil\)/ }));

    const dark = document.documentElement.classList.contains('dark');
    fireEvent.click(screen.getByRole('button', { name: dark ? /Claro/ : /Escuro/ }));
    expect(document.documentElement.classList.contains('dark')).toBe(!dark);

    const photos = screen.getByRole('switch', { name: /Fotos do GitHub/ });
    expect(photos).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(photos);
    expect(photos).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem('gityx.githubPhotos')).toBe('1');
    fireEvent.click(photos);
  });

  it('collapses and restores a side pane', () => {
    render(<Shell view="overview" onNavigate={() => {}} right={{ title: 'Árvore do Git', content: <div>grafo</div> }}>x</Shell>);
    fireEvent.click(screen.getByRole('button', { name: 'Recolher Árvore do Git' }));
    expect(screen.queryByText('grafo')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar Árvore do Git' }));
    expect(screen.getByText('grafo')).toBeInTheDocument();
  });

});
