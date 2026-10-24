# Gityx

Veja o Git do seu projeto no navegador: grafo de commits e branches, mudanças em tempo real, busca nos diffs, testes e relatórios. Tudo roda na sua máquina, sem IA e sem mexer no repositório.

```sh
cd ~/qualquer-repositorio
npx gityx                         # sobe o servidor e abre o navegador
npx gityx --port 8080 --open=false
npx gityx ../outro-repo
```

O `npx` roda a ferramenta sem tocar no `package.json` nem no `node_modules` do projeto, e funciona em qualquer repositório Git, Node ou não. Requisitos: Node 20.19 ou mais recente e `git` no PATH. Ctrl+C encerra.

## Telas

| Tela | O que mostra |
|---|---|
| Visão geral | branch, upstream (↑ à frente / ↓ atrás, sem `fetch`), mudanças pendentes, atividade das últimas 12 semanas, quem mais comitou, último teste, stashes e branches |
| Árvore do Git (coluna direita) | o grafo de commits de todas as branches, com tags e HEAD; clique num commit para ver o diff |
| Mudanças | diffs do working tree (staged, unstaged e não rastreados), que se atualizam sozinhos, com busca por texto ou regex |
| Histórico | o grafo em largura total, com filtros por autor, caminho e data |
| Testes | Jest, Vitest, script `test`, Go ou comandos do `.gityx.json`; pede confirmação antes da primeira execução |
| Exportar | relatório em HTML (arquivo único, offline), Markdown ou JSON, baixado pelo navegador |

## Privacidade

- O servidor escuta só em `127.0.0.1`, numa porta aleatória.
- A URL impressa tem um token aleatório. Sem ele nada abre; ele vira um cookie `HttpOnly; SameSite=Strict`.
- A API recusa `Host` e `Origin` de outros sites, então uma página aberta em outra aba não consegue ler o repositório (proteção contra DNS rebinding).
- Nenhuma requisição externa: sem telemetria, CDN, fontes remotas ou checagem de atualização. A Content-Security-Policy só permite o próprio servidor. Ícones de tecnologias vêm embutidos no pacote.
- Única exceção, desligada por padrão: o botão **Fotos do GitHub** em "Quem mais comitou" carrega os avatares de `avatars.githubusercontent.com` (o GitHub recebe os e-mails dos autores e o seu IP). Sem ele, os avatares são iniciais geradas localmente.
- Zero IA.
- Só leitura: nunca faz commit, checkout, stage, fetch ou push. A única ação com efeito é rodar os testes, depois da sua confirmação.
- Na exportação, `.env`, chaves, credenciais e arquivos com tokens aparecem só com nome e contagem, a menos que você marque a opção de incluir.

## Configuração (opcional)

`.gityx.json` na raiz do repositório:

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

Quando `projects` existe, ele substitui a descoberta automática. Os diretórios precisam estar dentro do repositório. `command` mostra só o código de saída e o log.

## Desenvolvimento

```sh
npm install
npm test                 # Jest: servidor (NestJS) e interface (React)
npm run build            # dist/server + dist/web
npm run dev:server       # servidor na porta 4317; abra a URL com token impressa
npm run dev:web          # Vite com hot reload, faz proxy de /api para a porta 4317
```

Stack: TypeScript, NestJS, React, Vite, Tailwind CSS, shadcn/ui e Jest.
