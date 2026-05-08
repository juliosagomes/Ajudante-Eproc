// scripts/informacoes-adicionais/informacoes-adicionais.js — Ajuste Visual: Informações Adicionais

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  const SETTINGS_KEY = 'eprocSettings';
  const SCRIPT_ID    = 'informacoesAdicionais';
  const STYLE_ID     = 'modernInfoAdicional';

  // ─── CSS ────────────────────────────────────────────────────────────
  const CSS = `
    /* ── Variáveis de cor ── */
    :root {
      --ia-primary: #1a56a0;
      --ia-primary-light: #e8f0fc;
      --ia-accent: #2563eb;
      --ia-border: #d1dff5;
      --ia-bg: #f7f9fe;
      --ia-card-bg: #ffffff;
      --ia-label-color: #475569;
      --ia-value-color: #0f172a;
      --ia-value-neg: #64748b;
      --ia-value-pos: #15803d;
      --ia-value-warn: #b45309;
      --ia-radius: 12px;
      --ia-shadow: 0 2px 8px rgba(26,86,160,0.08), 0 1px 2px rgba(0,0,0,0.04);
      --ia-shadow-hover: 0 6px 20px rgba(26,86,160,0.14);
      --ia-transition: all 0.2s ease;
    }

    /* ── Fieldset principal ── */
    #fldInformacoesAdicionais {
      border: none !important;
      background: var(--ia-bg) !important;
      border-radius: var(--ia-radius) !important;
      padding: 0 !important;
      box-shadow: 0 4px 24px rgba(26,86,160,0.10) !important;
      overflow: hidden !important;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;
      margin-bottom: 16px !important;
    }

    /* ── Legend / cabeçalho ── */
    #legInfAdicional {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      background: linear-gradient(135deg, #1a56a0 0%, #2563eb 100%) !important;
      color: #fff !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      letter-spacing: 0.3px !important;
      padding: 12px 20px !important;
      width: 100% !important;
      border-radius: 0 !important;
      border: none !important;
      margin: 0 !important;
      box-sizing: border-box !important;
    }
    #legInfAdicional * { color: #fff !important; }
    #legInfAdicional a { opacity: 0.9; transition: opacity 0.15s; }
    #legInfAdicional a:hover { opacity: 1; text-decoration: underline; }

    /* ── Badge de prevenção no cabeçalho ── */
    /* A classe .infoBadge é injetada via JS no span.ml-1 do legend */
    #legInfAdicional .infoBadge {
      display: inline-flex !important;
      align-items: center !important;
      background: rgba(255,255,255,0.18) !important;
      border: 1px solid rgba(255,255,255,0.35) !important;
      border-radius: 20px !important;
      padding: 2px 10px !important;
      font-size: 11px !important;
      font-weight: 500 !important;
      letter-spacing: 0.2px !important;
    }

    /* ── Div de conteúdo ── */
    #fldInformacoesAdicionais_content {
      padding: 8px 10px 6px !important;
      background: var(--ia-bg) !important;
    }

    /* ── Grid de cards ── */
    #fldInformacoesAdicionais_content .row.pl-5 {
      display: grid !important;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)) !important;
      gap: 6px !important;
      align-items: start !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    /* ── Cada card ── */
    #fldInformacoesAdicionais_content .col-md-4 {
      background: var(--ia-card-bg) !important;
      border: 1px solid var(--ia-border) !important;
      border-radius: 8px !important;
      padding: 6px 10px !important;
      box-shadow: var(--ia-shadow) !important;
      transition: var(--ia-transition) !important;
      text-align: left !important;
      margin: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      min-height: auto !important;
      position: relative !important;
      width: 100% !important;
      max-width: 100% !important;   /* sobrescreve Bootstrap: max-width: 33.33% */
      flex: unset !important;       /* sobrescreve Bootstrap: flex: 0 0 33.33% */
      flex-basis: auto !important;
      box-sizing: border-box !important;
      align-self: start !important;
    }
    #fldInformacoesAdicionais_content .col-md-4:hover {
      box-shadow: var(--ia-shadow-hover) !important;
      border-color: #93b4e8 !important;
      transform: translateY(-1px) !important;
    }

    /* ── Row interna de cada card ── */
    #fldInformacoesAdicionais_content .col-md-4 .row {
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
      margin: 0 !important;
      padding: 0 !important;
      align-items: flex-start !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }

    /* ── Label (título do campo) ── */
    #fldInformacoesAdicionais_content .col-md-4 .row span.col:first-child,
    #fldInformacoesAdicionais_content .col-md-4 .row span.text-right {
      font-size: 10.5px !important;
      font-weight: 600 !important;
      color: var(--ia-label-color) !important;
      text-transform: uppercase !important;
      letter-spacing: 0.4px !important;
      text-align: left !important;
      margin: 0 !important;
      padding: 0 !important;
      flex: unset !important;
      width: auto !important;
      line-height: 1.3 !important;
      overflow-wrap: break-word !important;
      word-break: break-word !important;
    }

    /* ── Valor do campo ── */
    #fldInformacoesAdicionais_content .col-md-4 .row span.font-weight-bold,
    #fldInformacoesAdicionais_content .col-md-4 .row span.text-left {
      font-size: 13px !important;
      font-weight: 600 !important;
      color: var(--ia-value-color) !important;
      text-align: left !important;
      margin: 0 !important;
      padding: 0 !important;
      flex: unset !important;
      width: auto !important;
      line-height: 1.4 !important;
      overflow-wrap: break-word !important;
    }
    #fldInformacoesAdicionais_content .col-md-4 .row span.font-weight-bold:not(:empty) {
      color: var(--ia-value-neg);
    }

    /* ── Rodapé da seção ── */
    #fldInformacoesAdicionais_content .row.mt-2 {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 10px 4px 2px !important;
      margin: 0 !important;
      font-size: 12px !important;
      color: #64748b !important;
    }

    .bootstrap-styles #fldInformacoesAdicionais label { margin-bottom: 0; }
    .bootstrap-styles.theme-contrast #fldInformacoesAdicionais label { margin-bottom: 0; }
  `;

  // ─── Regras de borda colorida por label ─────────────────────────────
  const REGRAS_BORDA = [
    { termos: ['criança', 'adolescente'],  cor: 'rgb(124, 58, 237)'  },
    { termos: ['demanda complexa'],        cor: 'rgb(124, 58, 237)'  },
    { termos: ['doença grave'],            cor: 'rgb(220, 38, 38)'   },
    { termos: ['réu preso'],               cor: 'rgb(220, 38, 38)'   },
    { termos: ['justiça gratuita'],        cor: 'rgb(21, 128, 61)'   },
    { termos: ['sigilo'],                  cor: 'rgb(180, 83, 9)'    },
    { termos: ['petição urgente'],         cor: 'rgb(234, 88, 12)'   },
    { termos: ['valor da causa'],          cor: 'rgb(26, 86, 160)'   },
  ];

  let scriptAtivo = false;
  let observer    = null;
  let scanTimer   = null;

  // ─── Injetar / remover a tag <style> ────────────────────────────────
  function injetarEstilo() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function removerEstiloTag() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  // ─── Aplicar estilos dinâmicos ───────────────────────────────────────
  function aplicarEstiloInformacoesAdicionais() {
    injetarEstilo();

    // Injeta .infoBadge no span.ml-1 do legend (referenciado pelo CSS)
    const legSpan = document.querySelector('#legInfAdicional .ml-1');
    if (legSpan && !legSpan.dataset.iaBadge) {
      legSpan.classList.add('infoBadge');
      legSpan.dataset.iaBadge = '1';
    }

    // Percorre os cards
    const cards = document.querySelectorAll(
      '#fldInformacoesAdicionais_content .row.pl-5 .col-md-4'
    );

    cards.forEach((card) => {
      if (card.dataset.iaEstilizado) return;
      card.dataset.iaEstilizado = '1';

      const labelSpan = card.querySelector('.row span.text-right') ||
                        card.querySelector('.row span.col:first-child');
      const valueSpan = card.querySelector('.row span.font-weight-bold') ||
                        card.querySelector('.row span.text-left');

      if (!labelSpan || !valueSpan) return;

      const labelNorm = labelSpan.textContent.trim().toLowerCase().replace(/:$/, '');
      const valueText = valueSpan.textContent.trim();
      const valueLower = valueText.toLowerCase();

      // Borda colorida
      for (const regra of REGRAS_BORDA) {
        if (regra.termos.some((t) => labelNorm.includes(t))) {
          card.style.setProperty('border-left', `3px solid ${regra.cor}`, 'important');
          card.style.setProperty('padding-left', '11px', 'important');
          break;
        }
      }

      // Verificar se o valor contém <a style="color:..."> definido pelo próprio eProc
      const linkComCor = valueSpan.querySelector('a[style]');
      const temCorInline = linkComCor &&
        /color/i.test(linkComCor.getAttribute('style') || '');
      if (temCorInline) return;

      // Cores / badges no span de valor (ordem importa: "Não há" antes de "Não")
      if (/^(sim|deferida|parcialmente deferida)$/i.test(valueText)) {
        valueSpan.style.setProperty('background',    'rgb(220,252,231)', 'important');
        valueSpan.style.setProperty('color',         'rgb(21,128,61)',   'important');
        valueSpan.style.setProperty('border-radius', '4px',              'important');
        valueSpan.style.setProperty('padding',       '1px 6px',          'important');
        valueSpan.dataset.iaValorEstilizado = '1';
      } else if (valueLower.includes('segredo') || valueLower.includes('sigiloso')) {
        valueSpan.style.setProperty('background',    'rgb(254,243,199)', 'important');
        valueSpan.style.setProperty('color',         'rgb(180,83,9)',    'important');
        valueSpan.style.setProperty('border-radius', '4px',              'important');
        valueSpan.style.setProperty('padding',       '1px 6px',          'important');
        valueSpan.dataset.iaValorEstilizado = '1';
      } else if (labelNorm.includes('valor da causa')) {
        valueSpan.style.setProperty('color',       'rgb(26,86,160)', 'important');
        valueSpan.style.setProperty('font-size',   '14px',           'important');
        valueSpan.style.setProperty('font-weight', '700',            'important');
        valueSpan.dataset.iaValorEstilizado = '1';
      } else if (
        /^\d+$/.test(valueText) ||
        /^listar$/i.test(valueText) ||
        /^não há/i.test(valueText)
      ) {
        valueSpan.style.setProperty('color', 'rgb(26,86,160)', 'important');
        valueSpan.dataset.iaValorEstilizado = '1';
      } else if (/^não/i.test(valueText)) {
        valueSpan.style.setProperty('color', 'rgb(100,116,139)', 'important');
        valueSpan.dataset.iaValorEstilizado = '1';
      }
    });
  }

  // ─── Remover estilos dinâmicos ───────────────────────────────────────
  function removerEstiloInformacoesAdicionais() {
    removerEstiloTag();

    // Remove .infoBadge do span do legend
    document.querySelectorAll('#legInfAdicional [data-ia-badge]').forEach((el) => {
      el.classList.remove('infoBadge');
      delete el.dataset.iaBadge;
    });

    // Remove estilos inline dos cards
    document.querySelectorAll(
      '#fldInformacoesAdicionais_content .col-md-4[data-ia-estilizado]'
    ).forEach((card) => {
      card.style.removeProperty('border-left');
      card.style.removeProperty('padding-left');
      delete card.dataset.iaEstilizado;
    });

    // Remove estilos inline dos spans de valor
    document.querySelectorAll('[data-ia-valor-estilizado]').forEach((span) => {
      span.style.removeProperty('background');
      span.style.removeProperty('color');
      span.style.removeProperty('border-radius');
      span.style.removeProperty('padding');
      span.style.removeProperty('font-size');
      span.style.removeProperty('font-weight');
      delete span.dataset.iaValorEstilizado;
    });
  }

  // ─── Varredura do DOM ────────────────────────────────────────────────
  function escanear() {
    if (document.getElementById('fldInformacoesAdicionais')) {
      aplicarEstiloInformacoesAdicionais();
    }
  }

  function escanearDebounced() {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      escanear();
    }, 80);
  }

  // ─── Ciclo de vida ───────────────────────────────────────────────────
  function ativarScript() {
    if (scriptAtivo) return;
    scriptAtivo = true;

    escanear();
    observer = new MutationObserver(escanearDebounced);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function desativarScript() {
    if (!scriptAtivo) return;
    scriptAtivo = false;

    if (scanTimer) { clearTimeout(scanTimer); scanTimer = null; }
    if (observer)  { observer.disconnect(); observer = null; }
    removerEstiloInformacoesAdicionais();
  }

  // ─── Reagir a mudanças em tempo real ────────────────────────────────
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (!changes[SETTINGS_KEY]) return;

    const enabled = changes[SETTINGS_KEY].newValue?.scripts?.[SCRIPT_ID]?.enabled ?? true;
    if (enabled && !scriptAtivo) ativarScript();
    if (!enabled && scriptAtivo) desativarScript();
  });

  // ─── Inicialização condicional ───────────────────────────────────────
  chrome.storage.local.get(SETTINGS_KEY, (data) => {
    const settings = data[SETTINGS_KEY] || {};
    const enabled  = settings?.scripts?.[SCRIPT_ID]?.enabled ?? true;
    if (enabled) ativarScript();
  });

})();
