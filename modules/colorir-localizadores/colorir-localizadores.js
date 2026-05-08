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

  // ─── Aplicar estilos comuns de badge colorido ───────────────────
  function aplicarEstiloBadge(el, bgHex, fg, { isLink = false } = {}) {
    el.style.setProperty('background-color', bgHex, 'important');
    el.style.setProperty('color', fg, 'important');
    el.style.setProperty('border-radius', '3px', 'important');
    el.style.setProperty('padding', '1px 6px', 'important');
    el.style.setProperty('font-weight', '600', 'important');
    el.style.setProperty('display', 'inline-block', 'important');
    if (isLink) el.style.setProperty('text-decoration', 'none', 'important');
  }

  // ─── Aplicar cor a um link de localizador ───────────────────────
  // Só colore se houver vínculo configurado — sem fallback automático.
  function colorirLink(link) {
    if (link.dataset.localizadorColorido) return;

    const nome = link.textContent.trim();
    if (!nome) return;

    if (!coresMap[nome]) return;  // sem vínculo → não altera o link

    const bgHex = coresMap[nome];
    const fg    = textoContraste(bgHex);

    aplicarEstiloBadge(link, bgHex, fg, { isLink: true });

    link.dataset.localizadorColorido = '1';
    link.dataset.localizadorNome     = nome;
    const idLoc = extrairId(link);
    if (idLoc) link.dataset.localizadorId = idLoc;
  }

  // ─── Colorir nós de texto de localizadores em tabelas de listagem ────
  // Padrão: nó de texto "• Nome (Sufixo)" imediatamente antes de um
  // <a class="memoLocalizadorOrgao...">. Envolve em wrapper invisível
  // contendo um <span> badge colorido, preservando prefixo "• " e sufixo.
  function colorirNosTextoTabela() {
    document.querySelectorAll('table a[class*="memoLocalizadorOrgao"]').forEach((linkMemo) => {
      if (linkMemo.dataset.locColoridoTabela) return;

      const prev = linkMemo.previousSibling;
      if (!prev || prev.nodeType !== 3) return;

      const raw  = prev.textContent;
      const nome = raw.trim().replace(/^[•\s]+/, '').replace(/\s*\([^)]+\)\s*$/, '').trim();
      if (!nome || !coresMap[nome]) return;

      const bgHex = coresMap[nome];
      const fg    = textoContraste(bgHex);

      const prefMatch = raw.match(/^(\s*[•\s]+)/);
      const sufMatch  = raw.match(/(\s*\([^)]+\)\s*)$/);
      const prefixo   = prefMatch ? prefMatch[1] : '';
      const sufixo    = sufMatch  ? sufMatch[1]  : '';

      const wrapper = document.createElement('span');
      wrapper.dataset.locColoridoTabela = '1';
      wrapper.dataset.localizadorNome   = nome;
      wrapper.dataset.textoOriginal     = raw;
      wrapper.style.setProperty('display', 'contents', 'important');

      const badge = document.createElement('span');
      badge.textContent = nome;
      aplicarEstiloBadge(badge, bgHex, fg);

      if (prefixo) wrapper.appendChild(document.createTextNode(prefixo));
      wrapper.appendChild(badge);
      if (sufixo)  wrapper.appendChild(document.createTextNode(sufixo));

      prev.parentNode.replaceChild(wrapper, prev);
      linkMemo.dataset.locColoridoTabela = '1';
    });
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

    // Reverter wrappers de nós de texto em tabelas de listagem
    document.querySelectorAll('span[data-loc-colorido-tabela]').forEach((wrapper) => {
      const textoOriginal = wrapper.dataset.textoOriginal || '';
      wrapper.parentNode.replaceChild(document.createTextNode(textoOriginal), wrapper);
    });
    document.querySelectorAll('a[data-loc-colorido-tabela]').forEach((a) => {
      delete a.dataset.locColoridoTabela;
    });

    document.querySelectorAll('.loc-btn-cor-wrap').forEach(el => el.remove());
    document.querySelectorAll('.loc-editor-cor').forEach(el => el.remove());
  }

  // ─── Botão de vínculo de cor (somente em #dvLocalizadoresOrgao) ──
  function injetarBotaoCor(link) {
    if (link.nextElementSibling?.classList.contains('loc-btn-cor-wrap')) return;

    const nome = link.textContent.trim();
    if (!nome) return;

    const wrap = document.createElement('span');
    wrap.className = 'loc-btn-cor-wrap';

    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'loc-btn-cor';
    btn.title = 'Definir cor deste localizador';
    btn.setAttribute('aria-label', `Definir cor: ${nome}`);
    btn.innerHTML =
      '<svg viewBox="0 0 16 16" fill="none" width="10" height="10" aria-hidden="true">' +
        '<circle cx="4"  cy="4"  r="2" fill="currentColor"/>' +
        '<circle cx="12" cy="4"  r="2" fill="currentColor" opacity=".65"/>' +
        '<circle cx="4"  cy="12" r="2" fill="currentColor" opacity=".5"/>' +
        '<circle cx="12" cy="12" r="2" fill="currentColor" opacity=".85"/>' +
      '</svg>';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      abrirEditorCor(nome, link, btn);
    });

    wrap.appendChild(btn);
    link.insertAdjacentElement('afterend', wrap);
  }

  // ─── Editor inline de cor ────────────────────────────────────────
  function abrirEditorCor(nome, linkEl, btnRef) {
    document.querySelectorAll('.loc-editor-cor').forEach(el => el.remove());

    const corAtual  = coresMap[nome] || '#7ab3d8';
    const temVinculo = !!coresMap[nome];

    const editor = document.createElement('div');
    editor.className = 'loc-editor-cor';

    const titulo = document.createElement('div');
    titulo.className = 'loc-editor-cor__titulo';
    titulo.innerHTML =
      '<svg viewBox="0 0 16 16" fill="none" width="12" height="12" aria-hidden="true">' +
        '<circle cx="4"  cy="4"  r="2" fill="currentColor"/>' +
        '<circle cx="12" cy="4"  r="2" fill="currentColor" opacity=".65"/>' +
        '<circle cx="4"  cy="12" r="2" fill="currentColor" opacity=".5"/>' +
        '<circle cx="12" cy="12" r="2" fill="currentColor" opacity=".85"/>' +
      '</svg> Cor do localizador';

    const nomeEl = document.createElement('div');
    nomeEl.className = 'loc-editor-cor__nome';
    nomeEl.textContent = nome;

    const field = document.createElement('div');
    field.className = 'loc-editor-cor__field';

    const picker = document.createElement('input');
    picker.type = 'color';
    picker.className = 'loc-editor-cor__picker';
    picker.value = corAtual;

    const preview = document.createElement('span');
    preview.className = 'loc-editor-cor__preview';

    function atualizarPreview() {
      const cor = picker.value;
      const fg  = textoContraste(cor);
      preview.style.background = cor;
      preview.style.color = fg;
      preview.textContent = nome;
    }
    picker.addEventListener('input', atualizarPreview);
    atualizarPreview();

    field.appendChild(picker);
    field.appendChild(preview);

    const botoes = document.createElement('div');
    botoes.className = 'loc-editor-cor__botoes';

    function salvarCor() {
      const cor = picker.value.toLowerCase();
      coresMap[nome] = cor;
      chrome.storage.local.set({ [STORAGE_KEY]: coresMap }, () => {
        editor.remove();
        limpar();
        escanear();
      });
    }

    const btnSalvar = document.createElement('button');
    btnSalvar.type      = 'button';
    btnSalvar.className = 'loc-editor-cor__btn loc-editor-cor__btn--salvar';
    btnSalvar.textContent = 'Salvar';
    btnSalvar.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); salvarCor(); });

    const btnCancelar = document.createElement('button');
    btnCancelar.type      = 'button';
    btnCancelar.className = 'loc-editor-cor__btn loc-editor-cor__btn--cancelar';
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); editor.remove(); });

    botoes.appendChild(btnSalvar);

    if (temVinculo) {
      const btnRemover = document.createElement('button');
      btnRemover.type      = 'button';
      btnRemover.className = 'loc-editor-cor__btn loc-editor-cor__btn--remover';
      btnRemover.textContent = 'Remover';
      btnRemover.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        delete coresMap[nome];
        chrome.storage.local.set({ [STORAGE_KEY]: coresMap }, () => {
          editor.remove();
          limpar();
          escanear();
        });
      });
      botoes.appendChild(btnRemover);
    }

    botoes.appendChild(btnCancelar);

    editor.appendChild(titulo);
    editor.appendChild(nomeEl);
    editor.appendChild(field);
    editor.appendChild(botoes);

    const rect = btnRef.getBoundingClientRect();
    editor.style.position = 'fixed';
    editor.style.top      = `${rect.bottom + 6}px`;
    editor.style.left     = `${Math.min(rect.left, window.innerWidth - 250)}px`;
    editor.style.zIndex   = '2147483647';

    document.body.appendChild(editor);
    picker.click(); // abre o color picker nativo imediatamente

    setTimeout(() => {
      document.addEventListener('mousedown', function fecharFora(ev) {
        if (!editor.contains(ev.target) && ev.target !== btnRef) {
          editor.remove();
          document.removeEventListener('mousedown', fecharFora);
        }
      });
    }, 100);
  }

  // ─── Varredura do DOM ────────────────────────────────────────────
  function escanear() {
    // (a) Filhos diretos de div#dvLocalizadoresOrgao — colorir + botão
    const dvLoc = document.querySelector('#dvLocalizadoresOrgao');
    if (dvLoc) {
      dvLoc.querySelectorAll(':scope > ' + SELETOR_LOC).forEach((link) => {
        colorirLink(link);
        injetarBotaoCor(link);
      });
    }

    // (b) Dentro de tabelas de listagem — só colorir, sem botão
    document.querySelectorAll('table ' + SELETOR_LOC).forEach(colorirLink);

    // (c) Nós de texto de localizadores em tabelas de listagem (relatórios)
    colorirNosTextoTabela();
  }

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
