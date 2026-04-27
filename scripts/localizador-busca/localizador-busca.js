// scripts/localizador-busca/localizador-busca.js — Ajudante Eproc

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  const SETTINGS_KEY = 'eprocSettings';
  const SCRIPT_ID    = 'localizadorBusca';

  let scriptAtivo = false;
  let observer    = null;

  function norm(str) {
    return str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  }

  function injetar(sel) {
    if (sel.dataset.ajudanteLocalizador) return;
    sel.dataset.ajudanteLocalizador = '1';

    // ── Botão logo após o select ──────────────────────────────────
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'ajudante-loc-btn';
    btn.title     = 'Buscar localizador — Ajudante Eproc';
    btn.innerHTML = `
      <svg viewBox="0 0 48 48" fill="none" width="14" height="14" aria-hidden="true">
        <circle cx="20" cy="20" r="16" fill="#7ab3d8" opacity="0.85"/>
        <circle cx="32" cy="22" r="11" fill="#4a8fc4" opacity="0.75"/>
        <circle cx="26" cy="33" r="9" fill="#2d6fa8" opacity="0.80"/>
        <path d="M14 20 L18.5 25 L27 15" stroke="white" stroke-width="2.4"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    sel.insertAdjacentElement('afterend', btn);

    // ── Dropdown flutuante ────────────────────────────────────────
    // Quando dentro de um iframe, document.body pode ter overflow:hidden.
    // Garantimos que o body aceita overflow para o dropdown ficar visível.
    document.body.style.overflow = document.body.style.overflow || 'visible';

    const dropdown = document.createElement('div');
    dropdown.className = 'ajudante-loc-dropdown';
    dropdown.innerHTML = `
      <input type="text" class="ajudante-loc-input" placeholder="Buscar localizador..." autocomplete="off">
      <ul class="ajudante-loc-lista" role="listbox"></ul>`;
    document.body.appendChild(dropdown);

    const input = dropdown.querySelector('.ajudante-loc-input');
    const lista  = dropdown.querySelector('.ajudante-loc-lista');

    // ── Posicionamento (abaixo do select, alinhado à esquerda) ────
    // position:fixed é relativo ao viewport do frame onde o select está.
    function posicionar() {
      const r = sel.getBoundingClientRect();
      dropdown.style.top   = `${r.bottom + 4}px`;
      dropdown.style.left  = `${r.left}px`;
      dropdown.style.width = `${Math.max(r.width, 260)}px`;
    }

    // ── Renderizar lista filtrada ─────────────────────────────────
    function renderLista(termo) {
      const t = norm(termo);
      lista.innerHTML = '';
      let visíveis = 0;

      Array.from(sel.options).forEach((opt) => {
        if (!opt.value || opt.value === 'null') return;
        if (t && !norm(opt.text).includes(t)) return;

        const li = document.createElement('li');
        li.className   = 'ajudante-loc-item';
        li.role        = 'option';
        li.textContent = opt.text.trim();
        li.dataset.value = opt.value;
        if (opt.value === sel.value) li.classList.add('ajudante-loc-item--sel');

        li.addEventListener('mousedown', (e) => {
          e.preventDefault(); // evita blur no input antes do click processar
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          fechar();
        });

        lista.appendChild(li);
        visíveis++;
      });

      if (visíveis === 0) {
        const li = document.createElement('li');
        li.className   = 'ajudante-loc-item ajudante-loc-item--vazio';
        li.textContent = 'Nenhum localizador encontrado';
        lista.appendChild(li);
      }
    }

    // ── Abrir / fechar ────────────────────────────────────────────
    let aberto = false;

    function abrir() {
      aberto = true;
      posicionar();
      dropdown.classList.add('ajudante-loc-dropdown--aberto');
      btn.classList.add('ajudante-loc-btn--ativo');
      input.value = '';
      renderLista('');
      requestAnimationFrame(() => {
        input.focus();
        // Rolar até o item atualmente selecionado
        const sel_ = lista.querySelector('.ajudante-loc-item--sel');
        if (sel_) sel_.scrollIntoView({ block: 'nearest' });
      });
    }

    function fechar() {
      aberto = false;
      dropdown.classList.remove('ajudante-loc-dropdown--aberto');
      btn.classList.remove('ajudante-loc-btn--ativo');
    }

    // ── Eventos ───────────────────────────────────────────────────
    // Clicar no select abre o dropdown diretamente (sem precisar do botão)
    sel.addEventListener('mousedown', (e) => {
      e.preventDefault();    // impede o dropdown nativo do <select>
      e.stopPropagation();   // impede que o handler do document feche o dropdown logo em seguida
      aberto ? fechar() : abrir();
    });

    btn.addEventListener('click', () => aberto ? fechar() : abrir());

    input.addEventListener('input', () => renderLista(input.value));

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { fechar(); sel.focus(); }
    });

    document.addEventListener('mousedown', (e) => {
      if (aberto && !dropdown.contains(e.target) && e.target !== btn && e.target !== sel) fechar();
    });

    window.addEventListener('scroll', () => { if (aberto) posicionar(); }, { passive: true });
    window.addEventListener('resize', () => { if (aberto) posicionar(); }, { passive: true });
  }

  // ── Varredura / ciclo de vida ─────────────────────────────────
  function varrer() {
    const sel = document.getElementById('selNovoLocalizador');
    if (sel) injetar(sel);
  }

  function ativar() {
    if (scriptAtivo) return;
    scriptAtivo = true;
    varrer();
    observer = new MutationObserver(varrer);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function desativar() {
    if (!scriptAtivo) return;
    scriptAtivo = false;
    if (observer) { observer.disconnect(); observer = null; }
    document.querySelectorAll('.ajudante-loc-btn, .ajudante-loc-dropdown').forEach(el => el.remove());
    document.querySelectorAll('[data-ajudante-localizador]').forEach(sel => {
      delete sel.dataset.ajudanteLocalizador;
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[SETTINGS_KEY]) return;
    const enabled = changes[SETTINGS_KEY].newValue?.scripts?.[SCRIPT_ID]?.enabled ?? true;
    if (enabled && !scriptAtivo) ativar();
    if (!enabled && scriptAtivo) desativar();
  });

  chrome.storage.local.get(SETTINGS_KEY, (data) => {
    const enabled = data[SETTINGS_KEY]?.scripts?.[SCRIPT_ID]?.enabled ?? true;
    if (enabled) ativar();
  });

})();
