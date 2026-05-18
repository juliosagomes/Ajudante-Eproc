// scripts/informacoes-adicionais/informacoes-adicionais.js — Ajuste Visual: Informações Adicionais

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  const SETTINGS_KEY  = 'eprocSettings';
  const SCRIPT_ID     = 'informacoesAdicionais';
  const STYLE_ID      = 'modernInfoAdicional';
  const IA_STORAGE_KEY = 'eproc_ia_prefs';

  // ─── Ícones SVG (alinhados com a identidade da extensão) ────────────
  const ICON_EYE     = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  const ICON_EYE_OFF = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M6.61 6.61A18.5 18.5 0 0 0 2 12s3 8 10 8a9.7 9.7 0 0 0 5.4-1.61"/><line x1="3" y1="3" x2="21" y2="21"/></svg>';
  const ICON_X       = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const ICON_BRUSH   = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>';
  // Badge sólido (estilo ✅): círculo verde + check branco. Cores explícitas
  // pra não serem afetadas pelo override de cor do botão no estado ativo.
  const ICON_CHECK   = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><circle cx="12" cy="12" r="10" fill="#15803d"/><path d="M7.5 12.3l3 3 6-7" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ─── CSS ────────────────────────────────────────────────────────────
  const CSS = `
    /* ── Tokens alinhados à paleta da extensão (sky/mid/deep/navy/cloud) ── */
    :root {
      --ia-deep:         #2d6fa8;
      --ia-mid:          #4a8fc4;
      --ia-sky:          #7ab3d8;
      --ia-navy:         #0f172a;
      --ia-ink:          #1e3a5f;
      --ia-cloud:        #f1f5f9;
      --ia-sky-10:       #f0f7fc;
      --ia-sky-20:       #ddeef8;
      --ia-border:       #e2e8f0;
      --ia-border-soft:  #eef2f7;
      --ia-text:         #0f172a;
      --ia-label-color:  #475569;
      --ia-value-color:  #0f172a;
      --ia-value-neg:    #64748b;
      --ia-value-pos:    #15803d;
      --ia-value-warn:   #b45309;
      --ia-radius:       12px;
      --ia-shadow:       0 1px 2px rgba(15,23,42,0.05), 0 1px 1px rgba(15,23,42,0.03);
      --ia-shadow-hover: 0 6px 18px -4px rgba(15,23,42,0.12), 0 2px 6px -2px rgba(15,23,42,0.06);
      --ia-ease:         cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* ── Fieldset principal ── */
    #fldInformacoesAdicionais {
      border: 1px solid var(--ia-border) !important;
      background: #ffffff !important;
      border-radius: var(--ia-radius) !important;
      padding: 0 !important;
      box-shadow: var(--ia-shadow) !important;
      overflow: hidden !important;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;
      margin-bottom: 16px !important;
    }

    /* ── Legend / cabeçalho — sólido --ia-deep, sem gradiente saturado ── */
    #legInfAdicional {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      background: var(--ia-deep) !important;
      color: #fff !important;
      font-size: 13.5px !important;
      font-weight: 600 !important;
      letter-spacing: 0.02em !important;
      padding: 11px 18px !important;
      width: 100% !important;
      border-radius: 0 !important;
      border: none !important;
      margin: 0 !important;
      box-sizing: border-box !important;
    }
    #legInfAdicional * { color: #fff !important; }
    #legInfAdicional a {
      opacity: 0.82 !important;
      transition: opacity 0.25s var(--ia-ease) !important;
    }
    #legInfAdicional a:hover { opacity: 1 !important; text-decoration: underline !important; }

    /* ── Badge de prevenção no cabeçalho ── */
    /* A classe .infoBadge é injetada via JS no span.ml-1 do legend */
    #legInfAdicional .infoBadge {
      display: inline-flex !important;
      align-items: center !important;
      background: rgba(255,255,255,0.14) !important;
      border: 1px solid rgba(255,255,255,0.28) !important;
      border-radius: 999px !important;
      padding: 2px 10px !important;
      font-size: 11px !important;
      font-weight: 500 !important;
      letter-spacing: 0.02em !important;
    }

    /* ── Div de conteúdo ── */
    #fldInformacoesAdicionais_content {
      padding: 10px 12px 8px !important;
      background: var(--ia-cloud) !important;
    }

    /* ── Grid de cards ── */
    #fldInformacoesAdicionais_content .row.pl-5 {
      display: grid !important;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)) !important;
      gap: 8px !important;
      align-items: start !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    /* ── Cada card ── */
    #fldInformacoesAdicionais_content .col-md-4 {
      background: #ffffff !important;
      border: 1px solid var(--ia-border) !important;
      border-radius: 8px !important;
      padding: 8px 12px !important;
      box-shadow: var(--ia-shadow) !important;
      transition:
        border-color 0.25s var(--ia-ease),
        box-shadow   0.30s var(--ia-ease),
        transform    0.30s var(--ia-ease) !important;
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
      border-color: var(--ia-sky) !important;
      box-shadow: var(--ia-shadow-hover) !important;
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
      letter-spacing: 0.06em !important;
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
      color: var(--ia-label-color) !important;
    }

    .bootstrap-styles #fldInformacoesAdicionais label { margin-bottom: 0; }
    .bootstrap-styles.theme-contrast #fldInformacoesAdicionais label { margin-bottom: 0; }

    /* ── Botão Personalizar ── */
    #ia-btn-personalizar {
      margin-left: auto !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      background: rgba(255,255,255,0.12) !important;
      border: 1px solid rgba(255,255,255,0.30) !important;
      border-radius: 999px !important;
      color: #fff !important;
      font-size: 11.5px !important;
      font-weight: 600 !important;
      padding: 4px 13px !important;
      cursor: pointer !important;
      transition:
        background-color 0.25s var(--ia-ease),
        border-color     0.25s var(--ia-ease),
        color            0.25s var(--ia-ease) !important;
      white-space: nowrap !important;
      letter-spacing: 0.02em !important;
      line-height: 1.4 !important;
    }
    #ia-btn-personalizar svg { display: block !important; }
    #ia-btn-personalizar:hover {
      background: rgba(255,255,255,0.22) !important;
      border-color: rgba(255,255,255,0.5) !important;
    }
    #ia-btn-personalizar.ativo {
      background: #ffffff !important;
      border-color: #ffffff !important;
      color: var(--ia-deep) !important;
    }
    /* Override do "#legInfAdicional * { color:#fff }": no estado ativo
       o conteúdo do botão precisa herdar o deep, não branco em branco. */
    #ia-btn-personalizar.ativo span,
    #ia-btn-personalizar.ativo svg {
      color: var(--ia-deep) !important;
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
      transition: opacity 0.2s var(--ia-ease) !important;
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
      border-radius: 5px !important;
      border: 1px solid var(--ia-border) !important;
      background: #fff !important;
      cursor: pointer !important;
      color: var(--ia-label-color) !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      box-shadow: 0 1px 2px rgba(15,23,42,0.08) !important;
      line-height: 1 !important;
      transition:
        background-color 0.2s var(--ia-ease),
        color            0.2s var(--ia-ease),
        border-color     0.2s var(--ia-ease) !important;
    }
    .ia-card-toolbar button:hover {
      background: var(--ia-sky-10) !important;
      border-color: var(--ia-sky) !important;
      color: var(--ia-deep) !important;
    }
    .ia-card-toolbar button svg { display: block !important; }
    .ia-card-toolbar input[type=color] {
      width: 22px !important;
      height: 22px !important;
      border-radius: 5px !important;
      border: 1px solid var(--ia-border) !important;
      cursor: pointer !important;
      padding: 1px !important;
      box-shadow: 0 1px 2px rgba(15,23,42,0.08) !important;
      background: #fff !important;
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
    { termos: ['valor da causa'],          cor: 'rgb(45, 111, 168)'  },
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
    btnOcultar.innerHTML = pref.oculto ? ICON_EYE : ICON_EYE_OFF;
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
      btnOcultar.innerHTML = cp.oculto ? ICON_EYE : ICON_EYE_OFF;
      btnOcultar.title     = cp.oculto ? 'Mostrar card' : 'Ocultar card';
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
    btnSem.type      = 'button';
    btnSem.title     = 'Remover borda de destaque';
    btnSem.innerHTML = ICON_X;
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
        valueSpan.style.setProperty('color',       '#2d6fa8', 'important');
        valueSpan.style.setProperty('font-size',   '14px',    'important');
        valueSpan.style.setProperty('font-weight', '700',     'important');
        valueSpan.dataset.iaValorEstilizado = '1';
      } else if (
        /^\d+$/.test(valueText) ||
        /^listar$/i.test(valueText) ||
        /^não há/i.test(valueText)
      ) {
        valueSpan.style.setProperty('color', '#2d6fa8', 'important');
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
    btn.innerHTML = ICON_BRUSH + '<span>Personalizar</span>';
    leg.appendChild(btn);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      iaModoAtivo = !iaModoAtivo;
      const gridRow = document.querySelector('#fldInformacoesAdicionais_content .row.pl-5');
      if (!gridRow) return;

      if (iaModoAtivo) {
        btn.classList.add('ativo');
        btn.innerHTML = ICON_CHECK + '<span>Concluir</span>';
        gridRow.classList.add('ia-edit-mode');
        // Mostrar todos os cards (incluindo ocultos) para permitir restauração
        Array.from(gridRow.children).forEach((card) => {
          card.style.removeProperty('display');
          iaCriarToolbar(card);
        });
      } else {
        btn.classList.remove('ativo');
        btn.innerHTML = ICON_BRUSH + '<span>Personalizar</span>';
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
