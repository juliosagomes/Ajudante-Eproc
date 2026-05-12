// scripts/informacoes-adicionais/informacoes-adicionais.js — Ajuste Visual: Informações Adicionais

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  const SETTINGS_KEY  = 'eprocSettings';
  const SCRIPT_ID     = 'informacoesAdicionais';
  const STYLE_ID      = 'modernInfoAdicional';
  const IA_STORAGE_KEY = 'eproc_ia_prefs';

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

    /* ── Botão Personalizar ── */
    #ia-btn-personalizar {
      margin-left: auto !important;
      background: rgba(255,255,255,0.15) !important;
      border: 1px solid rgba(255,255,255,0.4) !important;
      border-radius: 20px !important;
      color: #fff !important;
      font-size: 11.5px !important;
      font-weight: 600 !important;
      padding: 3px 12px !important;
      cursor: pointer !important;
      transition: background 0.2s !important;
      white-space: nowrap !important;
      letter-spacing: 0.2px !important;
      line-height: 1.5 !important;
    }
    #ia-btn-personalizar:hover { background: rgba(255,255,255,0.28) !important; }
    #ia-btn-personalizar.ativo {
      background: rgba(255,255,255,0.35) !important;
      border-color: rgba(255,255,255,0.7) !important;
    }

    /* ── Toolbar de cada card no modo personalizar ── */
    .ia-card-toolbar {
      position: absolute !important;
      top: 4px !important;
      right: 4px !important;
      display: flex !important;
      gap: 4px !important;
      z-index: 10 !important;
      opacity: 0 !important;
      transition: opacity 0.15s !important;
      pointer-events: none !important;
    }
    /* Toolbar visível ao hover, e sempre visível em cards ocultos */
    .ia-edit-mode .col-md-4:hover .ia-card-toolbar,
    .ia-card-oculto .ia-card-toolbar {
      opacity: 1 !important;
      pointer-events: auto !important;
    }
    .ia-card-toolbar button {
      width: 22px !important;
      height: 22px !important;
      border-radius: 4px !important;
      border: 1px solid rgba(0,0,0,0.15) !important;
      background: #fff !important;
      cursor: pointer !important;
      font-size: 12px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15) !important;
      line-height: 1 !important;
    }
    .ia-card-toolbar button:hover { background: #f0f4ff !important; }
    .ia-card-toolbar input[type=color] {
      width: 22px !important;
      height: 22px !important;
      border-radius: 4px !important;
      border: 1px solid rgba(0,0,0,0.15) !important;
      cursor: pointer !important;
      padding: 1px !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15) !important;
    }

    /* Card oculto: visível mas com opacidade baixa no modo personalizar */
    .ia-card-oculto { opacity: 0.3 !important; }
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

  // ─── Utilitários de personalização ──────────────────────────────────
  function iaCarregarPrefs() {
    try { return JSON.parse(localStorage.getItem(IA_STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }

  function iaSalvarPrefs(p) {
    localStorage.setItem(IA_STORAGE_KEY, JSON.stringify(p));
  }

  function iaChaveCard(card) {
    const l = card.querySelector('span.col:first-child, span.text-right');
    return l?.textContent?.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') || '';
  }

  function iaRgbParaHex(rgb) {
    const m = rgb.match(/\d+/g);
    if (!m || m.length < 3) return '#d1dff5';
    return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  }

  // ─── Aplicar preferências salvas ────────────────────────────────────
  // Chamada após os estilos automáticos para que customizações do usuário
  // tenham prioridade. Ignorada enquanto o modo edição está ativo para não
  // sobrescrever o display temporário dos cards ocultos.
  function iaAplicarPrefsStorage() {
    if (iaModoAtivo) return;
    const prefs = iaCarregarPrefs();
    const gridRow = document.querySelector('#fldInformacoesAdicionais_content .row.pl-5');
    if (!gridRow) return;
    Array.from(gridRow.children).forEach((card) => {
      const pref = prefs[iaChaveCard(card)];
      if (!pref) return;
      if (pref.oculto) {
        card.style.setProperty('display', 'none', 'important');
      }
      if (pref.corBorda) {
        card.style.setProperty('border-left', `3px solid ${pref.corBorda}`, 'important');
        card.style.setProperty('padding-left', '11px', 'important');
      } else if (pref.corBorda === null) {
        card.style.removeProperty('border-left');
        card.style.removeProperty('padding-left');
      }
    });
  }

  // ─── Toolbar de edição por card ──────────────────────────────────────
  function iaCriarToolbar(card) {
    if (card.querySelector('.ia-card-toolbar')) return;
    const prefs = iaCarregarPrefs();
    const chave = iaChaveCard(card);
    const pref  = prefs[chave] || {};

    const toolbar = document.createElement('div');
    toolbar.className = 'ia-card-toolbar';

    // Botão ocultar / mostrar
    const btnOcultar = document.createElement('button');
    btnOcultar.type      = 'button';
    btnOcultar.textContent = pref.oculto ? '👁️' : '🚫';
    btnOcultar.title     = pref.oculto ? 'Mostrar card' : 'Ocultar card';
    if (pref.oculto) card.classList.add('ia-card-oculto');

    btnOcultar.addEventListener('click', (e) => {
      e.stopPropagation();
      const p  = iaCarregarPrefs();
      const cp = p[chave] || {};
      cp.oculto = !cp.oculto;
      p[chave]  = cp;
      iaSalvarPrefs(p);
      card.classList.toggle('ia-card-oculto', cp.oculto);
      btnOcultar.textContent = cp.oculto ? '👁️' : '🚫';
      btnOcultar.title       = cp.oculto ? 'Mostrar card' : 'Ocultar card';
    });

    // Input de cor da borda
    const inputCor = document.createElement('input');
    inputCor.type  = 'color';
    inputCor.title = 'Alterar cor de destaque';
    const corAtual = card.style.borderLeftColor;
    inputCor.value = (corAtual && corAtual !== '' &&
                      corAtual !== 'rgb(209, 223, 245)' &&
                      corAtual !== 'rgba(0, 0, 0, 0)')
      ? iaRgbParaHex(corAtual) : '#d1dff5';

    inputCor.addEventListener('input', (e) => {
      e.stopPropagation();
      card.style.setProperty('border-left', `3px solid ${inputCor.value}`, 'important');
      card.style.setProperty('padding-left', '11px', 'important');
    });
    inputCor.addEventListener('change', (e) => {
      e.stopPropagation();
      const p  = iaCarregarPrefs();
      const cp = p[chave] || {};
      cp.corBorda = inputCor.value;
      p[chave]    = cp;
      iaSalvarPrefs(p);
    });

    // Botão remover borda
    const btnSem = document.createElement('button');
    btnSem.type        = 'button';
    btnSem.title       = 'Remover borda de destaque';
    btnSem.textContent = '✕';
    btnSem.style.cssText = 'font-size:10px!important';
    btnSem.addEventListener('click', (e) => {
      e.stopPropagation();
      card.style.removeProperty('border-left');
      card.style.removeProperty('padding-left');
      inputCor.value = '#d1dff5';
      const p  = iaCarregarPrefs();
      const cp = p[chave] || {};
      cp.corBorda = null;
      p[chave]    = cp;
      iaSalvarPrefs(p);
    });

    toolbar.appendChild(btnOcultar);
    toolbar.appendChild(inputCor);
    toolbar.appendChild(btnSem);
    card.appendChild(toolbar);
  }

  // ─── Estado do módulo ────────────────────────────────────────────────
  let scriptAtivo = false;
  let observer    = null;
  let scanTimer   = null;
  let iaModoAtivo = false; // módulo-level: evita iaAplicarPrefsStorage() no modo edição

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

  // ─── Aplicar estilos ────────────────────────────────────────────────
  function aplicarEstiloInformacoesAdicionais() {
    injetarEstilo();

    // Injeta .infoBadge no span.ml-1 do legend (referenciado pelo CSS)
    const legSpan = document.querySelector('#legInfAdicional .ml-1');
    if (legSpan && !legSpan.dataset.iaBadge) {
      legSpan.classList.add('infoBadge');
      legSpan.dataset.iaBadge = '1';
    }

    // Percorre os cards aplicando estilos automáticos
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

      const labelNorm  = labelSpan.textContent.trim().toLowerCase().replace(/:$/, '');
      const valueText  = valueSpan.textContent.trim();
      const valueLower = valueText.toLowerCase();

      // Borda colorida automática
      for (const regra of REGRAS_BORDA) {
        if (regra.termos.some((t) => labelNorm.includes(t))) {
          card.style.setProperty('border-left', `3px solid ${regra.cor}`, 'important');
          card.style.setProperty('padding-left', '11px', 'important');
          break;
        }
      }

      // Não sobrescrever cores inline definidas pelo próprio eProc
      const linkComCor  = valueSpan.querySelector('a[style]');
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

    // Aplicar preferências salvas pelo usuário (após estilos automáticos)
    iaAplicarPrefsStorage();

    // Botão Personalizar — criado uma única vez no legend
    if (document.getElementById('ia-btn-personalizar')) return;
    const leg = document.getElementById('legInfAdicional');
    if (!leg) return;

    const btn  = document.createElement('button');
    btn.id     = 'ia-btn-personalizar';
    btn.type   = 'button'; // evita submit do formulário da página
    btn.textContent = '🎨 Personalizar';
    leg.appendChild(btn);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      iaModoAtivo = !iaModoAtivo;
      const gridRow = document.querySelector('#fldInformacoesAdicionais_content .row.pl-5');
      if (!gridRow) return;

      if (iaModoAtivo) {
        btn.classList.add('ativo');
        btn.textContent = '✅ Concluir';
        gridRow.classList.add('ia-edit-mode');
        // Mostrar todos os cards (incluindo ocultos) para permitir restauração
        Array.from(gridRow.children).forEach((card) => {
          card.style.removeProperty('display');
          iaCriarToolbar(card);
        });
      } else {
        btn.classList.remove('ativo');
        btn.textContent = '🎨 Personalizar';
        gridRow.classList.remove('ia-edit-mode');
        // Remover toolbars e classes de edição
        gridRow.querySelectorAll('.ia-card-toolbar').forEach((t) => t.remove());
        gridRow.querySelectorAll('.ia-card-oculto').forEach((c) => c.classList.remove('ia-card-oculto'));
        // Restaurar display:none nos cards marcados como ocultos
        const prefs = iaCarregarPrefs();
        Array.from(gridRow.children).forEach((card) => {
          if (prefs[iaChaveCard(card)]?.oculto) {
            card.style.setProperty('display', 'none', 'important');
          }
        });
      }
    });
  }

  // ─── Remover estilos dinâmicos ───────────────────────────────────────
  function removerEstiloInformacoesAdicionais() {
    removerEstiloTag();

    // Garantir que o modo edição seja encerrado limpo
    iaModoAtivo = false;

    // Remove botão Personalizar
    const btnPersonalizar = document.getElementById('ia-btn-personalizar');
    if (btnPersonalizar) btnPersonalizar.remove();

    // Remove toolbars e classes de edição
    document.querySelectorAll('.ia-card-toolbar').forEach((t) => t.remove());
    document.querySelectorAll('.ia-card-oculto').forEach((c) => c.classList.remove('ia-card-oculto'));
    document.querySelectorAll('.ia-edit-mode').forEach((el) => el.classList.remove('ia-edit-mode'));

    // Restaura display de todos os cards (remove o display:none injetado)
    document.querySelectorAll(
      '#fldInformacoesAdicionais_content .col-md-4'
    ).forEach((card) => card.style.removeProperty('display'));

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
