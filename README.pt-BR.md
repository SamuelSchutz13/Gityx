<p align="center">
  <img src=".github/assets/logo.svg" alt="" width="72" />
</p>

<h1 align="center">Gityx</h1>

<p align="center">
  <a href="README.md">English</a> · <b>Português (Brasil)</b>
</p>

<p align="center">
  O Git do seu repositório no navegador: grafo de commits, mudanças ao vivo, estatísticas e testes. Roda na sua máquina, sem IA, e nunca escreve no repositório.
</p>

<p align="center">
  <img alt="NestJS 11" src="https://img.shields.io/badge/NestJS-11-e0234e?logo=nestjs&logoColor=white" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white" />
  <img alt="Node.js 20.19+" src="https://img.shields.io/badge/Node.js-20.19%2B-5fa04e?logo=nodedotjs&logoColor=white" />
  <img alt="shadcn/ui" src="https://img.shields.io/badge/UI-shadcn%2Fui-000000?logo=shadcnui&logoColor=white" />
  <img alt="Jest" src="https://img.shields.io/badge/testes-Jest-c21325?logo=jest&logoColor=white" />
  <img alt="Sem IA" src="https://img.shields.io/badge/IA-nenhuma-8b949e" />
</p>

<p align="center">
  <img src=".github/assets/overview.png" alt="Visão geral do Gityx: stack do projeto com ícones e versões, roscas de linhas de código e tipos de commit, commits por semana e a árvore do Git à direita" />
</p>

> [!NOTE]
> **Nada sai da sua máquina.** O servidor escuta só em `127.0.0.1`, a página exige um token aleatório e não há telemetria, CDN nem fonte remota. A única exceção é opcional: a configuração **Fotos do GitHub** carrega os avatares de `avatars.githubusercontent.com`.

> [!WARNING]
> **Os testes executam o código do seu repositório.** O Gityx pede confirmação antes da primeira execução de cada sessão, mas uma suíte de testes pode fazer tudo o que o seu usuário pode.

## Funcionalidades

- **Visão geral**: branch e upstream, mudanças pendentes, última execução de testes e os números do projeto (commits, contribuidores, idade, última tag, arquivos rastreados, linhas de código, merges).
- **Stack do projeto**: linguagens, frameworks, dados, interface, testes, build e infraestrutura detectados em `package.json`, `go.mod`, `requirements.txt`/`pyproject.toml`, `Cargo.toml`, `composer.json`, `Gemfile`, `pom.xml`/Gradle, `.csproj`, Dockerfile, compose e GitHub Actions, cada um com ícone e versão.
- **Gráficos**: linhas de código por linguagem, tipos de commit (`feat`, `fix`, `docs`…), commits por semana, arquivos por extensão, arquivos mais alterados, quando os commits acontecem (dia × hora), calendário de atividade de 12 semanas e quem mais comitou. Todo gráfico tem tooltip e visão em tabela.
- **Árvore do Git**: todas as branches com tags, `HEAD` e merges. Clique num commit para abri-lo.
- **Mudanças**: diffs de staged, unstaged e não rastreados que se atualizam sozinhos, com syntax highlighting e busca por texto ou regex.
- **Histórico**: o grafo completo com filtros por autor, caminho e data, e um inspetor com detalhes, arquivos e diff.
- **Testes**: Jest, Vitest, o script `test`, Go, pytest, cargo, dotnet, Maven, Gradle, PHPUnit e RSpec são encontrados sozinhos; qualquer outro comando vai no `.gityx.json`.
- **Exportar**: HTML (arquivo único e offline), Markdown ou JSON. Arquivos sensíveis (`.env`, chaves, tokens) aparecem só com o nome, a menos que você os inclua.
- **Configurações**: inglês e português (Brasil), temas escuro e claro, e as fotos do GitHub opcionais.

## Imagens

**Mudanças**: arquivos agrupados por estado à esquerda, diffs ao vivo no meio e a árvore do Git à direita.

<p align="center"><img src=".github/assets/changes.png" alt="Tela de Mudanças com um arquivo staged, um modificado e um .env não rastreado" /></p>

**Histórico**: filtros, o grafo completo e o inspetor do commit.

<p align="center"><img src=".github/assets/history.png" alt="Tela de Histórico com um commit de merge aberto no inspetor" /></p>

**Testes**: projetos à esquerda e a execução com status e log completo.

<p align="center"><img src=".github/assets/tests.png" alt="Tela de Testes depois de uma execução aprovada" /></p>

**Configurações**: idioma, tema e privacidade num lugar só.

<p align="center"><img src=".github/assets/settings.png" alt="Popup de configurações com idioma, tema e fotos do GitHub" /></p>

**Tema claro** e **inglês**:

<p align="center">
  <img src=".github/assets/overview-light.png" alt="Visão geral no tema claro" width="49%" />
  <img src=".github/assets/history-en.png" alt="Histórico em inglês" width="49%" />
</p>

## Como começar

Você só precisa do [Node.js](https://nodejs.org) **20.19 ou mais recente** e do `git` no `PATH`.

```sh
git clone https://github.com/SamuelSchutz13/Gityx.git
cd Gityx
npm install
npm run build
npm link          # deixa o comando `gityx` disponível em qualquer pasta
```

Depois, dentro de qualquer repositório Git:

```sh
cd ~/algum-repositorio
gityx                          # sobe o servidor e abre o navegador
gityx --port 8080 --open=false
gityx ../outro-repositorio
```

O terminal mostra uma URL como `http://127.0.0.1:54321/?t=…`. Aperte **Ctrl+C** para encerrar. Quando o pacote for publicado no npm, `npx gityx` vai fazer o mesmo sem precisar clonar.

> [!TIP]
> Depois de atualizar o Gityx, encerre o servidor e abra de novo: os cabeçalhos de segurança vêm do servidor, então recarregar a página não basta.

### Configuração

Opcional, no `.gityx.json` na raiz do repositório:

```json
{
  "tests": {
    "timeout": "5m",
    "projects": [
      { "name": "api", "kind": "go", "dir": "backend" },
      { "name": "web", "kind": "node", "dir": "web" },
      { "name": "e2e", "kind": "command", "dir": ".", "command": ["npm", "run", "test:e2e"] }
    ]
  }
}
```

| Campo                      | Descrição                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `tests.timeout`            | Por projeto, como `500ms`, `30s`, `5m` ou `1h` (padrão `10m`)                             |
| `tests.projects[].kind`    | `node` (Jest, Vitest ou o script `test`), `go` ou `command`                               |
| `tests.projects[].dir`     | Pasta dentro do repositório                                                               |
| `tests.projects[].command` | Para `command`: o programa e os argumentos, sem shell. Mostra só o código de saída e o log |

Quando `projects` existe, ele substitui a descoberta automática.

### Scripts

| Comando              | O que faz                                                          |
| -------------------- | ------------------------------------------------------------------ |
| `npm run build`      | Gera o servidor em `dist/server` e o site em `dist/web`            |
| `npm test`           | Jest: servidor, site e um teste de ponta a ponta do pacote         |
| `npm run dev:server` | Servidor na porta 4317 (abra a URL com token que ele mostra)       |
| `npm run dev:web`    | Vite com hot reload, repassando `/api` para a porta 4317           |
| `npm run icons`      | Regenera os ícones de tecnologias embutidos, a partir do simple-icons |

## Privacidade e segurança

- **Só localhost.** O servidor escuta em `127.0.0.1`, numa porta aleatória.
- **Token.** A URL impressa traz um token aleatório, trocado por um cookie `HttpOnly; SameSite=Strict` com o nome da porta, então duas instâncias nunca deslogam uma à outra.
- **Sem acesso de outros sites.** Requisições com `Host` (DNS rebinding) ou `Origin` estranhos são recusadas, e a Content-Security-Policy só permite o próprio servidor (mais as imagens do GitHub, para as fotos opcionais).
- **Só leitura.** O Git roda via `execFile` com vetor de argumentos, nunca por shell, e com `GIT_OPTIONAL_LOCKS=0`, então não disputa o `index.lock` com o seu `git commit`. Nada de commit, checkout, stage, fetch ou push.
- **Os caminhos ficam presos ao repositório**, e symlinks não rastreados aparecem como o destino, sem serem seguidos.
- **Zero IA.** Nenhum modelo, nenhuma API, nenhum "explicar".
- Um teste de fumaça faz o build falhar se o site referenciar qualquer URL externa.

## Como funciona

```
navegador (React + shadcn/ui)  ⇄  REST + SSE em 127.0.0.1  ⇄  NestJS  ⇄  git (execFile)
```

| Método | Rota                  | Para quê                                                          |
| ------ | --------------------- | ----------------------------------------------------------------- |
| GET    | `/api/dashboard`      | Branch, mudanças pendentes, atividade, autores, último teste      |
| GET    | `/api/stats`          | Totais, stack, linhas de código, tipos de commit, gráficos        |
| GET    | `/api/changes`        | Diffs do working tree                                             |
| GET    | `/api/history`        | Log paginado (`skip`, `limit`, `author`, `path`, `since`, `until`) |
| GET    | `/api/commits/:sha`   | Um commit com o diff                                              |
| GET    | `/api/events`         | Server-Sent Events quando arquivos ou refs mudam                  |
| GET    | `/api/tests/projects` | Projetos de teste encontrados                                     |
| POST   | `/api/tests/run`      | Roda os testes (pede confirmação uma vez)                         |
| POST   | `/api/tests/cancel`   | Cancela a execução e mata a árvore de processos                   |
| GET    | `/api/export?format=` | Download em `md`, `json` ou `html`                                |

### Estrutura do projeto

```
src/server/            servidor NestJS
  main.ts, cli.ts      CLI, inicialização, abertura do navegador
  security/            token, cookie, checagem de Host/Origin, CSP
  git/                 execução do git, parsers de diff e log
  changes/ history/    working tree e histórico de commits
  live/                watcher de arquivos + polling → SSE
  dashboard/ stats/    dados da visão geral, detecção da stack, linhas de código
  tests/               descoberta, executores, execução cancelável
  export/              relatórios em Markdown, HTML e JSON
src/web/               site React (Vite, Tailwind, shadcn/ui)
  views/               Shell, Dashboard, Changes, History, Tests, Export
  components/          gráficos, avatares, ícones, bandeiras, kit
  lib/                 cliente da API, i18n, configurações, layout do grafo, highlighting
test/                  helpers e o teste de fumaça da CLI empacotada
```

## Limitações conhecidas

- Estatísticas e linhas de código leem todo o histórico e todos os arquivos de texto rastreados a cada atualização (limite de 5000 arquivos de até 1 MB); repositórios muito grandes ficam lentos.
- Só Jest, Vitest e Go mostram a contagem de testes; os outros executores mostram o código de saída e o log.
- O filtro de caminho do histórico aceita os curingas do Git (`*`, `:(exclude)`).
- O tema claro e as telas pequenas foram menos conferidos que o layout escuro de desktop.
- No Windows, filtros de rede como o AdGuard interceptam o tráfego de `localhost`: reescrevem cabeçalhos de resposta e podem fazer os testes e2e falharem de vez em quando com `ECONNRESET`. Adicione o `node.exe` às exceções dele.

## Créditos

- Servidor: [NestJS](https://nestjs.com). Site: [React](https://react.dev), [Vite](https://vite.dev), [Tailwind CSS](https://tailwindcss.com) e [shadcn/ui](https://ui.shadcn.com) com [Radix](https://www.radix-ui.com).
- Ícones: [Lucide](https://lucide.dev) e [Simple Icons](https://simpleicons.org) (CC0). Syntax highlighting: [lowlight](https://github.com/wooorm/lowlight).
- Testes: [Jest](https://jestjs.io) e [Testing Library](https://testing-library.com).
- Inspirado no [GitView](https://github.com/Darrkkens/gitview). Mesma estrutura do [FoculessPad](https://github.com/SamuelSchutz13/FoculessPad).
