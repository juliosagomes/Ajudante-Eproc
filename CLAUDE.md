# CLAUDE.md

Orientações para o Claude Code (claude.ai/code) ao trabalhar neste repositório.

## Visão Geral

**Ajudante +Eproc** é uma extensão Chrome (Manifest V3) que injeta módulos e scripts opcionais nas páginas do sistema Eproc (`*://*.jus.br/*`) para melhorar a experiência do usuário. Cada funcionalidade pode ser ativada/desativada pela página de configurações.

- **Manifest**: V3, service worker (`background.js`).
- **Linguagens**: JavaScript puro (sem build), HTML, CSS.
- **Sem dependências externas**, sem bundler, sem testes automatizados.

## Arquitetura

### Pontos de entrada

- `manifest.json` — declara content scripts, CSS, service worker, popup e `options_page`.
- `background.js` — service worker. Inicializa `eprocSettings` no `chrome.storage.local`, executa migrações de chaves novas em instalações existentes, abre a página de Termos no primeiro install, e centraliza o roteamento de mensagens (`chrome.runtime.onMessage`).
- `content.js` — injetado em todos os frames das páginas Eproc. Define o namespace global `window.__AjudanteEproc` e instala uma salvaguarda de `submit` em captura para evitar que botões da extensão dentro de `<form>` nativos disparem submit.

### Módulos vs Scripts

- `modules/` — funcionalidades maiores, com estado e UI persistente:
  - `anotacoes-preferencias/` — anotações por preferência do Eproc (armazenadas em `eprocAnotacoesPreferencias`).
  - `colorir-localizadores/` — cores customizadas por localizador (`eprocCoresLocalizadores`).
  - `filtros-eventos/` — filtros adicionais sobre a lista de eventos.
  - `expansor-numero-processo/` — expande números de processo abreviados (config: `defaultOOOO`, `anoMin`, `J`, `TR`, `primeirosN`; padrões TJMG: `J=8`, `TR=13`, `primeirosN=['1','5']` — 1 = Eproc nativo, 5 = migrado do PJe). Aceita parteN de 1–7 dígitos: 7 dígitos é tratado como `NNNNNNN` completo; 1–6 são prefixados por um dos candidatos em `primeirosN` (em modo `N-DD` o expansor escolhe automaticamente pelo DD; em `N+YY` usa o primeiro da lista).
- `scripts/` — utilitários menores, sem armazenamento próprio:
  - `localizador-busca/` — campo de busca dentro do seletor de "novo localizador".
  - `informacoes-adicionais/` — exibe informações adicionais em telas específicas.

A diferença é convencional: módulos costumam ter mensagens próprias no `background.js` (import/export, limpeza), scripts não.

### UIs auxiliares

- `popup/` — popup da extensão (acesso rápido).
- `settings/` — página de opções (`options_page`) onde o usuário liga/desliga módulos e scripts.
- `termos/` — Termos de Uso, abertos automaticamente no primeiro install até serem aceitos.

### Modelo de armazenamento

Tudo em `chrome.storage.local`:

- `eprocSettings` — estrutura `{ modules: {...}, scripts: {...} }` com `enabled` por chave; ver `DEFAULT_SETTINGS` em `background.js:3`.
- `eprocTermosAceitos`, `eprocTermosAceitosEm` — aceite dos termos.
- `eprocAnotacoesPreferencias` — dados do módulo anotações em preferências.
- `eprocCoresLocalizadores` — dados do módulo colorir-localizadores.

### Mensageria (`chrome.runtime.sendMessage`)

Tipos tratados em `background.js`:

- Termos: `aceitarTermos`, `obterStatusTermos`.
- Settings: `obterSettings`, `salvarSettings`.
- Anotações em preferências: `exportarAnotacoesPreferencias`, `importarAnotacoesPreferencias`, `obterTotalAnotacoesPreferencias`, `limparTodasAnotacoesPreferencias`.
- Cores de localizadores: `exportarCoresLocalizadores`, `importarCoresLocalizadores`, `limparCoresLocalizadores`.

Ao adicionar um módulo novo que precise persistir dados de forma agregada, siga o mesmo padrão: defina chave dedicada em `chrome.storage.local` e exponha handlers `exportar*`/`importar*`/`limpar*` em `background.js`.

## Convenções

- **Idioma**: código, comentários e UI em português (PT-BR).
- **Prefixos CSS/IDs**: use prefixos próprios (`fe-`, `eproc-anotacao-`, `loc-btn-cor-`, `ajudante-loc-`) para não colidir com o Eproc. O seletor `EXT_SELECTOR` em `content.js:8` depende desses prefixos para a salvaguarda de submit — qualquer botão/elemento clicável injetado dentro de `<form>` do Eproc precisa casar com esse seletor (ou usar `type="button"`).
- **Run timing**: content scripts rodam em `document_idle` e `all_frames: true`. Não assuma DOM pronto além disso; observe mutações quando necessário.
- **Settings**: sempre leia `eprocSettings` via mensagem `obterSettings` e respeite `enabled` antes de aplicar efeitos colaterais.
- **Migrações**: ao adicionar nova chave em `DEFAULT_SETTINGS`, adicione um bloco de migração em `onInstalled` para preencher a chave em instalações antigas (padrão visível em `background.js:23-42`).

## Fluxo de desenvolvimento

Não há build, lint, test runner nem CI configurados. Para testar localmente:

1. `chrome://extensions` → ativar **Modo do desenvolvedor**.
2. **Carregar sem compactação** apontando para a raiz do repositório.
3. Após alterações, clicar no botão **Recarregar** do card da extensão; para alterações em content scripts, recarregar também a aba do Eproc.
4. Service worker pode ser inspecionado em `chrome://extensions` → "Service worker".

Ao adicionar arquivo JS/CSS novo de módulo ou script, **lembre de registrá-lo em `manifest.json`** (`content_scripts[0].js` ou `.css`) — não há autoload.

## Registrando um novo módulo (checklist)

1. Criar `modules/<nome>/<nome>.js` e `<nome>.css`.
2. Registrar ambos em `manifest.json`.
3. Adicionar entrada em `DEFAULT_SETTINGS.modules` em `background.js` + bloco de migração.
4. Adicionar toggle correspondente em `settings/settings.html` / `settings.js`.
5. No script do módulo, ler `eprocSettings` e só agir quando `enabled === true`.
6. Se for inserir elementos clicáveis dentro de `<form>` nativos, garantir que casem com `EXT_SELECTOR` em `content.js` ou usar `type="button"`.

## Versão

Versão atual da extensão: ver `version` em `manifest.json` (espelhado em `content.js` como `__AjudanteEproc.version`). Mantenha ambos em sincronia ao lançar uma nova versão.
