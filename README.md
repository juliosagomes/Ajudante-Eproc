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
- `modules/`: Pasta com módulos personalizáveis, como `lembretes/` (contém `lembretes.css` e `lembretes.js`).
- `popup/`: Interface popup da extensão (`popup.html`, `popup.css`, `popup.js`).
- `scripts/`: Pasta com scripts adicionais, como `localizador-busca/` (contém `localizador-busca.css` e `localizador-busca.js`).
- `settings/`: Página de configurações (`settings.html`, `settings.css`, `settings.js`).

## Instruções para IA (Assistente de Desenvolvimento)

Para trabalhar neste projeto, siga as diretrizes abaixo para garantir consistência, segurança e eficiência no desenvolvimento de novos scripts ou módulos.

### Obrigações
- **Seguir a Estrutura Existente**: Novos módulos devem ser adicionados à pasta `modules/` com subpastas nomeadas de forma descritiva (ex.: `novo-modulo/novo-modulo.js` e `novo-modulo/novo-modulo.css`). Scripts devem ir para `scripts/`.
- **Compatibilidade com Chrome Extensions**: Garantir que todos os códigos sejam compatíveis com a API de extensões do Chrome. Evitar uso de APIs não suportadas.
- **Integração com Página de Opções**: Novos módulos/scripts devem ser integrados à página de configurações (`settings/`) para permitir ativação/desativação pelo usuário.
- **Testes e Validação**: Sempre testar novos códigos em um ambiente de desenvolvimento Chrome, verificando se não quebram funcionalidades existentes e se funcionam corretamente no Eproc.
- **Documentação**: Adicionar comentários claros no código e atualizar este README.md se necessário para refletir mudanças.
- **Segurança**: Usar apenas permissões mínimas no `manifest.json` e evitar injeção de código inseguro.

### Proibições
- **Não Modificar Arquivos Core sem Justificativa**: Evite alterações em `manifest.json`, `background.js` e `content.js` a menos que seja essencial e aprovado pelo desenvolvedor.
- **Não Adicionar Dependências Externas**: Não incluir bibliotecas ou frameworks externos sem avaliação prévia de compatibilidade e segurança.
- **Evitar Código Malicioso ou Inseguro**: Não implementar funcionalidades que possam comprometer a segurança do usuário ou violar políticas do Chrome.
- **Não Ignorar Estrutura de Pastas**: Não criar arquivos fora das pastas designadas (`modules/`, `scripts/`, etc.) sem confirmar com o desenvolvedor.
- **Não Sobrescrever Configurações Existentes**: Ao adicionar novas opções, garantir que não interfiram com configurações já existentes na página de settings.
