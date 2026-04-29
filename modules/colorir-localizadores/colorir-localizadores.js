// modules/colorir-localizadores/colorir-localizadores.js — Módulo Colorir Localizadores

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  const SETTINGS_KEY = 'eprocSettings';
  const STORAGE_KEY  = 'eprocCoresLocalizadores';
  const MODULE_NAME  = 'colorirLocalizadores';

  // Seleciona links de localizadores pelo title ou href padrão do Eproc
  const SELETOR_LOC = [
    'a[title="Abrir edição de localizadores"]',
    'a[href="javascript:abreLocalizadores();"]',
  ].join(', ');

  let coresMap    = {};  // { "Nome do Localizador": "#rrggbb" }
  let moduloAtivo = false;
  let observer    = null;
  let scanTimer   = null;

  // ─── Storage ────────────────────────────────────────────────────
  function carregarCores(cb) {
    chrome.storage.local.get(STORAGE_KEY, (d) => {
      coresMap = d[STORAGE_KEY] || {};
      if (cb) cb();
    });
  }

  // ─── Geração de cor por hash do nome (HSL pastel) ───────────────
  function hashCor(nome) {
    let h = 0;
    for (let i = 0; i < nome.length; i++) {
      h = Math.imul(31, h) + nome.charCodeAt(i) | 0;
    }
    h = Math.abs(h);
    const hue = h % 360;
    const sat = 50 + (h >> 8 & 0xff) % 25;   // 50–75 %
    const lig = 84 + (h >> 16 & 0xff) % 10;  // 84–94 % (fundo claro)
    return hslParaHex(hue, sat, lig);
  }

  function hslParaHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const hex = v => Math.round(v * 255).toString(16).padStart(2, '0');
    return '#' + hex(f(0)) + hex(f(8)) + hex(f(4));
  }

  // ─── Contraste WCAG (luminância relativa) ───────────────────────
  function luminancia(hex) {
    const parse = (s) => parseInt(s, 16) / 255;
    const lin   = (v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    const r = lin(parse(hex.slice(1, 3)));
    const g = lin(parse(hex.slice(3, 5)));
    const b = lin(parse(hex.slice(5, 7)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function textoContraste(bgHex) {
    return luminancia(bgHex) > 0.35 ? '#1a1a2e' : '#ffffff';
  }

  // ─── Extração do id_localizador_orgao do irmão seguinte ─────────
  function extrairId(el) {
    const next = el.nextElementSibling;
    if (!next || next.tagName !== 'A') return null;
    const cls = [...next.classList].find(c => /^memoLocalizadorOrgao\d+$/.test(c));
    return cls ? cls.replace('memoLocalizadorOrgao', '') : null;
  }

  // ─── Aplicar cor a um link de localizador ───────────────────────
  function colorirLink(link) {
    if (link.dataset.localizadorColorido) return;

    const nome = link.textContent.trim();
    if (!nome) return;

    const bgHex = coresMap[nome] || hashCor(nome);
    const fg    = textoContraste(bgHex);

    link.style.setProperty('background-color', bgHex, 'important');
    link.style.setProperty('color', fg, 'important');
    link.style.setProperty('border-radius', '3px', 'important');
    link.style.setProperty('padding', '1px 6px', 'important');
    link.style.setProperty('text-decoration', 'none', 'important');
    link.style.setProperty('font-weight', '600', 'important');
    link.style.setProperty('display', 'inline-block', 'important');

    // Guarda nome e id para referência (debug / futuras features)
    link.dataset.localizadorColorido = '1';
    link.dataset.localizadorNome     = nome;
    const idLoc = extrairId(link);
    if (idLoc) link.dataset.localizadorId = idLoc;
  }

  // ─── Remover cores de todos os links já coloridos ────────────────
  function limpar() {
    document.querySelectorAll('[data-localizador-colorido]').forEach((el) => {
      el.style.removeProperty('background-color');
      el.style.removeProperty('color');
      el.style.removeProperty('border-radius');
      el.style.removeProperty('padding');
      el.style.removeProperty('text-decoration');
      el.style.removeProperty('font-weight');
      el.style.removeProperty('display');
      delete el.dataset.localizadorColorido;
      delete el.dataset.localizadorNome;
      delete el.dataset.localizadorId;
    });
  }

  // ─── Varredura do DOM ────────────────────────────────────────────
  function escanear() {
    // (a) Filhos diretos de div#dvLocalizadoresOrgao (tela de detalhes)
    const dvLoc = document.querySelector('#dvLocalizadoresOrgao');
    if (dvLoc) {
      dvLoc.querySelectorAll(':scope > ' + SELETOR_LOC).forEach(colorirLink);
    }

    // (b) Dentro de tabelas de listagem de processos
    document.querySelectorAll('table ' + SELETOR_LOC).forEach(colorirLink);
  }

  // Varredura com debounce para evitar trabalho excessivo ao MutationObserver
  function escanearDebounced() {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      escanear();
    }, 80);
  }

  // ─── Ciclo de vida do módulo ─────────────────────────────────────
  function ativarModulo() {
    if (moduloAtivo) return;
    moduloAtivo = true;

    carregarCores(() => {
      escanear();
      observer = new MutationObserver(escanearDebounced);
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  function desativarModulo() {
    if (!moduloAtivo) return;
    moduloAtivo = false;

    if (scanTimer) { clearTimeout(scanTimer); scanTimer = null; }
    if (observer)  { observer.disconnect(); observer = null; }
    limpar();
  }

  // ─── Reagir a mudanças em tempo real ────────────────────────────
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes[SETTINGS_KEY]) {
      const enabled = changes[SETTINGS_KEY].newValue?.modules?.[MODULE_NAME]?.enabled ?? true;
      if (enabled && !moduloAtivo) ativarModulo();
      if (!enabled && moduloAtivo) desativarModulo();
    }

    if (changes[STORAGE_KEY] && moduloAtivo) {
      coresMap = changes[STORAGE_KEY].newValue || {};
      limpar();
      escanear();
    }
  });

  // ─── Inicialização condicional ───────────────────────────────────
  chrome.storage.local.get(SETTINGS_KEY, (data) => {
    const settings = data[SETTINGS_KEY] || {};
    const enabled  = settings?.modules?.[MODULE_NAME]?.enabled ?? true;
    if (enabled) ativarModulo();
  });

})();
