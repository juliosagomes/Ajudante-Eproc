// scripts/tarjas-customizadas/tarjas-customizadas.js
// Pinta as tarjas (label.lblAvisoTopolabel / lblAvisoImportante) da capa do
// processo com cores padrão por texto (heurística) e permite que o usuário
// customize a cor de cada texto via color picker (right-click). Middle-click
// reseta todas as customizações.

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  const SETTINGS_KEY = 'eprocSettings';
  const STORAGE_KEY  = 'eprocTarjasCustomizadasCores';
  const SCRIPT_NAME  = 'tarjasCustomizadas';

  const CONTAINER_ID = 'divInfraBarraComandosSuperior';
  const EDITOR_CLASS = 'ajudante-tarja-editor-cor';
  const DATA_COR     = 'data-ajudante-cor';
  const DATA_WIRED   = 'data-ajudante-tarja-wired';

  // ─── Cores padrão por texto (heurística) ───────────────────────
  // Mantêm gradientes da versão antiga; aplicadas quando não há custom.
  const COR_GRATUITA      = { bg: 'linear-gradient(to bottom, #28a745, #208838)',                  color: 'white',   gradient: true };
  const COR_SEGREDO       = { bg: '#2c2c2c',                                                       color: 'white' };
  const COR_TUTELA        = { bg: '#982C98',                                                       color: 'white' };
  const COR_DIGITAL       = { bg: 'linear-gradient(to bottom, #4A90E2, #2E5BBA)',                  color: 'white',   gradient: true };
  const COR_IDOSO         = { bg: '#765F4B',                                                       color: 'white' };
  const COR_REU_PRESO     = { bg: '#FF125A',                                                       color: 'white' };
  const COR_NAO_VALIDADO  = { bg: 'linear-gradient(to bottom, #E5E5E5, rgb(201, 192, 201))',       color: '#111111', gradient: true };
  const COR_LITISCONS     = { bg: '#46565C',                                                       color: 'white' };
  const COR_DEFICIENCIA   = { bg: '#BF6600',                                                       color: 'white' };
  const COR_DESINTERESSE  = { bg: '#795D76',                                                       color: 'white' };
  const COR_CRIANCA       = { bg: 'linear-gradient(to bottom,rgb(99, 71, 210),rgb(3, 0, 159))',    color: 'white',   gradient: true };
  const COR_PENHORA       = { bg: '#0A2FA6',                                                       color: 'white' };
  const COR_DOENCA_GRAVE  = { bg: 'linear-gradient(to bottom, #FF3333, #E57A29)',                  color: 'white',   gradient: true };
  const COR_PRIORIDADE    = { bg: 'linear-gradient(to bottom, #EBE300, #EBBC00)',                  color: '#000000', gradient: true };
  const COR_REU_REVEL     = { bg: 'linear-gradient(to bottom, #CC5FEE, #6A0E86)',                  color: 'white',   gradient: true };
  const COR_BEM_ASSOC     = { bg: '#197D76',                                                       color: 'white' };
  const COR_SERASAJUD     = { bg: 'linear-gradient(to bottom, #D2E5E4,rgb(167, 201, 220))',        color: '#000000', gradient: true };

  // Mapa de migração (formato antigo: índice 0..17 → cor sólida hex equivalente).
  // Índice 0 = sem cor; gradientes viram a primeira cor do gradiente.
  const MIGRACAO_INDICE_HEX = {
    1:  '#28a745', 2:  '#2c2c2c', 3:  '#982c98', 4:  '#4a90e2',
    5:  '#765f4b', 6:  '#ff125a', 7:  '#e5e5e5', 8:  '#46565c',
    9:  '#bf6600', 10: '#795d76', 11: '#6347d2', 12: '#0a2fa6',
    13: '#ff3333', 14: '#ebe300', 15: '#cc5fee', 16: '#197d76',
    17: '#d2e5e4',
  };

  let moduloAtivo = false;
  let coresCustom = {}; // texto -> hex "#rrggbb"
  let observer = null;

  // ─── Heurística texto → cor padrão ─────────────────────────────
  function corPadraoPorTexto(textoLabel) {
    const t = (textoLabel || '').trim();
    const l = t.toLowerCase();
    if (l.includes('assunto não validado')) return COR_NAO_VALIDADO;
    if (l.includes('juízo 100% digital')) return COR_DIGITAL;
    if (l.includes('réu preso')) return COR_REU_PRESO;
    if (l.includes('litisconsórcio')) return COR_LITISCONS;
    if (l.includes('deficiência')) return COR_DEFICIENCIA;
    if (l.includes('manifesta desinteresse')) return COR_DESINTERESSE;
    if (l.includes('criança e adolescente') || l.includes('criança/adolescente')) return COR_CRIANCA;
    if (l.includes('penhora no rosto dos autos')) return COR_PENHORA;
    if (l.includes('doença grave')) return COR_DOENCA_GRAVE;
    if (l.includes('prioridade atendimento')) return COR_PRIORIDADE;
    if (l.includes('réu revel')) return COR_REU_REVEL;
    if (l.includes('possui bem associado')) return COR_BEM_ASSOC;
    if (l.includes('serasajud')) return COR_SERASAJUD;
    if (l.includes('gratuita')) return COR_GRATUITA;
    if (l.includes('segredo') || t.includes('sigiloso')) return COR_SEGREDO;
    if (l.includes('tutela')) return COR_TUTELA;
    if (l.includes('idoso')) return COR_IDOSO;
    return null;
  }

  // ─── Contraste WCAG (luminância relativa) ──────────────────────
  function luminancia(hex) {
    const parse = (s) => parseInt(s, 16) / 255;
    const lin   = (v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    const r = lin(parse(hex.slice(1, 3)));
    const g = lin(parse(hex.slice(3, 5)));
    const b = lin(parse(hex.slice(5, 7)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function textoContraste(bgHex) {
    return luminancia(bgHex) > 0.35 ? '#111111' : '#ffffff';
  }

  function corCustomObj(hex) {
    return { bg: hex, color: textoContraste(hex) };
  }

  // ─── Aplicação de cor ──────────────────────────────────────────
  function corAlvoPorLabel(label) {
    const texto = (label.textContent || '').trim();
    if (!texto) return null;
    const custom = coresCustom[texto];
    if (custom) return corCustomObj(custom);
    return corPadraoPorTexto(texto);
  }

  function aplicarCor(label, cor) {
    const chave = cor ? `${cor.bg}|${cor.color}` : 'none';
    if (label.getAttribute(DATA_COR) === chave) return;

    label.style.removeProperty('background');
    label.style.removeProperty('background-color');

    if (!cor) {
      label.style.removeProperty('color');
      label.style.removeProperty('--ajudante-tarja-text-color');
      label.style.removeProperty('animation');
      for (const link of label.querySelectorAll('a')) {
        link.style.removeProperty('color');
      }
      label.setAttribute(DATA_COR, 'none');
      return;
    }

    if (cor.gradient) label.style.background = cor.bg;
    else label.style.backgroundColor = cor.bg;
    label.style.color = cor.color;
    label.style.setProperty('--ajudante-tarja-text-color', cor.color);
    for (const link of label.querySelectorAll('a')) {
      link.style.setProperty('color', cor.color, 'important');
    }
    label.setAttribute(DATA_COR, chave);
  }

  function pintarTodasTarjas() {
    if (!moduloAtivo) return;
    const labels = document.querySelectorAll(
      `#${CONTAINER_ID} label.lblAvisoTopolabel, #${CONTAINER_ID} label.lblAvisoImportante`
    );
    for (const label of labels) {
      aplicarCor(label, corAlvoPorLabel(label));
    }
  }

  function despintarTodasTarjas() {
    const labels = document.querySelectorAll(`#${CONTAINER_ID} label[${DATA_COR}]`);
    for (const label of labels) {
      label.style.removeProperty('background');
      label.style.removeProperty('background-color');
      label.style.removeProperty('color');
      label.style.removeProperty('--ajudante-tarja-text-color');
      label.style.removeProperty('animation');
      for (const link of label.querySelectorAll('a')) {
        link.style.removeProperty('color');
      }
      label.removeAttribute(DATA_COR);
      label.removeAttribute(DATA_WIRED);
      label.removeAttribute('title');
    }
  }

  // ─── Storage ───────────────────────────────────────────────────
  function salvarCorCustom(texto, hex) {
    coresCustom[texto] = hex;
    chrome.storage.local.set({ [STORAGE_KEY]: coresCustom });
  }

  function removerCorCustom(texto) {
    delete coresCustom[texto];
    chrome.storage.local.set({ [STORAGE_KEY]: coresCustom });
  }

  function resetarTodasCoresCustom() {
    coresCustom = {};
    chrome.storage.local.set({ [STORAGE_KEY]: {} }, () => {
      pintarTodasTarjas();
    });
  }

  // Migra valores antigos (índices numéricos) para hex sólido.
  function migrarCoresCustom(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    let mudou = false;
    for (const [texto, valor] of Object.entries(raw)) {
      if (typeof valor === 'string' && /^#[0-9a-f]{6}$/i.test(valor)) {
        out[texto] = valor.toLowerCase();
        continue;
      }
      const idx = typeof valor === 'number' ? valor : parseInt(valor, 10);
      if (Number.isFinite(idx) && MIGRACAO_INDICE_HEX[idx]) {
        out[texto] = MIGRACAO_INDICE_HEX[idx];
        mudou = true;
      } else if (idx === 0) {
        // Antigo "sem cor" — sem entrada equivale a heurística padrão; descarta.
        mudou = true;
      }
    }
    if (mudou) chrome.storage.local.set({ [STORAGE_KEY]: out });
    return out;
  }

  // ─── Editor de cor (right-click) ───────────────────────────────
  function fecharEditor() {
    document.querySelectorAll(`.${EDITOR_CLASS}`).forEach(el => el.remove());
    document.querySelectorAll('label[data-ajudante-tarja-z]').forEach((label) => {
      const z = label.getAttribute('data-ajudante-tarja-z');
      label.style.zIndex = z === 'auto' ? '' : z;
      if (z === 'auto') label.style.position = '';
      label.removeAttribute('data-ajudante-tarja-z');
    });
  }

  function exibirEditorCor(event, label) {
    event.preventDefault();
    event.stopPropagation();
    fecharEditor();

    const textoLabel = (label.textContent || '').trim();
    if (!textoLabel) return;

    const customAtual = coresCustom[textoLabel] || null;
    const padrao      = corPadraoPorTexto(textoLabel);
    // Valor inicial do picker: custom > primeira cor do padrão (se sólido) > cinza.
    const corInicial = customAtual
      || (padrao && !padrao.gradient && /^#[0-9a-f]{6}$/i.test(padrao.bg) ? padrao.bg : '#7ab3d8');

    label.setAttribute('data-ajudante-tarja-z', window.getComputedStyle(label).zIndex || 'auto');
    label.style.zIndex = '10004';
    label.style.position = 'relative';

    const editor = document.createElement('div');
    editor.className = EDITOR_CLASS;

    const titulo = document.createElement('div');
    titulo.className = `${EDITOR_CLASS}__titulo`;
    titulo.innerHTML =
      '<svg viewBox="0 0 16 16" fill="none" width="12" height="12" aria-hidden="true">' +
        '<circle cx="4"  cy="4"  r="2" fill="currentColor"/>' +
        '<circle cx="12" cy="4"  r="2" fill="currentColor" opacity=".65"/>' +
        '<circle cx="4"  cy="12" r="2" fill="currentColor" opacity=".5"/>' +
        '<circle cx="12" cy="12" r="2" fill="currentColor" opacity=".85"/>' +
      '</svg> Cor da tarja';

    const nomeEl = document.createElement('div');
    nomeEl.className = `${EDITOR_CLASS}__nome`;
    nomeEl.textContent = textoLabel;

    const field = document.createElement('div');
    field.className = `${EDITOR_CLASS}__field`;

    const picker = document.createElement('input');
    picker.type = 'color';
    picker.className = `${EDITOR_CLASS}__picker`;
    picker.value = corInicial;

    const preview = document.createElement('span');
    preview.className = `${EDITOR_CLASS}__preview`;

    function atualizarPreview() {
      const cor = picker.value;
      preview.style.background = cor;
      preview.style.color = textoContraste(cor);
      preview.textContent = textoLabel;
    }
    picker.addEventListener('input', atualizarPreview);
    atualizarPreview();

    field.appendChild(picker);
    field.appendChild(preview);

    const botoes = document.createElement('div');
    botoes.className = `${EDITOR_CLASS}__botoes`;

    const btnSalvar = document.createElement('button');
    btnSalvar.type      = 'button';
    btnSalvar.className = `${EDITOR_CLASS}__btn ${EDITOR_CLASS}__btn--salvar`;
    btnSalvar.textContent = 'Salvar';
    btnSalvar.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const hex = picker.value.toLowerCase();
      salvarCorCustom(textoLabel, hex);
      aplicarCor(label, corCustomObj(hex));
      fecharEditor();
    });

    const btnCancelar = document.createElement('button');
    btnCancelar.type      = 'button';
    btnCancelar.className = `${EDITOR_CLASS}__btn ${EDITOR_CLASS}__btn--cancelar`;
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fecharEditor();
    });

    botoes.appendChild(btnSalvar);

    if (customAtual) {
      const btnRemover = document.createElement('button');
      btnRemover.type      = 'button';
      btnRemover.className = `${EDITOR_CLASS}__btn ${EDITOR_CLASS}__btn--remover`;
      btnRemover.textContent = 'Remover';
      btnRemover.title = 'Voltar à cor padrão deste texto';
      btnRemover.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removerCorCustom(textoLabel);
        aplicarCor(label, corPadraoPorTexto(textoLabel));
        fecharEditor();
      });
      botoes.appendChild(btnRemover);
    }

    botoes.appendChild(btnCancelar);

    editor.appendChild(titulo);
    editor.appendChild(nomeEl);
    editor.appendChild(field);
    editor.appendChild(botoes);

    document.body.appendChild(editor);

    // Posicionamento respeitando viewport
    const rect = label.getBoundingClientRect();
    const margem = 8;
    const gap = 6;
    const w = editor.offsetWidth  || 240;
    const h = editor.offsetHeight || 0;
    const vw = document.documentElement.clientWidth || window.innerWidth || 0;
    const vh = document.documentElement.clientHeight || window.innerHeight || 0;

    let left = rect.left;
    let top  = rect.bottom + gap;
    if (top + h + margem > vh && rect.top - gap - h >= margem) {
      top = rect.top - gap - h;
    }
    left = Math.min(Math.max(left, margem), Math.max(margem, vw - w - margem));
    top  = Math.min(Math.max(top,  margem), Math.max(margem, vh - h - margem));

    editor.style.position = 'fixed';
    editor.style.left = `${Math.round(left)}px`;
    editor.style.top  = `${Math.round(top)}px`;
    editor.style.zIndex = '10003';

    // ESC e click fora — delega ao modalManager se disponível
    if (window.__AjudanteEproc?.modalManager) {
      window.__AjudanteEproc.modalManager.registerModal(EDITOR_CLASS, editor, fecharEditor, {
        priority: 50,
        disableFocusTrap: true,
      });
    } else {
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          fecharEditor();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    }

    setTimeout(() => {
      const fecharFora = (e) => {
        if (!editor.contains(e.target)) {
          if (e.button === 2 || e.which === 3) {
            e.preventDefault();
            e.stopPropagation();
          }
          fecharEditor();
          document.removeEventListener('mousedown', fecharFora);
          document.removeEventListener('contextmenu', fecharFora);
        }
      };
      document.addEventListener('mousedown', fecharFora);
      document.addEventListener('contextmenu', fecharFora);
    }, 0);

    // Abre o color picker nativo imediatamente
    picker.click();
  }

  // ─── Listeners por tarja ───────────────────────────────────────
  function instalarListeners() {
    if (!moduloAtivo) return;
    const labels = document.querySelectorAll(
      `#${CONTAINER_ID} label.lblAvisoTopolabel, #${CONTAINER_ID} label.lblAvisoImportante`
    );
    for (const label of labels) {
      label.title = 'Click direito: alterar cor da tarja\n•••••\nClick central: resetar todas as cores';
      if (label.hasAttribute(DATA_WIRED)) continue;
      label.setAttribute(DATA_WIRED, 'true');

      label.addEventListener('contextmenu', (e) => {
        if (!moduloAtivo) return;
        e.preventDefault();
        e.stopPropagation();
        exibirEditorCor(e, label);
      });

      label.addEventListener('mousedown', (e) => {
        if (e.button !== 1) return; // somente botão do meio
        if (!moduloAtivo) return;
        e.preventDefault();
        e.stopPropagation();
        resetarTodasCoresCustom();
      });
    }
  }

  // ─── Observer ──────────────────────────────────────────────────
  function iniciarObserver() {
    if (observer) return;
    observer = new MutationObserver(() => {
      if (!moduloAtivo) return;
      const barra = document.getElementById(CONTAINER_ID);
      if (!barra) return;
      pintarTodasTarjas();
      instalarListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function pararObserver() {
    if (observer) {
      try { observer.disconnect(); } catch (_) {}
      observer = null;
    }
  }

  // ─── Bootstrap ─────────────────────────────────────────────────
  function ativarModulo() {
    moduloAtivo = true;
    pintarTodasTarjas();
    instalarListeners();
    iniciarObserver();
  }

  function desativarModulo() {
    moduloAtivo = false;
    pararObserver();
    despintarTodasTarjas();
    fecharEditor();
  }

  function carregarEstadoEIniciar() {
    chrome.storage.local.get([SETTINGS_KEY, STORAGE_KEY], (data) => {
      const cfg = data[SETTINGS_KEY]?.scripts?.[SCRIPT_NAME];
      coresCustom = migrarCoresCustom(data[STORAGE_KEY]);
      if (cfg?.enabled) ativarModulo();
    });
  }

  // Reage a mudanças de settings/cores em outras abas
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes[STORAGE_KEY]) {
      coresCustom = changes[STORAGE_KEY].newValue || {};
      if (moduloAtivo) pintarTodasTarjas();
    }

    if (changes[SETTINGS_KEY]) {
      const novo = changes[SETTINGS_KEY].newValue?.scripts?.[SCRIPT_NAME];
      const queriaLigado = !!novo?.enabled;
      if (queriaLigado && !moduloAtivo) ativarModulo();
      else if (!queriaLigado && moduloAtivo) desativarModulo();
    }
  });

  carregarEstadoEIniciar();
})();
