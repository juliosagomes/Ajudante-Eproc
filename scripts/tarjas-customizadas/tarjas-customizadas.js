// scripts/tarjas-customizadas/tarjas-customizadas.js
// Pinta as tarjas (label.lblAvisoTopolabel / lblAvisoImportante) da capa do processo
// com 18 cores predefinidas, mapeando por texto. Right-click abre menu de cor;
// middle-click reseta todas as customizacoes.

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  const SETTINGS_KEY = 'eprocSettings';
  const STORAGE_KEY  = 'eprocTarjasCustomizadasCores';
  const SCRIPT_NAME  = 'tarjasCustomizadas';

  const CONTAINER_ID = 'divInfraBarraComandosSuperior';
  const MENU_ID      = 'ajudante-tarja-menu-cores';
  const OVERLAY_ID   = 'ajudante-tarja-menu-overlay';
  const DATA_COR     = 'data-ajudante-cor';
  const DATA_WIRED   = 'data-ajudante-tarja-wired';

  // Indice 0 = sem cor (mantem visual nativo do eproc).
  const CORES = [
    null,
    { bg: 'linear-gradient(to bottom, #28a745, #208838)', color: 'white', gradient: true }, // 1  Gratuita
    { bg: '#2c2c2c',                                       color: 'white' },                 // 2  Segredo/Sigiloso
    { bg: '#982C98',                                       color: 'white' },                 // 3  Tutela
    { bg: 'linear-gradient(to bottom, #4A90E2, #2E5BBA)', color: 'white', gradient: true }, // 4  Juizo 100% Digital
    { bg: '#765F4B',                                       color: 'white' },                 // 5  Idoso
    { bg: '#FF125A',                                       color: 'white' },                 // 6  Reu Preso
    { bg: 'linear-gradient(to bottom, #E5E5E5, rgb(201, 192, 201))', color: '#111111', gradient: true }, // 7  Assunto nao validado
    { bg: '#46565C',                                       color: 'white' },                 // 8  Litisconsorcio
    { bg: '#BF6600',                                       color: 'white' },                 // 9  Deficiencia
    { bg: '#795D76',                                       color: 'white' },                 // 10 Manifesta desinteresse
    { bg: 'linear-gradient(to bottom,rgb(99, 71, 210),rgb(3, 0, 159))', color: 'white', gradient: true }, // 11 Crianca e adolescente
    { bg: '#0A2FA6',                                       color: 'white' },                 // 12 Penhora no rosto
    { bg: 'linear-gradient(to bottom, #FF3333, #E57A29)', color: 'white', gradient: true }, // 13 Doenca grave
    { bg: 'linear-gradient(to bottom, #EBE300, #EBBC00)', color: '#000000', gradient: true }, // 14 Prioridade atendimento
    { bg: 'linear-gradient(to bottom, #CC5FEE, #6A0E86)', color: 'white', gradient: true }, // 15 Reu revel
    { bg: '#197D76',                                       color: 'white' },                 // 16 Possui bem associado
    { bg: 'linear-gradient(to bottom, #D2E5E4,rgb(167, 201, 220))', color: '#000000', gradient: true }, // 17 SERASAJUD
  ];

  // Cores agrupadas por estilo no menu (2 colunas).
  const SOLIDAS    = [0, 2, 3, 5, 8, 9, 10, 12, 16];
  const GRADIENTES = [6, 1, 4, 7, 11, 13, 14, 15, 17];

  let moduloAtivo = false;
  let coresCustom = {}; // texto -> indice
  let observer = null;

  // ─── Heuristica texto → indice padrao ───────────────────────────
  function indicePorTexto(textoLabel) {
    const t = (textoLabel || '').trim();
    const l = t.toLowerCase();
    if (l.includes('assunto não validado')) return 7;
    if (l.includes('juízo 100% digital')) return 4;
    if (l.includes('réu preso')) return 6;
    if (l.includes('litisconsórcio')) return 8;
    if (l.includes('deficiência')) return 9;
    if (l.includes('manifesta desinteresse')) return 10;
    if (l.includes('criança e adolescente') || l.includes('criança/adolescente')) return 11;
    if (l.includes('penhora no rosto dos autos')) return 12;
    if (l.includes('doença grave')) return 13;
    if (l.includes('prioridade atendimento')) return 14;
    if (l.includes('réu revel')) return 15;
    if (l.includes('possui bem associado')) return 16;
    if (l.includes('serasajud')) return 17;
    if (l.includes('gratuita')) return 1;
    if (l.includes('segredo') || t.includes('sigiloso')) return 2;
    if (l.includes('tutela')) return 3;
    if (l.includes('idoso')) return 5;
    return 0;
  }

  // ─── Aplicacao de cor ───────────────────────────────────────────
  function aplicarCor(label, indice) {
    const idxStr = String(indice);
    if (label.getAttribute(DATA_COR) === idxStr) return;

    if (indice === 0 || !CORES[indice]) {
      label.style.removeProperty('background');
      label.style.removeProperty('background-color');
      label.style.removeProperty('color');
      label.style.removeProperty('--ajudante-tarja-text-color');
      label.style.removeProperty('animation');
      for (const link of label.querySelectorAll('a')) {
        link.style.removeProperty('color');
      }
      label.setAttribute(DATA_COR, '0');
      return;
    }

    const cor = CORES[indice];
    label.style.removeProperty('background');
    label.style.removeProperty('background-color');
    if (cor.gradient) label.style.background = cor.bg;
    else label.style.backgroundColor = cor.bg;
    label.style.color = cor.color;
    label.style.setProperty('--ajudante-tarja-text-color', cor.color);
    for (const link of label.querySelectorAll('a')) {
      link.style.setProperty('color', cor.color, 'important');
    }
    label.setAttribute(DATA_COR, idxStr);
  }

  function corAlvoPorLabel(label) {
    const texto = (label.textContent || '').trim();
    if (!texto) return 0;
    const custom = coresCustom[texto];
    return (custom !== undefined && custom !== null) ? custom : indicePorTexto(texto);
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

  // ─── Storage ─────────────────────────────────────────────────────
  function salvarCorCustom(texto, indice) {
    coresCustom[texto] = indice;
    chrome.storage.local.set({ [STORAGE_KEY]: coresCustom });
  }

  function resetarTodasCoresCustom() {
    coresCustom = {};
    chrome.storage.local.set({ [STORAGE_KEY]: {} }, () => {
      // Repinta usando so a heuristica padrao
      pintarTodasTarjas();
    });
  }

  // ─── Menu de cores (right-click) ────────────────────────────────
  function fecharMenu() {
    const menu = document.getElementById(MENU_ID);
    if (menu) menu.remove();
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.remove();
    if (window.__AjudanteEproc?.modalManager) {
      window.__AjudanteEproc.modalManager.unregisterModal(MENU_ID);
    }
    document.querySelectorAll('label[data-ajudante-tarja-z]').forEach((label) => {
      const z = label.getAttribute('data-ajudante-tarja-z');
      label.style.zIndex = z === 'auto' ? '' : z;
      if (z === 'auto') label.style.position = '';
      label.removeAttribute('data-ajudante-tarja-z');
    });
  }

  function criarItemMenu(indice, textoLabel, indiceAtual, onEscolha) {
    const item = document.createElement('div');
    item.style.cssText = `
      margin: 4px 4px;
      padding: 6px 12px;
      cursor: pointer;
      border-radius: 4px;
      transition: filter 0.15s ease, outline 0.15s ease, opacity 0.15s ease;
      outline: 2px solid transparent;
      position: relative;
    `;

    if (indice === 0) {
      item.style.backgroundColor = '#DC3444';
      item.style.color = 'white';
      const bolinha = document.createElement('div');
      bolinha.style.cssText = `
        position: absolute;
        top: 3px;
        right: 3px;
        width: 6px;
        height: 6px;
        background-color: rgba(255, 255, 255, 0.8);
        border-radius: 50%;
        pointer-events: none;
      `;
      item.appendChild(bolinha);
    } else {
      const cor = CORES[indice];
      if (cor.gradient) item.style.background = cor.bg;
      else item.style.backgroundColor = cor.bg;
      item.style.color = cor.color;
    }

    item.style.opacity = (indice === indiceAtual) ? '1' : '0.3';

    const texto = document.createElement('span');
    texto.textContent = textoLabel;
    item.appendChild(texto);

    item.addEventListener('click', () => onEscolha(indice));
    item.addEventListener('mouseenter', () => {
      item.style.opacity = '1';
      item.style.outline = '2px solid #666';
      item.style.outlineOffset = '2px';
    });
    item.addEventListener('mouseleave', () => {
      if (indice !== indiceAtual) item.style.opacity = '0.3';
      item.style.outline = '2px solid transparent';
    });

    return item;
  }

  function exibirMenuCores(event, label) {
    event.preventDefault();
    event.stopPropagation();
    fecharMenu();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      pointer-events: auto;
    `;
    overlay.addEventListener('click', fecharMenu);
    document.body.appendChild(overlay);

    label.setAttribute('data-ajudante-tarja-z', window.getComputedStyle(label).zIndex || 'auto');
    label.style.zIndex = '10004';
    label.style.position = 'relative';

    const textoLabel = (label.textContent || '').trim();
    const indiceAtual = corAlvoPorLabel(label);

    const menu = document.createElement('div');
    menu.id = MENU_ID;
    menu.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      z-index: 10003;
      padding: 4px 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #374151;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    `;

    const colEsq = document.createElement('div');
    colEsq.style.cssText = 'display: flex; flex-direction: column; flex: 1;';
    const colDir = document.createElement('div');
    colDir.style.cssText = 'display: flex; flex-direction: column; flex: 1;';

    const onEscolha = (indice) => {
      aplicarCor(label, indice);
      salvarCorCustom(textoLabel, indice);
      fecharMenu();
    };

    SOLIDAS.forEach((idx) => colEsq.appendChild(criarItemMenu(idx, textoLabel, indiceAtual, onEscolha)));
    GRADIENTES.forEach((idx) => colDir.appendChild(criarItemMenu(idx, textoLabel, indiceAtual, onEscolha)));

    menu.appendChild(colEsq);
    menu.appendChild(colDir);
    document.body.appendChild(menu);

    // Posicionamento respeitando viewport
    const rect = label.getBoundingClientRect();
    const margem = 8;
    const gap = 4;
    const menuW = menu.offsetWidth || 0;
    const menuH = menu.offsetHeight || 0;
    const vw = document.documentElement.clientWidth || window.innerWidth || 0;
    const vh = document.documentElement.clientHeight || window.innerHeight || 0;

    let left = rect.left - 1;
    let top = rect.bottom + gap;
    const caberiaAbaixo = (top + menuH + margem) <= vh;
    const topAcima = rect.top - gap - menuH;
    if (!caberiaAbaixo && topAcima >= margem) top = topAcima;

    left = Math.min(Math.max(left, margem), Math.max(margem, vw - menuW - margem));
    top  = Math.min(Math.max(top,  margem), Math.max(margem, vh - menuH - margem));

    menu.style.left = `${Math.round(left)}px`;
    menu.style.top  = `${Math.round(top)}px`;

    // ESC e click fora — delega ao modalManager se disponivel, senao listener local
    if (window.__AjudanteEproc?.modalManager) {
      window.__AjudanteEproc.modalManager.registerModal(MENU_ID, menu, fecharMenu, {
        priority: 50,
        disableFocusTrap: true,
      });
    } else {
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          fecharMenu();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    }

    // Bloqueia right-click subsequente fora do menu (fecha em vez de abrir nativo)
    setTimeout(() => {
      const fecharFora = (e) => {
        if (!menu.contains(e.target)) {
          if (e.button === 2 || e.which === 3) {
            e.preventDefault();
            e.stopPropagation();
          }
          fecharMenu();
          document.removeEventListener('click', fecharFora);
          document.removeEventListener('contextmenu', fecharFora);
        }
      };
      document.addEventListener('click', fecharFora);
      document.addEventListener('contextmenu', fecharFora);
    }, 0);
  }

  // ─── Listeners por tarja ────────────────────────────────────────
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
        exibirMenuCores(e, label);
      });

      label.addEventListener('mousedown', (e) => {
        if (e.button !== 1) return; // somente botao do meio
        if (!moduloAtivo) return;
        e.preventDefault();
        e.stopPropagation();
        resetarTodasCoresCustom();
      });
    }
  }

  // ─── Observer ───────────────────────────────────────────────────
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

  // ─── Bootstrap ──────────────────────────────────────────────────
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
    fecharMenu();
  }

  function carregarEstadoEIniciar() {
    chrome.storage.local.get([SETTINGS_KEY, STORAGE_KEY], (data) => {
      const cfg = data[SETTINGS_KEY]?.scripts?.[SCRIPT_NAME];
      coresCustom = data[STORAGE_KEY] || {};
      if (cfg?.enabled) ativarModulo();
    });
  }

  // Reage a mudancas de settings/cores em outras abas
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
