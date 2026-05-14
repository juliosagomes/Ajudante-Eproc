// scripts/painel-reordenar/painel-reordenar.js
// Permite reordenar os fieldsets do Painel Inicial via botoes ▲/▼ em cada legenda.
// Salva a ordem (global, por usuario) e a restaura nos proximos carregamentos.
// Inclui botao "Restaurar ordem nativa" no topo, e limpeza de <br> espurios entre fieldsets.

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;
  if (!window.location.href.includes('controlador.php?acao=painel_secretaria_listar')) return;

  const SETTINGS_KEY = 'eprocSettings';
  const STORAGE_KEY  = 'eprocPainelOrdem';
  const SCRIPT_NAME  = 'painelReordenar';

  const BTN_CLASS    = 'fe-painel-reorder-btn';
  const HEADER_CLASS = 'fe-painel-reorder-header';
  const RESET_ID     = 'fe-painel-reset-btn';

  // SVGs alinhados a identidade do Ajudante (stroke 1.6, currentColor)
  const ICON_UP = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 7.5 6 4.5 9 7.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_DOWN = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_RESET = '<svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M11.5 4.5a4.5 4.5 0 1 0 1 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 1.5v3.5h-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  let ativo = false;
  let ordemSalva = [];

  // ─── Helpers ─────────────────────────────────────────────────────
  function getDivPainel() {
    return document.getElementById('divPainel');
  }

  function getFieldsets() {
    const root = getDivPainel();
    if (!root) return [];
    return Array.from(root.querySelectorAll(':scope > fieldset.infraFieldset'));
  }

  function getKey(fieldset) {
    const legend = fieldset.querySelector(':scope > legend');
    if (!legend) return '';
    // Clona a legenda e remove os controles do nosso script antes de extrair o texto
    const clone = legend.cloneNode(true);
    clone.querySelectorAll(`.${HEADER_CLASS}`).forEach((el) => el.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  // ─── Aplicar ordem salva ─────────────────────────────────────────
  function aplicarOrdem(ordem) {
    if (!ordem || ordem.length === 0) return;
    const root = getDivPainel();
    if (!root) return;

    const fieldsets = getFieldsets();
    const byKey = new Map(fieldsets.map((fs) => [getKey(fs), fs]));

    const novaOrdem = [];
    for (const key of ordem) {
      if (byKey.has(key)) novaOrdem.push(byKey.get(key));
    }
    for (const fs of fieldsets) {
      if (!novaOrdem.includes(fs)) novaOrdem.push(fs);
    }

    for (const fs of novaOrdem) root.appendChild(fs);
    limparBRs();
  }

  function salvarOrdemAtual() {
    const ordem = getFieldsets().map(getKey).filter(Boolean);
    ordemSalva = ordem;
    chrome.storage.local.set({ [STORAGE_KEY]: ordem });
  }

  function moverFieldset(fieldset, direcao) {
    const fieldsets = getFieldsets();
    const idx = fieldsets.indexOf(fieldset);
    if (idx === -1) return;
    const novoIdx = idx + direcao;
    if (novoIdx < 0 || novoIdx >= fieldsets.length) return;

    const root = getDivPainel();
    if (direcao === -1) {
      root.insertBefore(fieldset, fieldsets[novoIdx]);
    } else {
      const vizinho = fieldsets[novoIdx];
      const aposVizinho = vizinho.nextElementSibling;
      if (aposVizinho) root.insertBefore(fieldset, aposVizinho);
      else root.appendChild(fieldset);
    }

    limparBRs();
    salvarOrdemAtual();
    renderBotoes(); // re-render para atualizar estados disabled
  }

  // ─── Limpeza de <br> espurios ───────────────────────────────────
  function limparBRs() {
    const root = getDivPainel();
    if (!root) return;

    // 1. Remove BRs antes do primeiro elemento "real" (fieldset/script)
    while (root.firstElementChild && root.firstElementChild.tagName === 'BR') {
      root.firstElementChild.remove();
    }
    // 2. Caso script + BR no inicio: tira o BR
    if (root.children[0]?.tagName === 'SCRIPT' && root.children[1]?.tagName === 'BR') {
      root.children[1].remove();
    }

    // 3. Garante exatamente 1 BR entre fieldsets consecutivos
    const children = Array.from(root.children);
    const idxFieldsets = [];
    children.forEach((c, i) => { if (c.tagName === 'FIELDSET') idxFieldsets.push(i); });

    for (let i = 0; i < idxFieldsets.length - 1; i++) {
      const curr = children[idxFieldsets[i]];
      const next = children[idxFieldsets[i + 1]];

      const brs = [];
      let p = curr.nextSibling;
      while (p && p !== next) {
        if (p.nodeType === 1 && p.tagName === 'BR') brs.push(p);
        p = p.nextSibling;
      }

      if (brs.length === 0) {
        root.insertBefore(document.createElement('br'), next);
      } else if (brs.length > 1) {
        for (let k = 1; k < brs.length; k++) brs[k].remove();
      }
    }
  }

  // ─── Botoes ▲/▼ em cada fieldset ────────────────────────────────
  function renderBotoes() {
    const fieldsets = getFieldsets();
    // Remove headers antigos antes de re-renderizar
    document.querySelectorAll(`.${HEADER_CLASS}`).forEach((el) => el.remove());

    fieldsets.forEach((fs, idx) => {
      const legend = fs.querySelector(':scope > legend');
      if (!legend) return;

      const header = document.createElement('span');
      header.className = HEADER_CLASS;

      const btnUp = document.createElement('button');
      btnUp.type = 'button';
      btnUp.className = `${BTN_CLASS} ${BTN_CLASS}--up`;
      btnUp.innerHTML = ICON_UP;
      btnUp.title = 'Mover acima';
      btnUp.setAttribute('aria-label', 'Mover bloco acima');
      btnUp.disabled = (idx === 0);
      btnUp.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        moverFieldset(fs, -1);
      });

      const btnDown = document.createElement('button');
      btnDown.type = 'button';
      btnDown.className = `${BTN_CLASS} ${BTN_CLASS}--down`;
      btnDown.innerHTML = ICON_DOWN;
      btnDown.title = 'Mover abaixo';
      btnDown.setAttribute('aria-label', 'Mover bloco abaixo');
      btnDown.disabled = (idx === fieldsets.length - 1);
      btnDown.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        moverFieldset(fs, +1);
      });

      header.appendChild(btnUp);
      header.appendChild(btnDown);
      legend.appendChild(header);
    });
  }

  // ─── Botao de reset ─────────────────────────────────────────────
  function renderBotaoReset() {
    if (document.getElementById(RESET_ID)) return;
    const root = getDivPainel();
    if (!root) return;

    const wrap = document.createElement('div');
    wrap.id = `${RESET_ID}-wrap`;
    wrap.className = 'fe-painel-reset-wrap';

    const btn = document.createElement('button');
    btn.id = RESET_ID;
    btn.type = 'button';
    btn.title = 'Apaga a ordem personalizada e recarrega a pagina';
    btn.innerHTML = `${ICON_RESET}<span>Restaurar ordem nativa</span>`;
    btn.addEventListener('click', () => {
      if (!confirm('Restaurar a ordem nativa do painel? A pagina sera recarregada.')) return;
      chrome.storage.local.remove(STORAGE_KEY, () => {
        location.reload();
      });
    });

    wrap.appendChild(btn);
    root.insertBefore(wrap, root.firstChild);
  }

  function removerUI() {
    document.querySelectorAll(`.${HEADER_CLASS}`).forEach((el) => el.remove());
    const resetWrap = document.getElementById(`${RESET_ID}-wrap`);
    if (resetWrap) resetWrap.remove();
  }

  // ─── Bootstrap ──────────────────────────────────────────────────
  function ativar() {
    if (ativo) return;
    ativo = true;
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      ordemSalva = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
      if (ordemSalva.length > 0) aplicarOrdem(ordemSalva);
      limparBRs();
      renderBotaoReset();
      renderBotoes();
    });
  }

  function desativar() {
    ativo = false;
    removerUI();
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
