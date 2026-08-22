// content.js — Ajudante Eproc (namespace compartilhado)
(function () {
  'use strict';
  window.__AjudanteEproc = window.__AjudanteEproc || { version: '2.4.0' };

  // Salvaguarda: cancela submit do form nativo acionado por elemento da extensão.
  // Necessário porque botões sem type="button" dentro de <form> viram type="submit".
  const EXT_SELECTOR = [
    '[id^="fe-"]',
    '[class*="fe-"]',
    '[class*="eproc-anotacao"]',
    '[class*="loc-btn-cor"]',
    '[class*="loc-editor-cor"]',
    '[class*="ajudante-loc-"]',
  ].join(',');

  document.addEventListener('submit', (e) => {
    const sub = e.submitter;
    if (!sub) return;
    if (sub.matches(EXT_SELECTOR) || sub.closest(EXT_SELECTOR)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true); // capture — dispara antes dos listeners do Eproc
})();
