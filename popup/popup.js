// popup/popup.js — Ajudante Eproc

(function () {
  'use strict';

  const MODULOS_DEFINIDOS = [
    {
      id: 'lembretes',
      label: 'Lembretes',
      icone: '📌',
      renderPainel: renderPainelLembretes
    }
  ];

  let settings = { modules: {} };

  const tabsEl   = document.getElementById('popup-tabs');
  const panelsEl = document.getElementById('popup-panels');
  const emptyEl  = document.getElementById('popup-empty');

  // ─── Abrir configurações em aba separada ────────────────────────
  function abrirConfiguracoes() {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
    window.close();
  }

  document.getElementById('btn-config').addEventListener('click', abrirConfiguracoes);
  document.getElementById('btn-config-empty').addEventListener('click', abrirConfiguracoes);

  // ─── Bootstrap ──────────────────────────────────────────────────
  chrome.runtime.sendMessage({ tipo: 'obterSettings' }, (resp) => {
    settings = resp?.settings || { modules: {} };

    MODULOS_DEFINIDOS.forEach((m) => {
      if (settings.modules[m.id] === undefined) {
        settings.modules[m.id] = { enabled: true };
      }
    });

    renderUI();
  });

  // ─── Render principal ────────────────────────────────────────────
  function renderUI() {
    renderTabs();
    renderPaineisModulos();

    const ativos = MODULOS_DEFINIDOS.filter((m) => settings.modules[m.id]?.enabled);

    if (ativos.length > 0) {
      emptyEl.style.display = 'none';
      ativarTab(ativos[0].id);
    } else {
      tabsEl.style.display = 'none';
      emptyEl.style.display = 'flex';
    }
  }

  // ─── Tabs ────────────────────────────────────────────────────────
  function renderTabs() {
    tabsEl.innerHTML = '';
    tabsEl.style.display = '';

    MODULOS_DEFINIDOS.forEach((m) => {
      if (settings.modules[m.id]?.enabled) {
        tabsEl.appendChild(criarTab(m.id, `${m.icone} ${m.label}`));
      }
    });
  }

  function criarTab(id, label) {
    const btn = document.createElement('button');
    btn.className = 'popup-tab';
    btn.dataset.tab = id;
    btn.textContent = label;
    btn.setAttribute('role', 'tab');
    btn.addEventListener('click', () => ativarTab(id));
    return btn;
  }

  function ativarTab(id) {
    tabsEl.querySelectorAll('.popup-tab').forEach((btn) => {
      const ativa = btn.dataset.tab === id;
      btn.classList.toggle('popup-tab--ativa', ativa);
      btn.setAttribute('aria-selected', ativa ? 'true' : 'false');
    });

    panelsEl.querySelectorAll('.popup-panel').forEach((panel) => {
      panel.classList.toggle('popup-panel--hidden', panel.id !== `panel-${id}`);
    });
  }

  // ─── Painéis de módulos ──────────────────────────────────────────
  function renderPaineisModulos() {
    panelsEl.querySelectorAll('.popup-panel').forEach(el => el.remove());

    MODULOS_DEFINIDOS.forEach((m) => {
      if (!settings.modules[m.id]?.enabled) return;

      const panel = document.createElement('section');
      panel.className = 'popup-panel popup-panel--hidden';
      panel.id = `panel-${m.id}`;
      panel.setAttribute('role', 'tabpanel');
      m.renderPainel(panel);
      panelsEl.appendChild(panel);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // PAINEL DO MÓDULO LEMBRETES
  // ═══════════════════════════════════════════════════════════════
  function renderPainelLembretes(panel) {
    panel.innerHTML = `
      <div class="lembretes-panel">
        <div class="lembretes-stat">
          <span class="lembretes-stat__count" id="lembrete-count">…</span>
          <span class="lembretes-stat__label">lembretes salvos</span>
        </div>

        <div class="lembretes-actions">
          <button class="popup-btn popup-btn--secondary" id="btn-modo-edicao">
            ✏️ Ativar modo edição
          </button>
        </div>
      </div>
    `;

    // Carregar contagem
    chrome.runtime.sendMessage({ tipo: 'obterTotalLembretes' }, (resp) => {
      const el = panel.querySelector('#lembrete-count');
      if (el) el.textContent = resp?.total ?? 0;
    });

    const btn = panel.querySelector('#btn-modo-edicao');

    function setBtnEstado(ativo) {
      if (ativo) {
        btn.textContent = '✏️ Desativar modo edição';
        btn.className = 'popup-btn popup-btn--warning';
      } else {
        btn.textContent = '✏️ Ativar modo edição';
        btn.className = 'popup-btn popup-btn--secondary';
      }
    }

    // Consultar estado atual do modo edição na aba ativa
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { tipo: 'obterEstado' }, (resp) => {
        if (chrome.runtime.lastError || !resp) return;
        setBtnEstado(resp.modoEdicao);
      });
    });

    // Clicar alterna o modo
    btn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        chrome.tabs.sendMessage(tabs[0].id, { tipo: 'obterEstado' }, (resp) => {
          if (chrome.runtime.lastError) { window.close(); return; }
          const novoEstado = !(resp?.modoEdicao ?? false);
          chrome.tabs.sendMessage(tabs[0].id, { tipo: 'toggleModoEdicao', ativo: novoEstado }, () => {
            window.close();
          });
        });
      });
    });
  }

})();
