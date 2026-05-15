// scripts/esmaecer-zerados/esmaecer-zerados.js
// Esmaece linhas com quantidade 0 nas tabelas de localizadores do Painel Inicial
// (URL com acao=painel_secretaria_listar).

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;
  if (!window.location.href.includes('controlador.php?acao=painel_secretaria_listar')) return;

  const SETTINGS_KEY = 'eprocSettings';
  const SCRIPT_NAME  = 'esmaecerZerados';
  const DATA_MARK    = 'data-ajudante-esmaecido';

  let ativo = false;
  let observer = null;
  let debounceTimer = null;

  function obterQuantidade(linha) {
    const cell = linha.querySelector('.qtdeListaDeProcessosPorLocalizador')
              || linha.querySelector('td:nth-child(2)');
    if (!cell) return null;
    const link = cell.querySelector('a');
    const texto = ((link || cell).textContent || '').trim();
    const n = parseInt(texto, 10);
    return isNaN(n) ? null : n;
  }

  function aplicarLinha(linha, quantidade) {
    const esmaecer = quantidade === 0;
    const jaMarcada = linha.getAttribute(DATA_MARK) === '1';
    if (esmaecer === jaMarcada) return; // sem mudanca

    if (esmaecer) {
      linha.setAttribute(DATA_MARK, '1');
      linha.style.opacity = '0.75';
      linha.style.color   = '#888';
      for (const td of linha.querySelectorAll('td')) {
        td.style.opacity = '0.75';
        td.style.color   = '#888';
      }
    } else {
      linha.removeAttribute(DATA_MARK);
      linha.style.removeProperty('opacity');
      linha.style.removeProperty('color');
      for (const td of linha.querySelectorAll('td')) {
        td.style.removeProperty('opacity');
        td.style.removeProperty('color');
      }
    }
  }

  function aplicarTudo() {
    const linhas = document.querySelectorAll('fieldset table tbody tr');
    for (const linha of linhas) {
      const q = obterQuantidade(linha);
      if (q !== null) aplicarLinha(linha, q);
    }
  }

  function limparTudo() {
    const linhas = document.querySelectorAll(`tr[${DATA_MARK}]`);
    for (const linha of linhas) {
      linha.removeAttribute(DATA_MARK);
      linha.style.removeProperty('opacity');
      linha.style.removeProperty('color');
      for (const td of linha.querySelectorAll('td')) {
        td.style.removeProperty('opacity');
        td.style.removeProperty('color');
      }
    }
  }

  function iniciarObserver() {
    if (observer) return;
    observer = new MutationObserver(() => {
      if (!ativo) return;
      // Debounce: o eproc pode disparar varias mutations em rajada
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        aplicarTudo();
      }, 100);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function pararObserver() {
    if (observer) {
      try { observer.disconnect(); } catch (_) {}
      observer = null;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function ativar() {
    if (ativo) return;
    ativo = true;
    aplicarTudo();
    iniciarObserver();
  }

  function desativar() {
    if (!ativo) return;
    ativo = false;
    pararObserver();
    limparTudo();
  }

  chrome.storage.local.get(SETTINGS_KEY, (data) => {
    const cfg = data[SETTINGS_KEY]?.scripts?.[SCRIPT_NAME];
    if (cfg?.enabled) ativar();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[SETTINGS_KEY]) return;
    const queriaLigado = !!changes[SETTINGS_KEY].newValue?.scripts?.[SCRIPT_NAME]?.enabled;
    if (queriaLigado) ativar();
    else desativar();
  });
})();
