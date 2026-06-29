// scripts/painel-acoes/painel-acoes.js
// Injeta o fieldset "Ajudante +Eproc" na página de processo, logo após #fldAcoes.
// Expõe window.__AjudanteEproc.getPainelAcoesContainer() para que outros módulos
// injetem botões sem precisar conhecer a estrutura interna do painel.

(function () {
  'use strict';

  window.__AjudanteEproc = window.__AjudanteEproc || {};

  // API pública — cria o fieldset se ainda não existir no DOM.
  // Retorna o <div id="ajudante-painel-botoes"> ou null se #fldAcoes não estiver disponível.
  window.__AjudanteEproc.getPainelAcoesContainer = function () {
    const existente = document.getElementById('ajudante-painel-botoes');
    if (existente) return existente;

    const ancora = document.querySelector('#fldAcoes') || document.getElementById('div-acoes-preferenciais');
    if (!ancora) return null;

    _inserirPainel(ancora);
    return document.getElementById('ajudante-painel-botoes');
  };

  // Só inicializa no frame principal da página de processo.
  if (window.self !== window.top) return;
  if (!window.location.href.includes('controlador.php?acao=processo_selecionar')) return;

  // ─── Construção do fieldset ────────────────────────────────────────

  function _criarFieldset() {
    const fieldset = document.createElement('fieldset');
    fieldset.id = 'ajudante-painel-acoes';
    fieldset.className = 'infraFieldset';

    const legend = document.createElement('legend');
    legend.className = 'infraLegendObrigatorio ajudante-painel-legend';

    // Ícone da extensão
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/icon-16.png');
    img.alt = '';
    img.className = 'ajudante-painel-icone';
    legend.appendChild(img);

    // Texto
    legend.appendChild(document.createTextNode(' Ajudante +Eproc'));

    // Botão de configurações (abre options page)
    const configBtn = document.createElement('button');
    configBtn.type = 'button';
    configBtn.id = 'ajudante-painel-config';
    configBtn.className = 'ajudante-painel-config-btn';
    configBtn.title = 'Configurações do Ajudante +Eproc';
    configBtn.textContent = '⚙';
    configBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      chrome.runtime.sendMessage({ tipo: 'abrirConfiguracoes' });
    });
    legend.appendChild(configBtn);

    fieldset.appendChild(legend);

    const botoes = document.createElement('div');
    botoes.id = 'ajudante-painel-botoes';
    fieldset.appendChild(botoes);

    return fieldset;
  }

  function _inserirPainel(ancora) {
    if (document.getElementById('ajudante-painel-acoes')) return;
    ancora.parentNode.insertBefore(_criarFieldset(), ancora.nextSibling);
  }

  // ─── Botões próprios do painel ─────────────────────────────────────

  function _adicionarBotoesIntegrados(settings) {
    const botoes = document.getElementById('ajudante-painel-botoes');
    if (!botoes) return;

    if (settings?.modules?.anotacoesPreferencias?.enabled) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'ajudante-btn-modo-edicao';
      btn.className = 'ajudante-btn';
      btn.textContent = '📌 Anotações: Editar';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const api = window.__AjudanteEproc.anotacoes;
        if (api) api.toggle(!api.isAtivo());
      });

      // Atualiza estado visual quando o modo muda (texto fixo, cor indica ativo/inativo)
      document.addEventListener('ajudante:modoEdicaoAnotacoes', (ev) => {
        btn.classList.toggle('ajudante-btn--ativo', !!ev.detail.ativo);
      });

      botoes.appendChild(btn);
    }
  }

  // ─── Inicialização ─────────────────────────────────────────────────

  chrome.storage.local.get('eprocSettings', (data) => {
    if (!data.eprocSettings?.scripts?.painelAcoes?.enabled) return;

    const settings = data.eprocSettings;
    const ancora = document.querySelector('#fldAcoes') || document.getElementById('div-acoes-preferenciais');

    if (ancora) {
      _inserirPainel(ancora);
      _adicionarBotoesIntegrados(settings);
      return;
    }

    // #fldAcoes ainda não está no DOM — aguarda até 10 s via MutationObserver.
    const observer = new MutationObserver(() => {
      const fld = document.querySelector('#fldAcoes') || document.getElementById('div-acoes-preferenciais');
      if (!fld) return;
      observer.disconnect();
      _inserirPainel(fld);
      _adicionarBotoesIntegrados(settings);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 10000);
  });
})();
