import { fireEvent, render, screen } from '@testing-library/react';
import { LangProvider, initialLang, translate, useLang } from './i18n';

function Probe() {
  const { t, lang, setLang } = useLang();
  return (
    <div>
      <span>{t('Mudanças')}</span>
      <span>{t('{n} arquivos alterados', { n: 3 })}</span>
      <button onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}>toggle</button>
    </div>
  );
}

describe('i18n', () => {
  it('translates with interpolation and falls back to the Portuguese key', () => {
    expect(translate('en', 'Mudanças')).toBe('Changes');
    expect(translate('en', '{n} arquivos alterados', { n: 2 })).toBe('2 files changed');
    expect(translate('pt', '{n} arquivos alterados', { n: 2 })).toBe('2 arquivos alterados');
    expect(translate('en', 'texto sem tradução')).toBe('texto sem tradução');
  });

  it('picks the stored language, then the browser language', () => {
    localStorage.removeItem('gityx.lang');
    expect(initialLang('en-US')).toBe('en');
    expect(initialLang('pt-BR')).toBe('pt');
    localStorage.setItem('gityx.lang', 'en');
    expect(initialLang('pt-BR')).toBe('en');
    localStorage.setItem('gityx.lang', 'pt');
  });

  it('switches language at runtime and remembers it', () => {
    render(<LangProvider><Probe /></LangProvider>);
    expect(screen.getByText('Mudanças')).toBeInTheDocument();
    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByText('Changes')).toBeInTheDocument();
    expect(screen.getByText('3 files changed')).toBeInTheDocument();
    expect(localStorage.getItem('gityx.lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    fireEvent.click(screen.getByText('toggle'));
  });
});

describe('English dictionary', () => {
  it('has an entry for every literal t() key in the web app', () => {
    const { readdirSync, readFileSync, statSync } = jest.requireActual('node:fs');
    const { join } = jest.requireActual('node:path');
    const { EN } = jest.requireActual('./i18n');
    const files: string[] = [];
    const walk = (d: string) => readdirSync(d).forEach((n: string) => {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(n) && !/\.spec\./.test(n)) files.push(p);
    });
    walk(join(__dirname, '..'));
    const missing = new Set<string>();
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/\bt\('((?:[^'\\]|\\.)+)'/g)) if (!(m[1] in EN)) missing.add(m[1]);
    }
    expect([...missing]).toEqual([]);
  });
});
