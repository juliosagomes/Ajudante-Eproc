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
      id: 'anotacoesPreferencias',
      label: 'Anotações em preferências',
      descricao: 'Adiciona possibilidade de inserir anotações às preferências do Eproc.',
      icon: '<svg viewBox="0 0 20 20" fill="none"><path d="M10 2.5a5.5 5.5 0 0 1 5.5 5.5c0 3.5 1.5 4.5 1.5 5H3c0-.5 1.5-1.5 1.5-5A5.5 5.5 0 0 1 10 2.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8.5 13v.5a1.5 1.5 0 0 0 3 0V13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    },
    {
      id: 'colorirLocalizadores',
      label: 'Colorir Localizadores',
      descricao: 'Aplica cores personalizadas aos localizadores',
      icon: '<svg viewBox="0 0 20 20" fill="none"><circle cx="6.5" cy="6.5" r="2.5" stroke="currentColor" stroke-width="1.4"/><circle cx="13.5" cy="6.5" r="2.5" stroke="currentColor" stroke-width="1.4"/><circle cx="6.5" cy="13.5" r="2.5" stroke="currentColor" stroke-width="1.4"/><circle cx="13.5" cy="13.5" r="2.5" stroke="currentColor" stroke-width="1.4"/></svg>',
    },
    {
      id: 'filtrosEventos',
      label: '+Filtros de Eventos',
      descricao: 'Filtros avançados e agrupamento de cadeias de intimação',
      icon: '<svg viewBox="0 0 20 20" fill="none"><path d="M2 5h16M5 9h10M8 13h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    },
    {
      id: 'expansorNumeroProcesso',
      label: 'Expansor de nº de processo',
      descricao: 'Permite busca de processos por nº abreviado, sem digitar completamente.',
      icon: '<svg viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h14M3 14h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M14 14l2 2 3-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      id: 'buscaInteligente',
      label: 'Busca Inteligente',
      descricao: 'Campo de busca em tempo real no Painel Inicial, Meus Localizadores, Lista de Processos por Localizador e Relatório Geral.',
      icon: '<svg viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="5" stroke="currentColor" stroke-width="1.4"/><path d="M13 13l4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    },
    {
      id: 'paginaProcessoPlus',
      label: 'Capa de Processo+',
      descricao: 'Barra fixa, copiar número formatado, atalho à árvore e scroll rápido para preferências.',
      icon: '<svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3.5" width="14" height="13" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M3 7.5h14" stroke="currentColor" stroke-width="1.4"/><circle cx="5.5" cy="5.5" r="0.6" fill="currentColor"/><circle cx="7.5" cy="5.5" r="0.6" fill="currentColor"/><path d="M6 11h4M6 13h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    },
  ];

  // ─── Definição dos ajustes gerais (scripts globais) ─────────────
  const SCRIPTS_GERAIS = [
    {
      id: 'localizadorBusca',
      label: 'Busca de localizador',
      descricao: 'Adiciona campo de busca ao campo de novo localizador no Eproc.',
    },
    {
      id: 'informacoesAdicionais',
      label: 'Informações Adicionais',
      descricao: 'Moderniza visualmente a seção Informações Adicionais e permite a personalização com cores de destaque ou ocultação de itens.',
    },
    {
      id: 'tarjasCustomizadas',
      label: 'Tarjas Customizadas',
      descricao: 'Aplica cores personalizadas às tarjas (etiquetas) da capa do processo. Clique direito sobre uma tarja escolhe cor; clique do meio reseta todas.',
    },
    {
      id: 'esmaecerZerados',
      label: 'Esmaecer itens zerados no Painel Inicial',
      descricao: 'No Painel Inicial, deixa as linhas dos localizadores com 0 processos esmaecidas (cinza-claro), realçando os que têm pendências.',
    },
    {
      id: 'painelReordenar',
      label: 'Reordenar blocos no Painel Inicial',
      descricao: 'Adiciona botões ▲/▼ em cada bloco do Painel Inicial para mover sua posição. A ordem é lembrada nos próximos acessos. Inclui botão para restaurar a ordem nativa.',
    },
    {
      id: 'filtroPreferencias',
      label: 'Filtrar preferências (capa do processo)',
      descricao: 'Adiciona um campo de busca em cima das listas de preferências de Minutas, Movimentações e Intimações na capa do processo, com destaque do termo digitado. ESC limpa.',
    },
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
      bindDadosAnotacoes();
      renderListaAnotacoes();
      bindDadosLocalizadores();
      renderCoresLocalizadores();
      bindPolosFiltrosEventos();
      renderPolosFiltrosEventos();
      bindExpansorNumeroProcesso();
      bindPaginaProcessoPlusSubToggles();
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
        if (area !== 'local') return;
        if (changes.eprocAnotacoesPreferencias) renderListaAnotacoes();
        if (changes.eprocCoresLocalizadores)   renderCoresLocalizadores();
        if (changes.eprocFiltrosEventosPolos)  renderPolosFiltrosEventos();
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
            ${m.icon || ''}
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
    if (panelId === 'anotacoesPreferencias') renderListaAnotacoes();
    if (panelId === 'colorirLocalizadores') renderCoresLocalizadores();
    if (panelId === 'filtrosEventos')       renderPolosFiltrosEventos();
  }

  // ─── Lista de anotações salvas ────────────────────────────────────
  function renderListaAnotacoes() {
    const listaEl = document.getElementById('anotacoes-lista-body');
    const hintEl  = document.getElementById('anotacoes-total-hint');
    if (!listaEl) return;

    const doRender = (anotacoes) => {
      const entradas = Object.entries(anotacoes || {});
      entradas.sort(([a], [b]) => a.localeCompare(b, 'pt'));

      if (hintEl) {
        hintEl.textContent = `${entradas.length} anotaç${entradas.length !== 1 ? 'ões' : 'ão'}`;
      }

      if (entradas.length === 0) {
        listaEl.innerHTML = `
          <div class="card__empty">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 5v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>Nenhuma anotação salva ainda.</span>
          </div>`;
        return;
      }

      listaEl.innerHTML = '';
      for (const [chave, texto] of entradas) {
        const { tipo, nome } = parsearChave(chave);
        const label = TIPO_LABELS[tipo] || tipo;
        const item  = document.createElement('div');
        item.className = 'anotacao-item';
        item.innerHTML = `
          <span class="anotacao-badge anotacao-badge--${escapeHtml(tipo)}">${escapeHtml(label)}</span>
          <div class="anotacao-item__info">
            <span class="anotacao-item__nome" title="${escapeHtml(nome)}">${escapeHtml(nome)}</span>
            <span class="anotacao-item__texto">${escapeHtml(texto)}</span>
          </div>`;
        listaEl.appendChild(item);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('eprocAnotacoesPreferencias', (data) => doRender(data.eprocAnotacoesPreferencias));
    } else {
      doRender({});
    }
  }

  // ─── Gerenciar dados (JSON import/export/clear) ──────────────────
  function bindDadosAnotacoes() {
    const btnExportar = document.getElementById('btn-exportar-json');
    if (btnExportar) {
      btnExportar.addEventListener('click', () => {
        if (typeof chrome === 'undefined' || !chrome.storage) return;
        chrome.storage.local.get('eprocAnotacoesPreferencias', (data) => {
          const anotacoes = data.eprocAnotacoesPreferencias || {};
          const blob = new Blob([JSON.stringify(anotacoes, null, 2)], { type: 'application/json' });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href     = url;
          a.download = `anotacoes-preferencias-eproc-${new Date().toISOString().slice(0, 10)}.json`;
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
            chrome.storage.local.get('eprocAnotacoesPreferencias', (data) => {
              const merged = { ...(data.eprocAnotacoesPreferencias || {}), ...dados };
              chrome.storage.local.set({ eprocAnotacoesPreferencias: merged }, () => {
                const n = Object.keys(dados).length;
                mostrarToast(`✓ ${n} anotaç${n !== 1 ? 'ões' : 'ão'} importada${n !== 1 ? 's' : ''}`);
                renderListaAnotacoes();
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
        if (!confirm('Tem certeza? Todas as anotações serão apagadas permanentemente.')) return;
        if (typeof chrome === 'undefined' || !chrome.storage) return;
        chrome.storage.local.set({ eprocAnotacoesPreferencias: {} }, () => {
          mostrarToast('✓ Todas as anotações apagadas');
          renderListaAnotacoes();
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
      chrome.storage.local.get('eprocAnotacoesPreferencias', (data) => {
        const anotacoes = data.eprocAnotacoesPreferencias || {};
        const entradas  = Object.entries(anotacoes);
        entradas.sort(([a], [b]) => a.localeCompare(b, 'pt'));

        const linhas = [['Tipo', 'Preferência', 'Anotação']];
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
        a.download = `anotacoes-preferencias-eproc-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    });
  }

  // ─── Colorir Localizadores — utilitários de cor ──────────────────
  function luminanciaCor(hex) {
    if (!hex || hex.length < 7) return 1;
    const parse = (s) => parseInt(s, 16) / 255;
    const lin   = (v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    return 0.2126 * lin(parse(hex.slice(1, 3)))
         + 0.7152 * lin(parse(hex.slice(3, 5)))
         + 0.0722 * lin(parse(hex.slice(5, 7)));
  }

  function textoContrasteLoc(bgHex) {
    return luminanciaCor(bgHex) > 0.35 ? '#1a1a2e' : '#ffffff';
  }

  // ─── Colorir Localizadores — renderizar lista ─────────────────────
  function renderCoresLocalizadores() {
    const listaEl = document.getElementById('loc-mapa-body');
    const hintEl  = document.getElementById('loc-total-hint');
    if (!listaEl) return;

    const doRender = (cores) => {
      const entradas = Object.entries(cores || {});
      entradas.sort(([a], [b]) => a.localeCompare(b, 'pt'));

      if (hintEl) {
        hintEl.textContent = `${entradas.length} vínculo${entradas.length !== 1 ? 's' : ''}`;
      }

      if (entradas.length === 0) {
        listaEl.innerHTML = `
          <div class="card__empty">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            <span>Nenhum vínculo configurado — as cores serão geradas automaticamente pelo nome.</span>
          </div>`;
        return;
      }

      listaEl.innerHTML = '';
      for (const [nome, cor] of entradas) {
        const fg   = textoContrasteLoc(cor);
        const item = document.createElement('div');
        item.className = 'loc-item';
        item.innerHTML = `
          <span class="loc-item__swatch" style="background:${escapeHtml(cor)};color:${escapeHtml(fg)};"
                title="${escapeHtml(cor)}">${escapeHtml(nome)}</span>
          <div class="loc-item__info">
            <span class="loc-item__nome" title="${escapeHtml(nome)}">${escapeHtml(nome)}</span>
            <span class="loc-item__cor">${escapeHtml(cor)}</span>
          </div>
          <button class="btn-danger-sm loc-item__remover" data-nome="${escapeHtml(nome)}" title="Remover vínculo">
            <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>`;

        item.querySelector('.loc-item__remover').addEventListener('click', (e) => {
          const nomeDel = e.currentTarget.dataset.nome;
          if (typeof chrome === 'undefined' || !chrome.storage) return;
          chrome.storage.local.get('eprocCoresLocalizadores', (data) => {
            const cores = data.eprocCoresLocalizadores || {};
            delete cores[nomeDel];
            chrome.storage.local.set({ eprocCoresLocalizadores: cores }, () => {
              mostrarToast(`✓ Vínculo "${nomeDel}" removido`);
              renderCoresLocalizadores();
            });
          });
        });

        listaEl.appendChild(item);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('eprocCoresLocalizadores', (data) => doRender(data.eprocCoresLocalizadores));
    } else {
      doRender({});
    }
  }

  // ─── Colorir Localizadores — adicionar, exportar, importar, limpar
  function bindDadosLocalizadores() {
    // Preview ao vivo da cor selecionada
    const inputCor     = document.getElementById('loc-input-cor');
    const preview      = document.getElementById('loc-color-preview');
    const inputNome    = document.getElementById('loc-input-nome');

    function atualizarPreview() {
      if (!preview || !inputCor) return;
      const cor = inputCor.value;
      const fg  = textoContrasteLoc(cor);
      preview.style.background = cor;
      preview.style.color      = fg;
      preview.textContent      = inputNome?.value.trim() || cor;
    }
    if (inputCor)  inputCor.addEventListener('input',  atualizarPreview);
    if (inputNome) inputNome.addEventListener('input',  atualizarPreview);
    atualizarPreview();

    // Adicionar novo vínculo
    const btnAdicionar = document.getElementById('btn-loc-adicionar');
    if (btnAdicionar) {
      btnAdicionar.addEventListener('click', () => {
        const nome = inputNome?.value.trim();
        const cor  = inputCor?.value || '#7ab3d8';
        if (!nome) {
          mostrarToast('Informe o nome do localizador', true);
          inputNome?.focus();
          return;
        }
        if (!/^#[0-9a-fA-F]{6}$/.test(cor)) {
          mostrarToast('Cor inválida', true);
          return;
        }
        if (typeof chrome === 'undefined' || !chrome.storage) return;
        chrome.storage.local.get('eprocCoresLocalizadores', (data) => {
          const cores = data.eprocCoresLocalizadores || {};
          cores[nome] = cor.toLowerCase();
          chrome.storage.local.set({ eprocCoresLocalizadores: cores }, () => {
            mostrarToast(`✓ Vínculo "${nome}" → ${cor} salvo`);
            if (inputNome) inputNome.value = '';
            atualizarPreview();
            renderCoresLocalizadores();
          });
        });
      });
    }

    // Exportar JSON
    const btnExportar = document.getElementById('btn-loc-exportar-json');
    if (btnExportar) {
      btnExportar.addEventListener('click', () => {
        if (typeof chrome === 'undefined' || !chrome.storage) return;
        chrome.storage.local.get('eprocCoresLocalizadores', (data) => {
          const cores = data.eprocCoresLocalizadores || {};
          const blob  = new Blob([JSON.stringify(cores, null, 2)], { type: 'application/json' });
          const url   = URL.createObjectURL(blob);
          const a     = document.createElement('a');
          a.href      = url;
          a.download  = `cores-localizadores-eproc-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
      });
    }

    // Importar JSON
    const inputImportar = document.getElementById('loc-import-json');
    if (inputImportar) {
      inputImportar.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const dados = JSON.parse(ev.target.result);
            if (typeof dados !== 'object' || Array.isArray(dados)) throw new Error();
            if (typeof chrome === 'undefined' || !chrome.storage) return;
            chrome.storage.local.get('eprocCoresLocalizadores', (data) => {
              const merged = { ...(data.eprocCoresLocalizadores || {}), ...dados };
              chrome.storage.local.set({ eprocCoresLocalizadores: merged }, () => {
                mostrarToast(`✓ ${Object.keys(dados).length} vínculo(s) importado(s)`);
                renderCoresLocalizadores();
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

    // Limpar tudo
    const btnLimpar = document.getElementById('btn-loc-limpar');
    if (btnLimpar) {
      btnLimpar.addEventListener('click', () => {
        if (!confirm('Tem certeza? Todos os vínculos nome→cor serão apagados e as cores voltarão a ser geradas automaticamente.')) return;
        if (typeof chrome === 'undefined' || !chrome.storage) return;
        chrome.storage.local.set({ eprocCoresLocalizadores: {} }, () => {
          mostrarToast('✓ Todos os vínculos apagados');
          renderCoresLocalizadores();
        });
      });
    }
  }

  // ─── +Filtros de Eventos — cores dos polos ────────────────────────
  const POLOS_KEY = 'eprocFiltrosEventosPolos';
  const POLOS_PADRAO = {
    presets: { ativo: '#1e8a3c', passivo: '#c0382b', mp: '#6f42c1', outro: '#000000' },
    customizados: [],
  };

  function lerPolosCfg(cb) {
    if (typeof chrome === 'undefined' || !chrome.storage) return cb(POLOS_PADRAO);
    chrome.storage.local.get(POLOS_KEY, (data) => {
      const raw = data[POLOS_KEY];
      const out = JSON.parse(JSON.stringify(POLOS_PADRAO));
      if (raw && typeof raw === 'object') {
        if (raw.presets) {
          for (const k of Object.keys(out.presets)) {
            if (typeof raw.presets[k] === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.presets[k])) {
              out.presets[k] = raw.presets[k];
            }
          }
        }
        if (Array.isArray(raw.customizados)) {
          out.customizados = raw.customizados
            .filter(c => c && Array.isArray(c.termos))
            .map(c => ({
              id:     String(c.id || ''),
              nome:   String(c.nome || ''),
              termos: c.termos.map(String),
              cor:    /^#[0-9a-fA-F]{6}$/.test(c.cor || '') ? c.cor : '#000000',
            }));
        }
      }
      cb(out);
    });
  }

  function salvarPolosCfg(cfg, cb) {
    if (typeof chrome === 'undefined' || !chrome.storage) return cb && cb();
    chrome.storage.local.set({ [POLOS_KEY]: cfg }, () => cb && cb());
  }

  function renderPolosFiltrosEventos() {
    lerPolosCfg((cfg) => {
      const ids = ['fe-cor-ativo', 'fe-cor-passivo', 'fe-cor-mp', 'fe-cor-outro'];
      const keys = ['ativo', 'passivo', 'mp', 'outro'];
      ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.value = cfg.presets[keys[i]];
      });

      const lista = document.getElementById('fe-destaques-lista');
      if (!lista) return;
      lista.innerHTML = '';
      if (cfg.customizados.length === 0) {
        lista.innerHTML = `
          <div class="card__empty">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            <span>Nenhum destaque personalizado. Adicione termos para colorir polos específicos com cor própria.</span>
          </div>`;
        return;
      }
      for (const c of cfg.customizados) {
        const item = document.createElement('div');
        item.className = 'fe-destaque-item';
        const termos = c.termos.join(', ');
        item.innerHTML = `
          <span class="fe-destaque-swatch" style="background:${escapeHtml(c.cor)}" title="${escapeHtml(c.cor)}"></span>
          <div class="fe-destaque-info">
            <span class="fe-destaque-nome" style="color:${escapeHtml(c.cor)};">${escapeHtml(c.nome || '(sem nome)')}</span>
            <span class="fe-destaque-termos" title="${escapeHtml(termos)}">${escapeHtml(termos)}</span>
          </div>
          <button class="btn-danger-sm fe-destaque-remover" data-id="${escapeHtml(c.id)}" title="Remover destaque">
            <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>`;
        item.querySelector('.fe-destaque-remover').addEventListener('click', (e) => {
          const idDel = e.currentTarget.dataset.id;
          lerPolosCfg((cur) => {
            cur.customizados = cur.customizados.filter(x => x.id !== idDel);
            salvarPolosCfg(cur, () => {
              mostrarToast('✓ Destaque removido');
              renderPolosFiltrosEventos();
            });
          });
        });
        lista.appendChild(item);
      }
    });
  }

  function bindPolosFiltrosEventos() {
    const presetIds = [
      ['fe-cor-ativo',   'ativo'],
      ['fe-cor-passivo', 'passivo'],
      ['fe-cor-mp',      'mp'],
      ['fe-cor-outro',   'outro'],
    ];
    presetIds.forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        const novo = el.value;
        if (!/^#[0-9a-fA-F]{6}$/.test(novo)) return;
        lerPolosCfg((cur) => {
          cur.presets[key] = novo.toLowerCase();
          salvarPolosCfg(cur, () => mostrarToast('✓ Cor atualizada'));
        });
      });
    });

    const btnReset = document.getElementById('fe-cores-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        lerPolosCfg((cur) => {
          cur.presets = { ...POLOS_PADRAO.presets };
          salvarPolosCfg(cur, () => {
            mostrarToast('✓ Cores padrão restauradas');
            renderPolosFiltrosEventos();
          });
        });
      });
    }

    const btnAdd     = document.getElementById('fe-destaque-add');
    const inputNome  = document.getElementById('fe-destaque-nome');
    const inputTerms = document.getElementById('fe-destaque-termos');
    const inputCor   = document.getElementById('fe-destaque-cor');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        const nome   = inputNome?.value.trim() || '';
        const termos = (inputTerms?.value || '')
          .split(',').map(s => s.trim()).filter(Boolean);
        const cor    = inputCor?.value || '#0080a0';
        if (termos.length === 0) {
          mostrarToast('Informe ao menos um termo', true);
          inputTerms?.focus();
          return;
        }
        if (!/^#[0-9a-fA-F]{6}$/.test(cor)) {
          mostrarToast('Cor inválida', true);
          return;
        }
        lerPolosCfg((cur) => {
          const id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          cur.customizados.push({ id, nome, termos, cor: cor.toLowerCase() });
          salvarPolosCfg(cur, () => {
            mostrarToast('✓ Destaque adicionado');
            if (inputNome)  inputNome.value  = '';
            if (inputTerms) inputTerms.value = '';
            renderPolosFiltrosEventos();
          });
        });
      });
    }
  }

  // ─── Expansor de nº de processo ──────────────────────────────────
  function bindExpansorNumeroProcesso() {
    const inpOOOO   = document.getElementById('expro-defaultOOOO');
    const inpAnoMin = document.getElementById('expro-anoMin');
    if (!inpOOOO || !inpAnoMin) return;

    if (!settings.modules.expansorNumeroProcesso) {
      settings.modules.expansorNumeroProcesso = { enabled: true };
    }
    const m = settings.modules.expansorNumeroProcesso;

    inpOOOO.value   = typeof m.defaultOOOO === 'string' ? m.defaultOOOO : '';
    inpAnoMin.value = Number.isFinite(m.anoMin) ? m.anoMin : 2010;

    inpOOOO.addEventListener('input', () => {
      // Aceita apenas dígitos, máx 4
      inpOOOO.value = inpOOOO.value.replace(/\D/g, '').slice(0, 4);
    });

    inpOOOO.addEventListener('change', () => {
      const v = inpOOOO.value.trim();
      if (v && !/^\d{4}$/.test(v)) {
        mostrarToast('Código do órgão deve ter 4 dígitos', true);
        return;
      }
      settings.modules.expansorNumeroProcesso.defaultOOOO = v;
      salvar();
    });

    inpAnoMin.addEventListener('change', () => {
      const v = parseInt(inpAnoMin.value, 10);
      const anoAtualMax = new Date().getFullYear() + 1;
      if (!Number.isFinite(v) || v < 2000 || v > anoAtualMax) {
        mostrarToast(`Ano mínimo deve estar entre 2000 e ${anoAtualMax}`, true);
        inpAnoMin.value = settings.modules.expansorNumeroProcesso.anoMin || 2010;
        return;
      }
      settings.modules.expansorNumeroProcesso.anoMin = v;
      salvar();
    });
  }

  // ─── Capa de Processo+ — sub-toggles ───────────────────────────
  function bindPaginaProcessoPlusSubToggles() {
    const sub = ['barraInfo', 'copyNumero', 'botaoFlutuante', 'atalhosPreferencias'];
    if (!settings.modules.paginaProcessoPlus) {
      settings.modules.paginaProcessoPlus = { enabled: true };
    }
    const cfg = settings.modules.paginaProcessoPlus;

    sub.forEach((key) => {
      const input = document.querySelector(`[data-pp-sub="${key}"]`);
      if (!input) return;
      input.checked = cfg[key] !== false;
      input.addEventListener('change', (e) => {
        cfg[key] = e.target.checked;
        salvar();
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
