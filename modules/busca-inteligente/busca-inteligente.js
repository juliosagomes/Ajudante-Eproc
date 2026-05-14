// modules/busca-inteligente/busca-inteligente.js
// Campo de busca em tempo real em 4 telas do eproc:
//   1. Meus Localizadores         (usuario_tipo_monitoramento_localizador_listar)
//   2. Painel Inicial (Secretaria) (painel_secretaria_listar)              -> filtra fieldsets + linhas
//   3. Lista Processos / Localizador (localizador_processos_lista)
//   4. Relatorio Geral            (relatorio_geral_listar)
//
// Recursos: type-to-search (digitar em qualquer lugar foca no campo), ESC limpa,
// realce em negrito (sem fundo amarelo). Para desativar, o usuario desliga o modulo
// nas configuracoes ou simplesmente nao digita nada.

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  const SETTINGS_KEY = 'eprocSettings';
  const MODULE_NAME  = 'buscaInteligente';

  // ─── Helpers ────────────────────────────────────────────────────
  function normalize(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
  }

  function escapeRegExp(s) {
    return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function clearHighlights(root) {
    if (!root) return;
    const nodes = root.querySelectorAll('.fe-bi-highlight');
    nodes.forEach((n) => {
      const parent = n.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(n.textContent || ''), n);
      parent.normalize();
    });
  }

  function applyHighlight(root, rawNeedle) {
    if (!root) return;
    clearHighlights(root);
    const needle = normalize(rawNeedle);
    if (!needle || needle.length < 2) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node?.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
        const tag = node.parentElement?.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'INPUT' || tag === 'TEXTAREA') {
          return NodeFilter.FILTER_REJECT;
        }
        if (node.parentElement?.classList?.contains('fe-bi-highlight')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    const re = new RegExp(escapeRegExp(rawNeedle), 'gi');
    textNodes.forEach((node) => {
      const original = node.nodeValue || '';
      if (!normalize(original).includes(needle)) return;
      re.lastIndex = 0;
      if (!re.test(original)) return;
      re.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let last = 0;
      let m;
      while ((m = re.exec(original)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        if (start > last) frag.appendChild(document.createTextNode(original.slice(last, start)));
        const span = document.createElement('strong');
        span.className = 'fe-bi-highlight';
        span.textContent = original.slice(start, end);
        frag.appendChild(span);
        last = end;
      }
      if (last < original.length) frag.appendChild(document.createTextNode(original.slice(last)));
      if (node.parentNode) node.parentNode.replaceChild(frag, node);
    });
  }

  // ─── Strategy: filter linhas de uma tabela (telas 1, 3, 4) ──────
  function filterRowsStrategy(query, config) {
    const rows = document.querySelectorAll(config.rowsSelector);
    if (!rows.length) return { total: 0, visible: 0 };

    const needle = normalize(query);
    let visible = 0;
    let total = 0;

    rows.forEach((tr) => {
      const isData = config.isDataRow ? config.isDataRow(tr) : !tr.querySelector('th');
      if (!isData) {
        tr.style.display = '';
        clearHighlights(tr);
        return;
      }
      total++;
      const text = normalize(tr.textContent || '');
      const match = !needle || text.includes(needle);
      if (match) {
        tr.style.display = '';
        visible++;
        if (needle) tr.querySelectorAll('td').forEach((td) => applyHighlight(td, query));
        else clearHighlights(tr);
      } else {
        tr.style.display = 'none';
        clearHighlights(tr);
      }
    });

    return { total, visible };
  }

  // ─── Strategy: filter fieldsets + linhas dentro deles (tela 2) ──
  function filterFieldsetsStrategy(query, _config) {
    const root = document.getElementById('divPainel') || document.body;
    const fieldsets = root.querySelectorAll('fieldset');
    if (!fieldsets.length) return { total: 0, visible: 0 };

    const needle = normalize(query);
    let totalRows = 0;
    let visibleRows = 0;

    fieldsets.forEach((fs) => {
      const rows = fs.querySelectorAll('table tbody tr');
      let rowsVisibleHere = 0;
      let rowsTotalHere = 0;

      rows.forEach((tr) => {
        const isData = !tr.querySelector('th') && tr.querySelector('td');
        if (!isData) {
          tr.style.display = '';
          clearHighlights(tr);
          return;
        }
        rowsTotalHere++;
        totalRows++;
        const text = normalize(tr.textContent || '');
        const match = !needle || text.includes(needle);
        if (match) {
          tr.style.display = '';
          rowsVisibleHere++;
          visibleRows++;
          if (needle) tr.querySelectorAll('td').forEach((td) => applyHighlight(td, query));
          else clearHighlights(tr);
        } else {
          tr.style.display = 'none';
          clearHighlights(tr);
        }
      });

      const legendText = normalize(fs.querySelector(':scope > legend')?.textContent || '');
      const legendMatch = !needle || legendText.includes(needle);

      if (!needle) {
        fs.style.display = '';
      } else if (rowsTotalHere > 0) {
        fs.style.display = rowsVisibleHere > 0 ? '' : 'none';
      } else {
        fs.style.display = legendMatch ? '' : 'none';
      }
    });

    return { total: totalRows, visible: visibleRows };
  }

  // ─── Configs por tela ───────────────────────────────────────────
  const SCREENS = {
    meusLocalizadores: {
      urlMatch: 'controlador.php?acao=usuario_tipo_monitoramento_localizador_listar',
      placeholder: 'Filtrar localizadores...',
      anchor: () => document.getElementById('divInfraBarraComandosSuperior'),
      insertPosition: 'before',
      strategy: filterRowsStrategy,
      rowsSelector: '#tabelaLocalizadores tbody tr, table.infraTable tbody tr',
      isDataRow: (tr) =>
        tr.classList.contains('infraTrClara') || tr.classList.contains('infraTrEscura'),
    },
    painelInicial: {
      urlMatch: 'controlador.php?acao=painel_secretaria_listar',
      placeholder: 'Filtrar blocos e processos...',
      anchor: () =>
        document.querySelector('div.pl-0.pr-0.pt-1.col-md-12.justify-content-between.d-flex') ||
        document.getElementById('divPainel'),
      insertPosition: 'after',
      strategy: filterFieldsetsStrategy,
    },
    listaProcessosLocalizador: {
      urlMatch: 'controlador.php?acao=localizador_processos_lista',
      placeholder: 'Filtrar processos...',
      anchor: () => document.getElementById('divInfraBarraComandosSuperior'),
      insertPosition: 'before',
      strategy: filterRowsStrategy,
      rowsSelector: '#tabelaLocalizadores tbody tr, table.infraTable tbody tr',
      isDataRow: (tr) =>
        tr.classList.contains('infraTrClara') || tr.classList.contains('infraTrEscura'),
    },
    relatorioGeral: {
      urlMatch: 'controlador.php?acao=relatorio_geral_listar',
      placeholder: 'Filtrar processos...',
      anchor: () => {
        const btn = document.querySelector('button.btnConsultar[form="frmProcessoLista"]');
        return btn ? btn.closest('div.text-right') : null;
      },
      insertPosition: 'before',
      strategy: filterRowsStrategy,
      rowsSelector: 'form[name="frmProcessoLista"] table tbody tr, table.infraTable tbody tr',
      isDataRow: (tr) =>
        tr.classList.contains('infraTrClara') || tr.classList.contains('infraTrEscura'),
    },
  };

  function detectScreen() {
    for (const id in SCREENS) {
      if (window.location.href.includes(SCREENS[id].urlMatch)) return id;
    }
    return null;
  }

  const SCREEN_ID = detectScreen();
  if (!SCREEN_ID) return;
  const CONFIG = SCREENS[SCREEN_ID];

  // ─── SVG icons ──────────────────────────────────────────────────
  const ICON_SEARCH = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5 13.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  const ICON_CLEAR  = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  // ─── UI ────────────────────────────────────────────────────────
  let barEl = null;
  let inputEl = null;
  let clearBtn = null;
  let semResultadosEl = null;
  let typeAnywhereInstalled = false;

  function buildBar() {
    const bar = document.createElement('div');
    bar.className = 'fe-bi-bar';
    bar.setAttribute('data-fe-bi-screen', SCREEN_ID);

    const icon = document.createElement('span');
    icon.className = 'fe-bi-icon';
    icon.innerHTML = ICON_SEARCH;

    const label = document.createElement('span');
    label.className = 'fe-bi-label';
    label.textContent = 'Busca Inteligente';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'fe-bi-input';
    input.placeholder = CONFIG.placeholder;
    input.autocomplete = 'off';
    input.spellcheck = false;

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'fe-bi-clear';
    clear.title = 'Limpar filtro (ESC)';
    clear.setAttribute('aria-label', 'Limpar filtro');
    clear.innerHTML = ICON_CLEAR;

    bar.appendChild(icon);
    bar.appendChild(label);
    bar.appendChild(input);
    bar.appendChild(clear);

    return { bar, input, clear };
  }

  function runFilter(rawText) {
    const query = String(rawText || '').trim();
    const { visible, total } = CONFIG.strategy(query, CONFIG);
    showNoResults(query, total, visible);
  }

  function showNoResults(query, total, visible) {
    if (semResultadosEl) {
      semResultadosEl.remove();
      semResultadosEl = null;
    }
    if (!query || total === 0 || visible > 0) return;
    semResultadosEl = document.createElement('div');
    semResultadosEl.className = 'fe-bi-empty';
    semResultadosEl.textContent = `Nenhum resultado para "${query}". Pressione ESC para limpar.`;
    barEl.insertAdjacentElement('afterend', semResultadosEl);
  }

  function isTypingContext(el) {
    if (!el) return false;
    const tag = String(el.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return true;
    if (el.isContentEditable || el.contentEditable === 'true') return true;
    return false;
  }

  function installTypeAnywhere() {
    if (typeAnywhereInstalled) return;
    typeAnywhereInstalled = true;
    document.addEventListener('keydown', (e) => {
      if (!inputEl) return;
      if (e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingContext(document.activeElement)) return;

      if (e.key === 'Escape' && inputEl.value) {
        e.preventDefault();
        e.stopPropagation();
        inputEl.value = '';
        runFilter('');
        return;
      }
      if (e.key.length !== 1 || e.key === ' ') return;

      e.preventDefault();
      e.stopPropagation();
      inputEl.focus();
      inputEl.value = (inputEl.value || '') + e.key;
      runFilter(inputEl.value);
    }, true);
  }

  function mount() {
    if (document.querySelector('.fe-bi-bar')) {
      barEl = document.querySelector('.fe-bi-bar');
      inputEl = barEl.querySelector('.fe-bi-input');
      clearBtn = barEl.querySelector('.fe-bi-clear');
      return true;
    }
    const anchor = CONFIG.anchor();
    if (!anchor) return false;

    const built = buildBar();
    barEl = built.bar;
    inputEl = built.input;
    clearBtn = built.clear;

    if (CONFIG.insertPosition === 'after') {
      anchor.insertAdjacentElement('afterend', barEl);
    } else {
      anchor.insertAdjacentElement('beforebegin', barEl);
    }

    inputEl.addEventListener('input', () => runFilter(inputEl.value));
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        inputEl.value = '';
        runFilter('');
        inputEl.blur();
      }
    });
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      inputEl.value = '';
      runFilter('');
      inputEl.focus();
    });

    installTypeAnywhere();
    return true;
  }

  function unmount() {
    if (barEl) barEl.remove();
    if (semResultadosEl) semResultadosEl.remove();
    barEl = inputEl = clearBtn = semResultadosEl = null;
    // limpa filtro/highlights aplicados antes da desativacao
    CONFIG.strategy('', CONFIG);
  }

  // ─── Tentativas de mount + observer ─────────────────────────────
  let mountAttempts = 0;
  let mountInterval = null;
  let mountObserver = null;

  function tryMount() {
    if (mount()) {
      if (mountInterval) { clearInterval(mountInterval); mountInterval = null; }
      if (mountObserver) { try { mountObserver.disconnect(); } catch (_) {} mountObserver = null; }
      return true;
    }
    return false;
  }

  function startMountWatch() {
    if (tryMount()) return;

    mountInterval = setInterval(() => {
      mountAttempts++;
      if (tryMount() || mountAttempts >= 30) {
        clearInterval(mountInterval);
        mountInterval = null;
      }
    }, 150);

    if (typeof MutationObserver !== 'undefined' && document.body) {
      mountObserver = new MutationObserver(() => { tryMount(); });
      mountObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  function stopMountWatch() {
    if (mountInterval) { clearInterval(mountInterval); mountInterval = null; }
    if (mountObserver) { try { mountObserver.disconnect(); } catch (_) {} mountObserver = null; }
  }

  // ─── Bootstrap module ───────────────────────────────────────────
  let moduloAtivo = false;

  function ativar() {
    if (moduloAtivo) return;
    moduloAtivo = true;
    startMountWatch();
  }

  function desativar() {
    if (!moduloAtivo) return;
    moduloAtivo = false;
    stopMountWatch();
    unmount();
  }

  chrome.storage.local.get(SETTINGS_KEY, (data) => {
    const cfg = data[SETTINGS_KEY]?.modules?.[MODULE_NAME];
    if (cfg?.enabled) ativar();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[SETTINGS_KEY]) return;
    const queriaLigado = !!changes[SETTINGS_KEY].newValue?.modules?.[MODULE_NAME]?.enabled;
    if (queriaLigado) ativar();
    else desativar();
  });
})();
