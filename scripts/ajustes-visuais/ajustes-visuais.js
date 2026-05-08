// scripts/ajustes-visuais/ajustes-visuais.js — Ajustes Visuais: Modernizar Ações e Preferências

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  const SETTINGS_KEY = 'eprocSettings';
  const SCRIPT_ID    = 'ajustesVisuais';
  const STYLE_ID     = '__modern-eproc-style';

  const CSS = `
    /* ────────────────────────────────────────────────────────────
       1. Menu Ações — fieldset#fldAcoes
    ──────────────────────────────────────────────────────────── */
    fieldset#fldAcoes {
      border: none !important;
      border-radius: 16px !important;
      background: linear-gradient(135deg, #f9f9fb, #f0f0f3) !important;
      box-shadow: 0 2px 12px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.07) !important;
      padding: 14px 16px !important;
    }

    fieldset#fldAcoes > legend {
      background: linear-gradient(90deg, #222, #555) !important;
      color: #fff !important;
      border-radius: 20px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      font-size: 12.5px !important;
      border: none !important;
      padding: 4px 16px !important;
    }

    fieldset#fldAcoes center {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      justify-content: center !important;
    }

    fieldset#fldAcoes center a.infraButton {
      border-radius: 999px !important;
      background: #fff !important;
      color: #1a1a1a !important;
      border: 1.5px solid #c8c8c8 !important;
      font-weight: 600 !important;
      font-size: 12px !important;
      padding: 6px 14px !important;
      white-space: nowrap !important;
      transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s, transform 0.18s !important;
      text-decoration: none !important;
      display: inline-block !important;
    }

    fieldset#fldAcoes center a.infraButton:hover {
      background: linear-gradient(135deg, #1a1a1a, #444) !important;
      color: #fff !important;
      border-color: #1a1a1a !important;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25) !important;
      transform: translateY(-2px) scale(1.04) !important;
    }

    fieldset#fldAcoes center a.infraButton:active {
      transform: translateY(0) scale(0.98) !important;
    }

    /* ────────────────────────────────────────────────────────────
       2. Painel de Preferências — #div-acoes-preferenciais
    ──────────────────────────────────────────────────────────── */
    #div-acoes-preferenciais {
      display: flex !important;
      flex-direction: column !important;
      gap: 10px !important;
    }

    #div-acoes-preferenciais .infraFieldset {
      border: none !important;
      border-radius: 14px !important;
      padding: 14px 16px !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05) !important;
    }

    #div-acoes-preferenciais .infraFieldset > legend {
      border-radius: 20px !important;
      font-weight: 700 !important;
      font-size: 12px !important;
      text-transform: uppercase !important;
      padding: 4px 16px !important;
      border: none !important;
      color: #fff !important;
      display: flex !important;
      align-items: center !important;
    }

    #div-acoes-preferenciais .content-link {
      border-radius: 999px !important;
      background: #fff !important;
      border: 1.5px solid !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      padding: 4px 12px !important;
      margin: 2px 3px !important;
      transition: background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s !important;
      display: inline-block !important;
      text-decoration: none !important;
    }

    #div-acoes-preferenciais .infraFieldset ul {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 2px !important;
      list-style: none !important;
      padding: 0 !important;
      margin: 6px 0 0 0 !important;
    }

    /* Minuta — azul índigo */
    #div-preferencia-minuta .infraFieldset {
      background: linear-gradient(135deg, #f0f4ff, #e8eeff) !important;
    }
    #div-preferencia-minuta .infraFieldset > legend {
      background: linear-gradient(90deg, #3b5bdb, #4c6ef5) !important;
    }
    #div-preferencia-minuta .content-link {
      color: #3b5bdb !important;
      border-color: #bac8ff !important;
    }
    #div-preferencia-minuta .content-link:hover {
      background: linear-gradient(90deg, #3b5bdb, #4c6ef5) !important;
      color: #fff !important;
      border-color: #3b5bdb !important;
    }

    /* Movimentação — verde */
    #div-preferencia-movimentacao .infraFieldset {
      background: linear-gradient(135deg, #f0fdf4, #dcfce7) !important;
    }
    #div-preferencia-movimentacao .infraFieldset > legend {
      background: linear-gradient(90deg, #16a34a, #22c55e) !important;
    }
    #div-preferencia-movimentacao .content-link {
      color: #16a34a !important;
      border-color: #bbf7d0 !important;
    }
    #div-preferencia-movimentacao .content-link:hover {
      background: linear-gradient(90deg, #16a34a, #22c55e) !important;
      color: #fff !important;
      border-color: #16a34a !important;
    }

    /* Intimação — vermelho */
    #div-preferencia-intimacao .infraFieldset {
      background: linear-gradient(135deg, #fff5f5, #ffe4e4) !important;
    }
    #div-preferencia-intimacao .infraFieldset > legend {
      background: linear-gradient(90deg, #dc2626, #f87171) !important;
    }
    #div-preferencia-intimacao .content-link {
      color: #dc2626 !important;
      border-color: #fecaca !important;
    }
    #div-preferencia-intimacao .content-link:hover {
      background: linear-gradient(90deg, #dc2626, #f87171) !important;
      color: #fff !important;
      border-color: #dc2626 !important;
    }

    /* Automatização — roxo */
    #div-preferencia-automatizacao .infraFieldset {
      background: linear-gradient(135deg, #f5f3ff, #ede9fe) !important;
    }
    #div-preferencia-automatizacao .infraFieldset > legend {
      background: linear-gradient(90deg, #4f46e5, #7c3aed) !important;
    }
    #div-preferencia-automatizacao .content-link {
      color: #4f46e5 !important;
      border-color: #c4b5fd !important;
    }
    #div-preferencia-automatizacao .content-link:hover {
      background: linear-gradient(90deg, #4f46e5, #7c3aed) !important;
      color: #fff !important;
      border-color: #4f46e5 !important;
    }

    /* fieldset#fldMinutas — azul índigo */
    fieldset#fldMinutas {
      border: none !important;
      border-radius: 14px !important;
      background: linear-gradient(135deg, #f0f4ff, #e8eeff) !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05) !important;
      padding: 14px 16px !important;
    }
    fieldset#fldMinutas > legend {
      background: linear-gradient(90deg, #3b5bdb, #4c6ef5) !important;
      color: #fff !important;
      border-radius: 20px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      font-size: 12px !important;
      border: none !important;
      padding: 4px 16px !important;
    }

    /* ────────────────────────────────────────────────────────────
       3. Barra rápida — #nav-acoes-processo
    ──────────────────────────────────────────────────────────── */
    #nav-acoes-processo {
      background: linear-gradient(135deg, #f9f9fb, #f2f2f5) !important;
      border-radius: 14px !important;
      padding: 10px 16px !important;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05) !important;
    }

    #nav-acoes-processo li {
      list-style: none !important;
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
    }

    #nav-acoes-processo a.eproc-button {
      border-radius: 999px !important;
      font-size: 12.5px !important;
      font-weight: 600 !important;
      padding: 6px 14px !important;
      transition: transform 0.15s, box-shadow 0.15s, background 0.15s, color 0.15s !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 5px !important;
      text-decoration: none !important;
    }

    /* btn-minutar — azul índigo preenchido */
    #btn-minutar a.eproc-button,
    a#btn-minutar.eproc-button,
    #btn-minutar.eproc-button {
      background: linear-gradient(135deg, #3b5bdb, #4c6ef5) !important;
      color: #fff !important;
      border: none !important;
      box-shadow: 0 2px 8px rgba(59,91,219,0.35) !important;
    }
    #btn-minutar a.eproc-button:hover,
    a#btn-minutar.eproc-button:hover,
    #btn-minutar.eproc-button:hover {
      transform: translateY(-1px) scale(1.04) !important;
      box-shadow: 0 4px 14px rgba(59,91,219,0.45) !important;
    }

    /* btn-preferencias-minutas — azul índigo outline */
    #btn-preferencias-minutas a.eproc-button,
    a#btn-preferencias-minutas.eproc-button,
    #btn-preferencias-minutas.eproc-button {
      background: #fff !important;
      color: #3b5bdb !important;
      border: 1.5px solid #bac8ff !important;
    }
    #btn-preferencias-minutas a.eproc-button:hover,
    a#btn-preferencias-minutas.eproc-button:hover,
    #btn-preferencias-minutas.eproc-button:hover {
      background: linear-gradient(135deg, #3b5bdb, #4c6ef5) !important;
      color: #fff !important;
      border-color: #3b5bdb !important;
      transform: translateY(-1px) scale(1.04) !important;
      box-shadow: 0 4px 14px rgba(59,91,219,0.35) !important;
    }

    /* btn-movimentar — verde preenchido */
    #btn-movimentar a.eproc-button,
    a#btn-movimentar.eproc-button,
    #btn-movimentar.eproc-button {
      background: linear-gradient(135deg, #16a34a, #22c55e) !important;
      color: #fff !important;
      border: none !important;
      box-shadow: 0 2px 8px rgba(22,163,74,0.35) !important;
    }
    #btn-movimentar a.eproc-button:hover,
    a#btn-movimentar.eproc-button:hover,
    #btn-movimentar.eproc-button:hover {
      transform: translateY(-1px) scale(1.04) !important;
      box-shadow: 0 4px 14px rgba(22,163,74,0.45) !important;
    }

    /* btn-preferencias-movimentacao — verde outline */
    #btn-preferencias-movimentacao a.eproc-button,
    a#btn-preferencias-movimentacao.eproc-button,
    #btn-preferencias-movimentacao.eproc-button {
      background: #fff !important;
      color: #16a34a !important;
      border: 1.5px solid #bbf7d0 !important;
    }
    #btn-preferencias-movimentacao a.eproc-button:hover,
    a#btn-preferencias-movimentacao.eproc-button:hover,
    #btn-preferencias-movimentacao.eproc-button:hover {
      background: linear-gradient(135deg, #16a34a, #22c55e) !important;
      color: #fff !important;
      border-color: #16a34a !important;
      transform: translateY(-1px) scale(1.04) !important;
      box-shadow: 0 4px 14px rgba(22,163,74,0.35) !important;
    }

    /* btn-intimar — vermelho preenchido */
    #btn-intimar a.eproc-button,
    a#btn-intimar.eproc-button,
    #btn-intimar.eproc-button {
      background: linear-gradient(135deg, #dc2626, #f87171) !important;
      color: #fff !important;
      border: none !important;
      box-shadow: 0 2px 8px rgba(220,38,38,0.35) !important;
    }
    #btn-intimar a.eproc-button:hover,
    a#btn-intimar.eproc-button:hover,
    #btn-intimar.eproc-button:hover {
      transform: translateY(-1px) scale(1.04) !important;
      box-shadow: 0 4px 14px rgba(220,38,38,0.45) !important;
    }

    /* btn-preferencias-intimacao — vermelho outline */
    #btn-preferencias-intimacao a.eproc-button,
    a#btn-preferencias-intimacao.eproc-button,
    #btn-preferencias-intimacao.eproc-button {
      background: #fff !important;
      color: #dc2626 !important;
      border: 1.5px solid #fecaca !important;
    }
    #btn-preferencias-intimacao a.eproc-button:hover,
    a#btn-preferencias-intimacao.eproc-button:hover,
    #btn-preferencias-intimacao.eproc-button:hover {
      background: linear-gradient(135deg, #dc2626, #f87171) !important;
      color: #fff !important;
      border-color: #dc2626 !important;
      transform: translateY(-1px) scale(1.04) !important;
      box-shadow: 0 4px 14px rgba(220,38,38,0.35) !important;
    }

    /* btn-automatizar — roxo preenchido */
    #btn-automatizar a.eproc-button,
    a#btn-automatizar.eproc-button,
    #btn-automatizar.eproc-button {
      background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
      color: #fff !important;
      border: none !important;
      box-shadow: 0 2px 8px rgba(79,70,229,0.35) !important;
    }
    #btn-automatizar a.eproc-button:hover,
    a#btn-automatizar.eproc-button:hover,
    #btn-automatizar.eproc-button:hover {
      transform: translateY(-1px) scale(1.04) !important;
      box-shadow: 0 4px 14px rgba(79,70,229,0.45) !important;
    }

    /* btn-preferencias-automatizar — roxo outline */
    #btn-preferencias-automatizar a.eproc-button,
    a#btn-preferencias-automatizar.eproc-button,
    #btn-preferencias-automatizar.eproc-button {
      background: #fff !important;
      color: #4f46e5 !important;
      border: 1.5px solid #c4b5fd !important;
    }
    #btn-preferencias-automatizar a.eproc-button:hover,
    a#btn-preferencias-automatizar.eproc-button:hover,
    #btn-preferencias-automatizar.eproc-button:hover {
      background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
      color: #fff !important;
      border-color: #4f46e5 !important;
      transform: translateY(-1px) scale(1.04) !important;
      box-shadow: 0 4px 14px rgba(79,70,229,0.35) !important;
    }
  `;

  let scriptAtivo = false;
  let observer    = null;

  function injetarEstilo() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function removerEstilo() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  function verificarEInjetar() {
    if (
      document.getElementById('fldAcoes') ||
      document.getElementById('div-acoes-preferenciais') ||
      document.getElementById('nav-acoes-processo') ||
      document.getElementById('fldMinutas')
    ) {
      injetarEstilo();
    }
  }

  function ativarScript() {
    if (scriptAtivo) return;
    scriptAtivo = true;

    verificarEInjetar();
    observer = new MutationObserver(verificarEInjetar);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function desativarScript() {
    if (!scriptAtivo) return;
    scriptAtivo = false;

    if (observer) { observer.disconnect(); observer = null; }
    removerEstilo();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (!changes[SETTINGS_KEY]) return;

    const enabled = changes[SETTINGS_KEY].newValue?.scripts?.[SCRIPT_ID]?.enabled ?? true;
    if (enabled && !scriptAtivo) ativarScript();
    if (!enabled && scriptAtivo) desativarScript();
  });

  chrome.storage.local.get(SETTINGS_KEY, (data) => {
    const settings = data[SETTINGS_KEY] || {};
    const enabled  = settings?.scripts?.[SCRIPT_ID]?.enabled ?? true;
    if (enabled) ativarScript();
  });

})();
