// settings/settings.js — Ajudante Eproc v2

(function () {
  'use strict';

  // ─── Labels dos tipos de preferência ────────────────────────────
  const TIPO_LABELS = {
    minuta:        'Minuta',
    movimentacao:  'Movimentação',
    intimacao:     'Intimação',
    automatizacao: 'Automatização',
  };

  function parsearChave(chave) {
    const sep = chave.indexOf(':');
    if (sep === -1) return { tipo: '', nome: chave };
    return { tipo: chave.substring(0, sep), nome: chave.substring(sep + 1) };
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── Definição dos módulos ───────────────────────────────────────
  const MODULOS = [
    {
      id: 'lembretes',
      label: 'Lembretes',
      descricao: 'Adiciona lembretes personalizados às preferências do Eproc.',
    }
  ];

  // ─── Definição dos ajustes gerais (scripts globais) ─────────────
  const SCRIPTS_GERAIS = [
    {
      id: 'localizadorBusca',
      label: 'Busca de localizador',
      descricao: 'Adiciona campo de busca ao seletor de novo localizador no Eproc.',
    }
  ];

  let settings = { modules: {}, scripts: {} };

  // ─── Elementos ───────────────────────────────────────────────────
  const sidebarNav   = document.getElementById('sidebar-nav');
  const contentArea  = document.getElementById('content-area');
  const overviewList = document.getElementById('modules-overview-list');
  const toast        = document.getElementById('save-toast');
  let toastTimer     = null;

  // ─── Bootstrap ───────────────────────────────────────────────────
  function init() {
    const doRender = () => {
      MODULOS.forEach((m) => {
        if (!settings.modules[m.id]) settings.modules[m.id] = { enabled: true };
      });
      SCRIPTS_GERAIS.forEach((s) => {
        if (!settings.scripts)       settings.scripts = {};
        if (!settings.scripts[s.id]) settings.scripts[s.id] = { enabled: true };
      });
      renderOverview();
      renderScriptsGerais();
      bindToggles();
      bindSidebarNav();
      bindCsvButton();
      bindDadosLembretes();
      renderListaLembretes();
    };

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ tipo: 'obterSettings' }, (resp) => {
        settings = resp?.settings || { modules: {}, scripts: {} };
        if (!settings.scripts) settings.scripts = {};
        doRender();
      });
    } else {
      doRender();
    }

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.eprocLembretes) renderListaLembretes();
      });
    }
  }

  // ─── Overview (painel Geral) ──────────────────────────────────────
  function renderOverview() {
    overviewList.innerHTML = '';
    MODULOS.forEach((m) => {
      const enabled = settings.modules[m.id]?.enabled ?? true;
      const item = document.createElement('div');
      item.className = 'mod-overview-item';
      item.innerHTML = `
        <div class="mod-overview-item__info">
          <div class="mod-overview-item__icon">
            <svg viewBox="0 0 20 20" fill="none"><path d="M10 2.5a5.5 5.5 0 0 1 5.5 5.5c0 3.5 1.5 4.5 1.5 5H3c0-.5 1.5-1.5 1.5-5A5.5 5.5 0 0 1 10 2.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8.5 13v.5a1.5 1.5 0 0 0 3 0V13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </div>
          <div>
            <span class="mod-overview-item__name">${m.label}</span>
            <span class="mod-overview-item__desc">${m.descricao}</span>
          </div>
        </div>
        <span class="mod-status-badge mod-status-badge--${enabled ? 'ativo' : 'inativo'}" id="badge-${m.id}">
          ${enabled ? 'Ativo' : 'Inativo'}
        </span>
      `;
      item.addEventListener('click', () => navigateTo(m.id));
      overviewList.appendChild(item);
    });
  }

  // ─── Ajustes Gerais (scripts globais) ────────────────────────────
  function renderScriptsGerais() {
    const lista = document.getElementById('scripts-gerais-list');
    if (!lista) return;
    lista.innerHTML = '';

    SCRIPTS_GERAIS.forEach((s, i) => {
      const enabled = settings.scripts?.[s.id]?.enabled ?? true;
      const row = document.createElement('div');
      row.className = 'card__row' + (i > 0 ? '' : '');
      row.innerHTML = `
        <div class="card__row-info">
          <span class="card__row-label">${escapeHtml(s.label)}</span>
          <span class="card__row-sub">${escapeHtml(s.descricao)}</span>
        </div>
        <div class="toggle-group">
          <span class="toggle-label${enabled ? ' toggle-label--ativo' : ''}" id="lbl-script-${s.id}">
            ${enabled ? 'Ativo' : 'Inativo'}
          </span>
          <label class="toggle" title="Ativar/desativar ${escapeHtml(s.label)}">
            <input type="checkbox" class="toggle__input" id="toggle-script-${s.id}" ${enabled ? 'checked' : ''}>
            <span class="toggle__slider"></span>
          </label>
        </div>
      `;
      lista.appendChild(row);

      const input = row.querySelector(`#toggle-script-${s.id}`);
      const lbl   = row.querySelector(`#lbl-script-${s.id}`);

      input.addEventListener('change', (e) => {
        if (!settings.scripts)       settings.scripts = {};
        if (!settings.scripts[s.id]) settings.scripts[s.id] = {};
        settings.scripts[s.id].enabled = e.target.checked;
        salvar(() => {
          lbl.textContent  = e.target.checked ? 'Ativo' : 'Inativo';
          lbl.className    = `toggle-label${e.target.checked ? ' toggle-label--ativo' : ''}`;
        });
      });
    });
  }

  // ─── Bind toggles dos painéis de módulo ──────────────────────────
  function bindToggles() {
    MODULOS.forEach((m) => {
      const input = document.getElementById(`toggle-mod-${m.id}`);
      const lbl   = document.getElementById(`lbl-mod-${m.id}`);
      if (!input) return;

      const enabled = settings.modules[m.id]?.enabled ?? true;
      input.checked = enabled;
      if (lbl) {
        lbl.textContent = enabled ? 'Ativo' : 'Inativo';
        lbl.className   = `toggle-label${enabled ? ' toggle-label--ativo' : ''}`;
      }

      input.addEventListener('change', (e) => {
        settings.modules[m.id].enabled = e.target.checked;
        salvar(() => {
          if (lbl) {
            lbl.textContent = e.target.checked ? 'Ativo' : 'Inativo';
            lbl.className   = `toggle-label${e.target.checked ? ' toggle-label--ativo' : ''}`;
          }
          const badge = document.getElementById(`badge-${m.id}`);
          if (badge) {
            badge.textContent = e.target.checked ? 'Ativo' : 'Inativo';
            badge.className   = `mod-status-badge mod-status-badge--${e.target.checked ? 'ativo' : 'inativo'}`;
          }
        });
      });
    });
  }

  // ─── Navegação sidebar ────────────────────────────────────────────
  function bindSidebarNav() {
    sidebarNav.querySelectorAll('.sidebar-nav__item[data-panel]').forEach((btn) => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.panel));
    });
  }

  function navigateTo(panelId) {
    sidebarNav.querySelectorAll('.sidebar-nav__item').forEach((b) => {
      b.classList.toggle('sidebar-nav__item--active', b.dataset.panel === panelId);
    });
    contentArea.querySelectorAll('.content-panel').forEach((p) => {
      p.classList.toggle('content-panel--hidden', p.dataset.panel !== panelId);
    });
    if (panelId === 'lembretes') renderListaLembretes();
  }

  // ─── Lista de lembretes salvos ────────────────────────────────────
  function renderListaLembretes() {
    const listaEl = document.getElementById('lembretes-lista-body');
    const hintEl  = document.getElementById('lembretes-total-hint');
    if (!listaEl) return;

    const doRender = (lembretes) => {
      const entradas = Object.entries(lembretes || {});
      entradas.sort(([a], [b]) => a.localeCompare(b, 'pt'));

      if (hintEl) {
        hintEl.textContent = `${entradas.length} lembrete${entradas.length !== 1 ? 's' : ''}`;
      }

      if (entradas.length === 0) {
        listaEl.innerHTML = `
          <div class="card__empty">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 5v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>Nenhum lembrete salvo ainda.</span>
          </div>`;
        return;
      }

      listaEl.innerHTML = '';
      for (const [chave, texto] of entradas) {
        const { tipo, nome } = parsearChave(chave);
        const label = TIPO_LABELS[tipo] || tipo;
        const item  = document.createElement('div');
        item.className = 'lembrete-item';
        item.innerHTML = `
          <span class="lembrete-badge lembrete-badge--${escapeHtml(tipo)}">${escapeHtml(label)}</span>
          <div class="lembrete-item__info">
            <span class="lembrete-item__nome" title="${escapeHtml(nome)}">${escapeHtml(nome)}</span>
            <span class="lembrete-item__texto">${escapeHtml(texto)}</span>
          </div>`;
        listaEl.appendChild(item);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('eprocLembretes', (data) => doRender(data.eprocLembretes));
    } else {
      doRender({});
    }
  }

  // ─── Gerenciar dados (JSON import/export/clear) ──────────────────
  function bindDadosLembretes() {
    const btnExportar = document.getElementById('btn-exportar-json');
    if (btnExportar) {
      btnExportar.addEventListener('click', () => {
        if (typeof chrome === 'undefined' || !chrome.storage) return;
        chrome.storage.local.get('eprocLembretes', (data) => {
          const lembretes = data.eprocLembretes || {};
          const blob = new Blob([JSON.stringify(lembretes, null, 2)], { type: 'application/json' });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href     = url;
          a.download = `lembretes-eproc-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
      });
    }

    const inputImportar = document.getElementById('import-json-settings');
    if (inputImportar) {
      inputImportar.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const dados = JSON.parse(ev.target.result);
            if (typeof chrome === 'undefined' || !chrome.storage) return;
            chrome.storage.local.get('eprocLembretes', (data) => {
              const merged = { ...(data.eprocLembretes || {}), ...dados };
              chrome.storage.local.set({ eprocLembretes: merged }, () => {
                mostrarToast(`✓ ${Object.keys(dados).length} lembrete(s) importado(s)`);
                renderListaLembretes();
              });
            });
          } catch {
            mostrarToast('Arquivo JSON inválido', true);
          }
          e.target.value = '';
        };
        reader.readAsText(file);
      });
    }

    const btnLimpar = document.getElementById('btn-limpar-todos');
    if (btnLimpar) {
      btnLimpar.addEventListener('click', () => {
        if (!confirm('Tem certeza? Todos os lembretes serão apagados permanentemente.')) return;
        if (typeof chrome === 'undefined' || !chrome.storage) return;
        chrome.storage.local.set({ eprocLembretes: {} }, () => {
          mostrarToast('✓ Todos os lembretes apagados');
          renderListaLembretes();
        });
      });
    }
  }

  // ─── Exportar CSV ─────────────────────────────────────────────────
  function bindCsvButton() {
    const btn = document.getElementById('btn-exportar-csv');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (typeof chrome === 'undefined' || !chrome.storage) return;
      chrome.storage.local.get('eprocLembretes', (data) => {
        const lembretes = data.eprocLembretes || {};
        const entradas  = Object.entries(lembretes);
        entradas.sort(([a], [b]) => a.localeCompare(b, 'pt'));

        const linhas = [['Tipo', 'Preferência', 'Lembrete']];
        for (const [chave, texto] of entradas) {
          const { tipo, nome } = parsearChave(chave);
          linhas.push([TIPO_LABELS[tipo] || tipo, nome, texto]);
        }

        const csv = linhas
          .map(cols => cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
          .join('\r\n');

        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `lembretes-eproc-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    });
  }

  // ─── Salvar ───────────────────────────────────────────────────────
  function salvar(callback) {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ tipo: 'salvarSettings', settings }, (resp) => {
        if (resp?.ok) mostrarToast('✓ Configurações salvas');
        else mostrarToast('Erro ao salvar', true);
        if (callback) callback();
      });
    } else {
      mostrarToast('✓ Configurações salvas');
      if (callback) callback();
    }
  }

  function mostrarToast(msg, erro = false) {
    toast.textContent = msg;
    toast.className   = `save-toast save-toast--visible${erro ? ' save-toast--erro' : ''}`;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.className = 'save-toast'; }, 2200);
  }

  init();

})();
