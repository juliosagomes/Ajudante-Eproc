# Ajudante Eproc - Extensão Chrome

## Descrição do Projeto

O **Ajudante Eproc** é uma extensão do Google Chrome desenvolvida para melhorar a experiência do usuário dentro do sistema Eproc. A extensão permite a ativação seletiva de módulos e scripts personalizados, facilitando a personalização das funcionalidades conforme as necessidades individuais.

### Funcionalidades Principais
- **Página de Opções**: Permite ao usuário escolher quais módulos ou scripts da extensão estarão ativos. Isso é feito através de uma interface simples na página de configurações.
- **Módulos e Scripts**: A extensão inclui diversos módulos (localizados em `modules/`) e scripts (localizados em `scripts/`), cada um com funcionalidades específicas para otimizar o uso do Eproc.

## Estrutura do Projeto

A estrutura de arquivos da extensão é organizada da seguinte forma:

- `manifest.json`: Arquivo de manifesto da extensão Chrome, definindo permissões, scripts de fundo e conteúdo.
- `background.js`: Script de fundo para lógica persistente da extensão.
- `content.js`: Script de conteúdo injetado nas páginas do Eproc.
- `styles.css`: Estilos globais da extensão.
- `icons/`: Pasta contendo ícones da extensão.
- `modules/`: Pasta com módulos personalizáveis, como `anotacoes-preferencias/` (contém `anotacoes-preferencias.css` e `anotacoes-preferencias.js`).
- `popup/`: Interface popup da extensão (`popup.html`, `popup.css`, `popup.js`).
- `scripts/`: Pasta com scripts adicionais, como `localizador-busca/` (contém `localizador-busca.css` e `localizador-busca.js`).
- `settings/`: Página de configurações (`settings.html`, `settings.css`, `settings.js`).

## Recursos:
- **Anotações em preferências**: Possibilidade de inserir orientações adicionais a preferências do Eproc (Minutas, Movimentações, Intimações e Automatizações)
- **Colorir Localizadores**: Possbilidade de adicionar cores aos localizadores
- **Busca no campo "novo localizador**: Retira a necessidade do usuário scrollar até o novo localizador desejado ao realizar agendamento de minuta
