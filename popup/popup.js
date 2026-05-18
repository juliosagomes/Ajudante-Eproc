// popup/popup.js — Ajudante Eproc

(function () {
  'use strict';

  const MODULOS_DEFINIDOS = [
    {
      id: 'anotacoesPreferencias',
      label: 'Anotações em preferências',
      iconeSvg: '<svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M4 4h13l3 3v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 11h8M8 15h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      carregarStat: carregarStatAnotacoes,
      renderPainel: renderPainelAnotacoes,
    },
    {
      id: 'colorirLocalizadores',
      label: 'Colorir Localizadores',
      iconeSvg: '<svg viewBox="0 0 20 20" fill="none" width="14" height="14"><circle cx="5.5" cy="5.5" r="2" fill="currentColor"/><circle cx="14.5" cy="5.5" r="2" fill="currentColor" opacity=".65"/><circle cx="5.5" cy="14.5" r="2" fill="currentColor" opacity=".5"/><circle cx="14.5" cy="14.5" r="2" fill="currentColor" opacity=".85"/></svg>',
      carregarStat: carregarStatLocalizadores,
      renderPainel: renderPainelLocalizadores,
    },
    {
      id: 'filtrosEventos',
      label: '+Filtros de Eventos',
      iconeSvg: '<svg viewBox="0 0 20 20" fill="none" width="14" height="14"><path d="M2 5h16M5 9h10M8 13h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      carregarStat: carregarStatFiltrosEventos,
      renderPainel: renderPainelFiltrosEventos,
    },
    {
      id: 'expansorNumeroProcesso',
      label: 'Expansor nº processo',
      iconeSvg: '<svg viewBox="0 0 20 20" fill="none" width="14" height="14"><path d="M3 6h14M3 10h14M3 14h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14 14l2 2 3-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      carregarStat: carregarStatExpansorNumeroProcesso,
      renderPainel: renderPainelExpansorNumeroProcesso,
    },
  ];

  let settings = { modules: {} };

  const accordionEl = document.getElementById('popup-accordion');
  const emptyEl     = document.getElementById('popup-empty');

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
    accordionEl.innerHTML = '';

    const ativos = MODULOS_DEFINIDOS.filter((m) => settings.modules[m.id]?.enabled);

    if (ativos.length === 0) {
      accordionEl.style.display = 'none';
      emptyEl.style.display = 'flex';
      return;
    }

    emptyEl.style.display = 'none';
    accordionEl.style.display = '';

    ativos.forEach((m, idx) => {
      const item = criarItemAcordeon(m, idx === 0);
      accordionEl.appendChild(item);
    });
  }

  // ─── Criar item do acordeão ──────────────────────────────────────
  function criarItemAcordeon(modulo, expandidoInicial) {
    const item = document.createElement('div');
    item.className = 'acc-item';
    item.id = `acc-${modulo.id}`;

    // Header (botão clicável)
    const header = document.createElement('button');
    header.className = 'acc-header';
    header.setAttribute('aria-expanded', expandidoInicial ? 'true' : 'false');
    header.setAttribute('aria-controls', `acc-body-${modulo.id}`);
    header.innerHTML = `
      <span class="acc-header__icon">${modulo.iconeSvg}</span>
      <span class="acc-header__label">${modulo.label}</span>
      <span class="acc-header__stat" id="stat-${modulo.id}"></span>
      <svg class="acc-header__chevron" viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden="true">
        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    // Body (conteúdo retrátil)
    const body = document.createElement('div');
    body.className = 'acc-body';
    body.id = `acc-body-${modulo.id}`;
    body.setAttribute('role', 'region');
    if (!expandidoInicial) body.classList.add('acc-body--hidden');

    // Renderiza conteúdo do painel dentro do body
    modulo.renderPainel(body);

    // Toggle ao clicar no header
    header.addEventListener('click', () => {
      const expandido = body.classList.toggle('acc-body--hidden');
      // classList.toggle retorna true se a classe foi ADICIONADA (ou seja, colapsou)
      header.setAttribute('aria-expanded', expandido ? 'false' : 'true');
    });

    item.appendChild(header);
    item.appendChild(body);

    // Carrega stat assincronamente no header
    if (modulo.carregarStat) {
      modulo.carregarStat((txt) => {
        const el = item.querySelector(`#stat-${modulo.id}`);
        if (el) el.textContent = txt;
      });
    }

    return item;
  }

  // ═══════════════════════════════════════════════════════════════
  // PAINEL DO MÓDULO ANOTAÇÕES EM PREFERÊNCIAS
  // ═══════════════════════════════════════════════════════════════

  function carregarStatAnotacoes(cb) {
    chrome.runtime.sendMessage({ tipo: 'obterTotalAnotacoesPreferencias' }, (resp) => {
      const total = resp?.total ?? 0;
      cb(`${total} anotaç${total !== 1 ? 'ões' : 'ão'}`);
    });
  }

  function renderPainelAnotacoes(panel) {
    panel.innerHTML = `
      <div class="mod-panel">
        <div class="mod-stat" id="anotacoes-stat-box">
          <span class="mod-stat__count" id="anotacao-count">…</span>
          <span class="mod-stat__label">anotações salvas</span>
        </div>
        <button class="popup-btn popup-btn--secondary" id="btn-modo-edicao">
          ✏️ Ativar modo edição
        </button>
      </div>
    `;

    chrome.runtime.sendMessage({ tipo: 'obterTotalAnotacoesPreferencias' }, (resp) => {
      const el = panel.querySelector('#anotacao-count');
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

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { tipo: 'obterEstado' }, (resp) => {
        if (chrome.runtime.lastError || !resp) return;
        setBtnEstado(resp.modoEdicao);
      });
    });

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

  // ═══════════════════════════════════════════════════════════════
  // PAINEL DO MÓDULO COLORIR LOCALIZADORES
  // ═══════════════════════════════════════════════════════════════

  function carregarStatLocalizadores(cb) {
    chrome.storage.local.get('eprocCoresLocalizadores', (data) => {
      const total = Object.keys(data.eprocCoresLocalizadores || {}).length;
      cb(`${total} cor${total !== 1 ? 'es' : ''}`);
    });
  }

  function renderPainelLocalizadores(panel) {
    panel.innerHTML = `
      <div class="mod-panel">
        <div class="mod-stat mod-stat--green" id="loc-stat-box">
          <span class="mod-stat__count" id="loc-count">…</span>
          <span class="mod-stat__label">vínculos configurados</span>
        </div>

        <div class="loc-info-box">
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13" aria-hidden="true" style="flex-shrink:0;margin-top:1px">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3" opacity=".6"/>
            <path d="M8 7v4M8 5.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Clique no botão <strong>⬤</strong> ao lado de cada localizador na tela do processo para vincular uma cor.</span>
        </div>

        <button class="popup-btn popup-btn--secondary" id="btn-loc-settings">
          ⚙️ Gerenciar cores
        </button>
      </div>
    `;

    // Contagem de vínculos
    chrome.storage.local.get('eprocCoresLocalizadores', (data) => {
      const total = Object.keys(data.eprocCoresLocalizadores || {}).length;
      const el = panel.querySelector('#loc-count');
      if (el) el.textContent = total;
    });

    // Botão para abrir settings na página do módulo
    panel.querySelector('#btn-loc-settings').addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('settings/settings.html') + '#colorirLocalizadores',
      });
      window.close();
    });

    // Atualiza contagem em tempo real enquanto o popup estiver aberto
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.eprocCoresLocalizadores) {
        const total = Object.keys(changes.eprocCoresLocalizadores.newValue || {}).length;
        const countEl = panel.querySelector('#loc-count');
        if (countEl) countEl.textContent = total;
        // atualiza stat no header também
        const statEl = document.getElementById('stat-colorirLocalizadores');
        if (statEl) statEl.textContent = `${total} cor${total !== 1 ? 'es' : ''}`;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // PAINEL DO MÓDULO +FILTROS DE EVENTOS
  // ═══════════════════════════════════════════════════════════════

  function contarFiltrosAtivos(f) {
    if (!f) return 0;
    return (f.categoriasOcultas || []).length
      + (f.ocultarSistema  ? 1 : 0)
      + (f.ocultarInterno  ? 1 : 0)
      + (f.ocultarExterno  ? 1 : 0)
      + (f.dataInicio      ? 1 : 0)
      + (f.dataFim         ? 1 : 0);
  }

  function carregarStatFiltrosEventos(cb) {
    chrome.storage.local.get('eprocFiltrosEventos', (data) => {
      const n = contarFiltrosAtivos(data.eprocFiltrosEventos);
      cb(n > 0 ? `${n} filtro${n !== 1 ? 's' : ''} ativo${n !== 1 ? 's' : ''}` : 'sem filtros ativos');
    });
  }

  function renderPainelFiltrosEventos(panel) {
    panel.innerHTML = `
      <div class="mod-panel">
        <div class="mod-stat" id="fe-stat-box">
          <span class="mod-stat__count" id="fe-count">…</span>
          <span class="mod-stat__label">filtros ativos</span>
        </div>

        <div class="loc-info-box">
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13" aria-hidden="true" style="flex-shrink:0;margin-top:1px">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3" opacity=".6"/>
            <path d="M8 7v4M8 5.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Os filtros são configurados diretamente na barra <strong>+Filtros de Eventos</strong>, na aba Eventos de cada processo.</span>
        </div>

        <button class="popup-btn popup-btn--secondary" id="btn-fe-settings">
          ⚙️ Configurações do módulo
        </button>
      </div>
    `;

    chrome.storage.local.get('eprocFiltrosEventos', (data) => {
      const n  = contarFiltrosAtivos(data.eprocFiltrosEventos);
      const el = panel.querySelector('#fe-count');
      if (el) el.textContent = n;
    });

    panel.querySelector('#btn-fe-settings').addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('settings/settings.html') + '#filtrosEventos',
      });
      window.close();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.eprocFiltrosEventos) {
        const n     = contarFiltrosAtivos(changes.eprocFiltrosEventos.newValue);
        const count = panel.querySelector('#fe-count');
        if (count) count.textContent = n;
        const stat  = document.getElementById('stat-filtrosEventos');
        if (stat)  stat.textContent = n > 0
          ? `${n} filtro${n !== 1 ? 's' : ''} ativo${n !== 1 ? 's' : ''}`
          : 'sem filtros ativos';
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // PAINEL DO MÓDULO EXPANSOR DE Nº DE PROCESSO
  // ═══════════════════════════════════════════════════════════════

  function carregarStatExpansorNumeroProcesso(cb) {
    chrome.storage.local.get('eprocSettings', (data) => {
      const m = data.eprocSettings?.modules?.expansorNumeroProcesso || {};
      cb(m.defaultOOOO ? `órgão ${m.defaultOOOO}` : 'configure o órgão');
    });
  }

  function renderPainelExpansorNumeroProcesso(panel) {
    panel.innerHTML = `
      <div class="mod-panel">
        <div class="mod-stat" id="expro-stat-box">
          <span class="mod-stat__count" id="expro-orgao">…</span>
          <span class="mod-stat__label">órgão padrão</span>
        </div>

        <div class="loc-info-box">
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13" aria-hidden="true" style="flex-shrink:0;margin-top:1px">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3" opacity=".6"/>
            <path d="M8 7v4M8 5.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Digite formatos como <strong>43325</strong>, <strong>433-07</strong> ou <strong>43325.0850</strong> no campo de busca rápida do Eproc e tecle Enter — o número será expandido automaticamente.</span>
        </div>

        <button class="popup-btn popup-btn--secondary" id="btn-expro-settings">
          ⚙️ Configurar órgão padrão
        </button>
      </div>
    `;

    chrome.storage.local.get('eprocSettings', (data) => {
      const m  = data.eprocSettings?.modules?.expansorNumeroProcesso || {};
      const el = panel.querySelector('#expro-orgao');
      if (el) el.textContent = m.defaultOOOO || '—';
    });

    panel.querySelector('#btn-expro-settings').addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('settings/settings.html') + '#expansorNumeroProcesso',
      });
      window.close();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.eprocSettings) {
        const m = changes.eprocSettings.newValue?.modules?.expansorNumeroProcesso || {};
        const el = panel.querySelector('#expro-orgao');
        if (el) el.textContent = m.defaultOOOO || '—';
        const stat = document.getElementById('stat-expansorNumeroProcesso');
        if (stat) stat.textContent = m.defaultOOOO ? `órgão ${m.defaultOOOO}` : 'configure o órgão';
      }
    });
  }

})();
