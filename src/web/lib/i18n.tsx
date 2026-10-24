import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { setLocale } from './format';

export type Lang = 'pt' | 'en';
type Vars = Record<string, string | number>;
const KEY = 'gityx.lang';

// Keys are the Portuguese text itself, so pt needs no table and a missing entry falls back to Portuguese.
export const EN: Record<string, string> = {
  'Visão geral': 'Overview',
  'Mudanças': 'Changes',
  'Histórico': 'History',
  'Testes': 'Tests',
  'Exportar': 'Export',
  'Telas': 'Views',
  'Idioma': 'Language',
  'Alternar tema': 'Toggle theme',
  'Tema claro': 'Light theme',
  'Tema escuro': 'Dark theme',
  'Recolher {x}': 'Collapse {x}',
  'Mostrar {x}': 'Show {x}',
  'Servido só nesta máquina (127.0.0.1)': 'Served only on this machine (127.0.0.1)',
  'ao vivo': 'live',
  'local · sem IA · só leitura': 'local · no AI · read-only',
  '{n} arquivos alterados': '{n} files changed',
  'Árvore do Git': 'Git tree',
  'Clique num commit da árvore para ver a mensagem, os arquivos e o diff.': 'Click a commit in the tree to see its message, files and diff.',
  'HEAD destacado': 'detached HEAD',
  'sem upstream': 'no upstream',
  'Working tree limpo': 'Clean working tree',
  'mudanças pendentes': 'pending changes',
  'Testes não executados': 'Tests not run',
  'Testes aprovados': 'Tests passed',
  'Testes falharam': 'Tests failed',
  '{p} ok · {f} falhas': '{p} passed · {f} failed',
  'nesta sessão': 'in this session',
  'passou': 'passed',
  'falhou': 'failed',
  'Atividade · {n} commits em 12 semanas': 'Activity · {n} commits in 12 weeks',
  'menos': 'less',
  'mais': 'more',
  'Repositório': 'Repository',
  'sem commits': 'no commits',
  'Último commit': 'Last commit',
  'Quem mais comitou': 'Top committers',
  'nenhum commit': 'no commits',
  'Não foi possível carregar o resumo: {e}': 'Could not load the summary: {e}',
  '{d}: {n} commits': '{d}: {n} commits',
  'Contribuidores': 'Contributors',
  'Idade do repositório': 'Repository age',
  'Primeiro commit {t}': 'First commit {t}',
  'Última tag': 'Latest tag',
  'nenhuma': 'none',
  'Arquivos rastreados': 'Tracked files',
  'Commits por semana · 26 semanas': 'Commits per week · 26 weeks',
  'semana de {d}: {n} commits': 'week of {d}: {n} commits',
  'Linguagens · arquivos por extensão': 'Languages · files by extension',
  'outros': 'other',
  'sem extensão': 'no extension',
  '{n} arquivos': '{n} files',
  'Arquivos mais alterados · 90 dias': 'Most changed files · 90 days',
  '{n} alterações': '{n} changes',
  'Quando os commits acontecem · último ano': 'When commits happen · last year',
  'Sem dados no período.': 'No data in this period.',
  'Ver tabela': 'Show table',
  'Ver gráfico': 'Show chart',
  'dom': 'Sun', 'seg': 'Mon', 'ter': 'Tue', 'qua': 'Wed', 'qui': 'Thu', 'sex': 'Fri', 'sáb': 'Sat',
  '{d} às {h}h: {n} commits': '{d} at {h}:00: {n} commits',
  'Staged': 'Staged',
  'Não staged': 'Unstaged',
  'Não rastreados': 'Untracked',
  'Filtrar arquivos...': 'Filter files...',
  'Working tree limpo.': 'Clean working tree.',
  'Arquivos · {n}': 'Files · {n}',
  'Buscar nos diffs (Enter: próxima, Shift+Enter: anterior)': 'Search diffs (Enter: next, Shift+Enter: previous)',
  'Diferenciar maiúsculas': 'Match case',
  'Expressão regular': 'Regular expression',
  'Ocorrência anterior': 'Previous match',
  'Próxima ocorrência': 'Next match',
  'nenhuma ocorrência': 'no matches',
  'Atualizar': 'Refresh',
  'Não foi possível ler as mudanças: {e}': 'Could not read changes: {e}',
  'Os diffs se atualizam sozinhos quando um arquivo muda. Clique num arquivo à esquerda para ir até ele.': 'Diffs update by themselves when a file changes. Click a file on the left to jump to it.',
  'Nenhuma mudança no working tree': 'No changes in the working tree',
  'Edite um arquivo do repositório e o diff aparece aqui na hora.': 'Edit a file in the repository and its diff shows up here right away.',
  'novo': 'new',
  'modificado': 'modified',
  'renomeado': 'renamed',
  'removido': 'deleted',
  'Conteúdo omitido: arquivo potencialmente sensível.': 'Content omitted: potentially sensitive file.',
  'Arquivo binário': 'Binary file',
  'Diff truncado: arquivo grande demais para exibir.': 'Diff truncated: file too large to show.',
  'Sem mudanças de conteúdo.': 'No content changes.',
  'Diff truncado: só as primeiras 5000 linhas aparecem.': 'Diff truncated: only the first 5000 lines are shown.',
  'Nenhuma mudança no working tree.': 'No changes in the working tree.',
  'Filtros': 'Filters',
  'Autor': 'Author',
  'Caminho': 'Path',
  'Desde': 'Since',
  'Até': 'Until',
  'Filtrar': 'Filter',
  'Limpar': 'Clear',
  'Inspetor': 'Inspector',
  'Escolha um commit no grafo para ver os detalhes.': 'Pick a commit in the graph to see its details.',
  'Não foi possível carregar o histórico: {e}': 'Could not load history: {e}',
  'Nenhum commit ainda.': 'No commits yet.',
  'Não foi possível carregar o commit: {e}': 'Could not load the commit: {e}',
  'Arquivos': 'Files',
  'Detalhes': 'Details',
  'Data': 'Date',
  'Pais': 'Parents',
  'commit raiz': 'root commit',
  'em {n} arquivos': 'in {n} files',
  'Mensagem': 'Message',
  'aguardando': 'pending',
  'executando': 'running',
  'aprovado': 'passed',
  'ignorado': 'skipped',
  'cancelado': 'cancelled',
  'erro': 'error',
  'Já existe uma execução em andamento.': 'A run is already in progress.',
  'Projetos · {n}': 'Projects · {n}',
  'Rodar': 'Run',
  'Os testes rodam o código do repositório nesta máquina; a primeira execução pede confirmação.': 'Tests run the repository code on this machine; the first run asks for confirmation.',
  'Cancelar': 'Cancel',
  'Rodar todos': 'Run all',
  'Nenhuma execução nesta sessão': 'No runs in this session',
  'Escolha um projeto à esquerda ou rode todos.': 'Pick a project on the left or run them all.',
  'código de saída {c} · {s} s': 'exit code {c} · {s} s',
  'Sem contagem: comando personalizado, só código de saída e log.': 'No counts: custom command, exit code and log only.',
  'Log completo': 'Full log',
  'Rodar testes?': 'Run tests?',
  'Os testes executam código deste repositório e podem ter efeitos fora dele. Continuar?': 'Tests run code from this repository and may have effects outside it. Continue?',
  'Continuar': 'Continue',
  'Relatório das mudanças atuais e da última execução de testes. O arquivo é baixado pelo navegador; nada é gravado no repositório.':
    'Report of the current changes and the last test run. The browser downloads the file; nothing is written to the repository.',
  'arquivo único, abre offline, sem nenhuma requisição de rede': 'single file, opens offline, makes no network request',
  'bom para colar em Pull Requests': 'good for pasting into Pull Requests',
  'dados completos para scripts': 'full data for scripts',
  'Incluir conteúdo de arquivos sensíveis': 'Include content of sensitive files',
  'Por padrão, .env, chaves, credenciais e arquivos com tokens aparecem só com nome e contagem.':
    'By default, .env, keys, credentials and files with tokens show only their name and counts.',
  'Baixar': 'Download',
  'Fotos do GitHub': 'GitHub photos',
  'Busca as fotos em avatars.githubusercontent.com: o GitHub recebe os e-mails dos autores e o seu IP.': "Loads photos from avatars.githubusercontent.com: GitHub receives the authors' e-mails and your IP.",
  'Nenhum projeto de teste encontrado.': 'No test project found.',
  'O Gityx reconhece sozinho Jest, Vitest, o script "test" do package.json (Mocha, AVA, node:test...), Go, pytest, cargo, dotnet, Maven, Gradle, PHPUnit e RSpec.':
    'Gityx detects Jest, Vitest, the package.json "test" script (Mocha, AVA, node:test...), Go, pytest, cargo, dotnet, Maven, Gradle, PHPUnit and RSpec by itself.',
  'Para qualquer outro comando, crie um .gityx.json na raiz do repositório:': 'For any other command, add a .gityx.json at the repository root:',
  'Linhas de código': 'Lines of code',
  'arquivos de texto rastreados': 'tracked text files',
  'linhas': 'lines',
  'Stack do projeto': 'Project stack',
  'Linguagens': 'Languages',
  'Frameworks': 'Frameworks',
  'Dados': 'Data',
  'Interface e estilo': 'UI and styling',
  'Build': 'Build',
  'Infraestrutura': 'Infrastructure',
  'Detectado em {f}': 'Detected in {f}',
  'Nenhum manifesto reconhecido (package.json, go.mod, requirements.txt, Cargo.toml...).': 'No known manifest found (package.json, go.mod, requirements.txt, Cargo.toml...).',
  'Linhas de código por linguagem': 'Lines of code by language',
  'Tipos de commit · último ano': 'Commit types · last year',
  'Funcionalidades': 'Features',
  'Correções': 'Fixes',
  'Documentação': 'Docs',
  'Manutenção': 'Chores',
  'Refatoração': 'Refactoring',
  'Estilo': 'Style',
  'Performance': 'Performance',
  'CI': 'CI',
  'Reversões': 'Reverts',
  'Merges': 'Merges',
  'Outros': 'Other',
  'Formato': 'Format',
  'Arquivos sensíveis': 'Sensitive files',
};

export function translate(lang: Lang, key: string, vars?: Vars): string {
  const text = lang === 'en' ? EN[key] ?? key : key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text;
}

export function initialLang(browser = typeof navigator !== 'undefined' ? navigator.language : 'pt-BR'): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'pt' || v === 'en') return v;
  } catch {
    // storage blocked
  }
  return browser.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

type Ctx = { lang: Lang; setLang(l: Lang): void; t(key: string, vars?: Vars): string };
const LangCtx = createContext<Ctx>({ lang: 'pt', setLang: () => {}, t: (k, v) => translate('pt', k, v) });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  setLocale(lang === 'pt' ? 'pt-BR' : 'en-US');
  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem(KEY, l);
    } catch {
      // storage blocked
    }
    setLangState(l);
  }, []);
  const t = useCallback((key: string, vars?: Vars) => translate(lang, key, vars), [lang]);
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);
export const useT = () => useContext(LangCtx).t;
