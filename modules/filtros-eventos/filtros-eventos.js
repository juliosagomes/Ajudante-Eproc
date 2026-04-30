// modules/filtros-eventos/filtros-eventos.js — Módulo +Filtros de Eventos

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  const SETTINGS_KEY = 'eprocSettings';
  const STORAGE_KEY  = 'eprocFiltrosEventos';
  const MODULE_NAME  = 'filtrosEventos';

  // ─── Categorias de evento (testadas contra label normalizado) ────
  const CATEGORIAS = [
    {
      key: 'decisao',
      label: 'Decisões',
      teste: s => s.includes('decisao') || s.includes('sentenca') || s.includes('antecipacao') || s.includes('gratuidade') || s.includes('outras decisoes'),
    },
    {
      key: 'despacho',
      label: 'Despachos / Conclusos',
      teste: s => s.includes('despacho') || s.includes('conclusos'),
    },
    {
      key: 'intimacao_expedida',
      label: 'Intimações expedidas',
      teste: s => s.includes('expedida') && s.includes('intimacao'),
    },
    {
      key: 'intimacao_confirmada',
      label: 'Confirmações de intimação',
      teste: s => s.includes('confirmada') && s.includes('intimacao'),
    },
    {
      key: 'publicacao_djen',
      label: 'Publicações no DJEN',
      teste: s => s.includes('publicado no djen') || s.includes('disponibilizado no djen') || (s.includes('disponibilizado') && (s.includes('djen') || s.includes('diario'))),
    },
    {
      key: 'ato_ordinatorio',
      label: 'Atos Ordinatórios',
      teste: s => s.includes('ato ordinatorio'),
    },
    {
      key: 'certidao',
      label: 'Certidões',
      teste: s => s.includes('certidao'),
    },
    {
      key: 'peticao',
      label: 'Petições / Pareceres',
      teste: s => s.includes('peticao') || s.includes('parecer'),
    },
    {
      key: 'distribuicao',
      label: 'Distribuição',
      teste: s => s.includes('distribuido') || s.includes('distribuicao'),
    },
  ];

  const FILTROS_PADRAO = {
    categoriasOcultas: [],
    ocultarSistema:    false,
    ocultarInterno:    false,
    ocultarExterno:    false,
    dataInicio:        '',
    dataFim:           '',
    agruparIntimacoes: true,
  };

  let filtros      = { ...FILTROS_PADRAO };
  let moduloAtivo  = false;
  let observer     = null;
  let tabela       = null;
  let toolbarEl    = null;
  let scanTimer    = null;
  let aplicando    = false;

  // ─── Normalizar texto para comparação (strip acentos, lowercase) ─
  function norm(s) {
    return String(s).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // ─── Parsear linha da tabela de eventos ─────────────────────────
  function parsearLinha(tr) {
    const cells = tr.cells;
    if (!cells || cells.length < 5) return null;

    const numero = parseInt(cells[1]?.textContent?.trim(), 10);
    if (isNaN(numero)) return null;

    const dataHoraText = cells[2]?.textContent?.trim() || '';
    const labelEl      = cells[3]?.querySelector('label');
    const tipoLabel    = labelEl?.textContent?.trim() || cells[3]?.textContent?.trim() || '';
    const tipoNorm     = norm(tipoLabel);

    const usuarioText = cells[4]?.textContent?.trim() || '';
    const ehSistema   = /sistema|automatiza/i.test(usuarioText);

    const dataParte = (tr.dataset.parte || '').toUpperCase().trim();

    // Parsear "Refer. ao Evento N" / "Refer. aos Eventos N, M e P"
    const descText  = cells[3]?.textContent || '';
    const refsMatch = descText.match(/Refer\.\s+ao[s]?\s+Evento[s]?\s*[:\s]+([\d][^\n]{0,50})/i);
    const refsEventos = refsMatch
      ? (refsMatch[1].match(/\d+/g) || []).map(Number)
      : [];

    // Parsear data dd/mm/aaaa
    const dm = dataHoraText.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    const dataParsed = dm ? new Date(+dm[3], +dm[2] - 1, +dm[1]) : null;

    const cat = CATEGORIAS.find(c => c.teste(tipoNorm));
    const categoria = cat ? cat.key : 'outros';

    return { numero, dataHoraText, dataParsed, tipoLabel, tipoNorm, categoria, dataParte, ehSistema, refsEventos, tr };
  }

  function lerEventos() {
    if (!tabela) return [];
    return Array.from(tabela.querySelectorAll('tr[id^="trEvento"]'))
      .map(parsearLinha).filter(Boolean);
  }

  // ─── Detecção de cadeias de intimação ───────────────────────────
  function isExpedidaIntimacao(e) {
    return e.tipoNorm.includes('expedida') && e.tipoNorm.includes('intimacao');
  }
  function isMembroCadeia(e) {
    return (e.tipoNorm.includes('confirmada') && e.tipoNorm.includes('intimacao'))
        || e.tipoNorm.includes('publicado no djen')
        || (e.tipoNorm.includes('disponibilizado') && (e.tipoNorm.includes('djen') || e.tipoNorm.includes('diario')));
  }

  function detectarCadeias(eventos) {
    const jaEmCadeia = new Set();
    const cadeias    = [];

    eventos.forEach(ev => {
      if (!isExpedidaIntimacao(ev) || jaEmCadeia.has(ev.numero)) return;

      const membros = eventos.filter(m =>
        !jaEmCadeia.has(m.numero) &&
        m.numero !== ev.numero &&
        m.refsEventos.includes(ev.numero) &&
        isMembroCadeia(m)
      );

      if (membros.length > 0) {
        cadeias.push({ raiz: ev, membros });
        jaEmCadeia.add(ev.numero);
        membros.forEach(m => jaEmCadeia.add(m.numero));
      }
    });

    return cadeias;
  }

  // ─── Aplicar filtros (função interna, sem guard) ─────────────────
  function _aplicarFiltros() {
    const eventos = lerEventos();

    // Remover UI de cadeias anteriores
    document.querySelectorAll('.fe-cadeia-toggle-row').forEach(el => el.remove());
    eventos.forEach(ev => {
      ev.tr.classList.remove('fe-cadeia-membro', 'fe-cadeia-raiz', 'fe-cadeia-colapsado');
    });

    // Construir filtros de data
    let dataInicio = null, dataFim = null;
    if (filtros.dataInicio) {
      const [y, m, d] = filtros.dataInicio.split('-').map(Number);
      dataInicio = new Date(y, m - 1, d);
    }
    if (filtros.dataFim) {
      const [y, m, d] = filtros.dataFim.split('-').map(Number);
      dataFim = new Date(y, m - 1, d + 1); // fim inclusivo
    }

    // Aplicar filtros via classe CSS
    eventos.forEach(ev => {
      let ocultar = false;

      if (filtros.categoriasOcultas.includes(ev.categoria))                              ocultar = true;
      if (!ocultar && filtros.ocultarInterno && ev.dataParte === 'INTERNO')              ocultar = true;
      if (!ocultar && filtros.ocultarExterno && ev.dataParte !== '' && ev.dataParte !== 'INTERNO') ocultar = true;
      if (!ocultar && filtros.ocultarSistema && ev.ehSistema)                            ocultar = true;
      if (!ocultar && dataInicio && ev.dataParsed && ev.dataParsed < dataInicio)         ocultar = true;
      if (!ocultar && dataFim    && ev.dataParsed && ev.dataParsed >= dataFim)           ocultar = true;

      ev.tr.classList.toggle('fe-filtrado', ocultar);
    });

    // Agrupamento de cadeias de intimação
    if (filtros.agruparIntimacoes) {
      detectarCadeias(eventos).forEach(({ raiz, membros }) => {
        if (raiz.tr.classList.contains('fe-filtrado')) return;

        const membrosVisiveis = membros.filter(m => !m.tr.classList.contains('fe-filtrado'));
        if (membrosVisiveis.length === 0) return;

        raiz.tr.classList.add('fe-cadeia-raiz');
        membrosVisiveis.forEach(m => m.tr.classList.add('fe-cadeia-membro'));

        // Toggle row inserido ANTES da linha-raiz (que aparece por último no DOM desc.)
        raiz.tr.insertAdjacentElement('beforebegin', criarToggleCadeia(raiz, membrosVisiveis));
      });
    }

    atualizarContador(eventos);
  }

  function aplicarFiltros() {
    if (!tabela || aplicando) return;
    aplicando = true;

    if (observer) observer.disconnect();
    try {
      _aplicarFiltros();
    } finally {
      aplicando = false;
      if (observer && moduloAtivo) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    }
  }

  // ─── Construir linha-toggle da cadeia ───────────────────────────
  function criarToggleCadeia(raiz, membros) {
    const membrosTr = membros.map(m => m.tr);
    const n = membrosTr.length;

    const tr = document.createElement('tr');
    tr.className = 'fe-cadeia-toggle-row';
    tr.dataset.feRaiz = raiz.numero;

    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'fe-cadeia-toggle-cell';

    const btn = document.createElement('button');
    btn.className = 'fe-cadeia-btn';
    btn.setAttribute('aria-expanded', 'true');

    const renderLabel = (expandido) =>
      expandido
        ? `Cadeia de intimação — ocultar ${n} etapa${n !== 1 ? 's' : ''}`
        : `Cadeia de intimação — mostrar ${n} etapa${n !== 1 ? 's' : ''}`;

    btn.innerHTML = `
      <svg class="fe-cadeia-btn__icon" viewBox="0 0 16 16" fill="none" width="11" height="11" aria-hidden="true">
        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="fe-cadeia-btn__label">${renderLabel(true)}</span>
    `;

    btn.addEventListener('click', () => {
      const expandido = btn.getAttribute('aria-expanded') === 'true';
      const novoEstado = !expandido;
      btn.setAttribute('aria-expanded', String(novoEstado));
      btn.querySelector('.fe-cadeia-btn__icon').style.transform = novoEstado ? '' : 'rotate(-90deg)';
      btn.querySelector('.fe-cadeia-btn__label').textContent = renderLabel(novoEstado);
      membrosTr.forEach(mTr => mTr.classList.toggle('fe-cadeia-colapsado', !novoEstado));
    });

    td.appendChild(btn);
    tr.appendChild(td);
    return tr;
  }

  function atualizarContador(eventos) {
    const el = document.getElementById('fe-contador');
    if (!el) return;
    const total   = eventos.length;
    const ocultos = eventos.filter(e => e.tr.classList.contains('fe-filtrado')).length;
    const visiveis = total - ocultos;
    el.textContent = visiveis === total
      ? `${total} evento${total !== 1 ? 's' : ''}`
      : `${visiveis} de ${total} evento${total !== 1 ? 's' : ''}`;
  }

  // ─── Injetar toolbar ─────────────────────────────────────────────
  function injetarToolbar() {
    const tbl = document.querySelector('#tblEventos');
    if (!tbl) return;
    tabela = tbl;

    if (document.getElementById('fe-toolbar')) {
      toolbarEl = document.getElementById('fe-toolbar');
      aplicarFiltros();
      return;
    }

    toolbarEl = document.createElement('div');
    toolbarEl.id = 'fe-toolbar';
    toolbarEl.className = 'fe-toolbar';

    const catsHtml = CATEGORIAS.map(cat =>
      `<label class="fe-check"><input type="checkbox" data-cat="${cat.key}"> ${cat.label}</label>`
    ).join('');

    toolbarEl.innerHTML = `
      <div class="fe-toolbar__header">
        <button class="fe-toolbar__toggle" aria-expanded="false" aria-controls="fe-body"
                title="Expandir/recolher +Filtros de Eventos">
          <svg viewBox="0 0 16 16" fill="none" width="12" height="12" aria-hidden="true">
            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="fe-toolbar__title">+Filtros de Eventos</span>
        </button>
        <span class="fe-toolbar__spacer"></span>
        <span class="fe-contador" id="fe-contador"></span>
        <svg class="fe-toolbar__chevron" viewBox="0 0 16 16" fill="none" width="12" height="12" aria-hidden="true">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="fe-toolbar__body" id="fe-body" hidden>
        <div class="fe-section">
          <span class="fe-section__label">Ocultar categorias</span>
          <div class="fe-checkboxes fe-checkboxes--grid">${catsHtml}</div>
        </div>
        <div class="fe-section">
          <span class="fe-section__label">Origem &amp; autoria</span>
          <div class="fe-checkboxes">
            <label class="fe-check"><input type="checkbox" id="fe-ocultar-interno"> Ocultar eventos internos</label>
            <label class="fe-check"><input type="checkbox" id="fe-ocultar-externo"> Ocultar eventos externos (partes/MP)</label>
            <label class="fe-check"><input type="checkbox" id="fe-ocultar-sistema"> Ocultar gerados pelo sistema</label>
          </div>
        </div>
        <div class="fe-section">
          <span class="fe-section__label">Período</span>
          <div class="fe-date-range">
            <label class="fe-date-label">De <input type="date" id="fe-data-inicio" class="fe-date-input"></label>
            <label class="fe-date-label">Até <input type="date" id="fe-data-fim" class="fe-date-input"></label>
          </div>
        </div>
        <div class="fe-section">
          <span class="fe-section__label">Agrupamento</span>
          <div class="fe-checkboxes">
            <label class="fe-check"><input type="checkbox" id="fe-agrupar-intimacoes"> Agrupar cadeia de intimação</label>
          </div>
        </div>
        <div class="fe-toolbar__footer">
          <button class="fe-btn-reset" id="fe-reset">↺ Limpar filtros</button>
        </div>
      </div>
    `;

    // Toggle expand / recolher
    const toggleBtn = toolbarEl.querySelector('.fe-toolbar__toggle');
    const bodyEl    = toolbarEl.querySelector('#fe-body');
    const chevron   = toolbarEl.querySelector('.fe-toolbar__chevron');

    toggleBtn.addEventListener('click', () => {
      const aberto = bodyEl.hidden;
      bodyEl.hidden = !aberto;
      toggleBtn.setAttribute('aria-expanded', String(aberto));
      chevron.style.transform = aberto ? 'rotate(180deg)' : '';
    });

    // Checkboxes de categoria
    toolbarEl.querySelectorAll('[data-cat]').forEach(input => {
      input.addEventListener('change', () => {
        const k = input.dataset.cat;
        if (input.checked) {
          if (!filtros.categoriasOcultas.includes(k)) filtros.categoriasOcultas.push(k);
        } else {
          filtros.categoriasOcultas = filtros.categoriasOcultas.filter(x => x !== k);
        }
        salvarEAplicar();
      });
    });

    // Checkboxes simples
    [
      ['fe-ocultar-interno',    'ocultarInterno'],
      ['fe-ocultar-externo',    'ocultarExterno'],
      ['fe-ocultar-sistema',    'ocultarSistema'],
      ['fe-agrupar-intimacoes', 'agruparIntimacoes'],
    ].forEach(([id, campo]) => {
      const el = toolbarEl.querySelector(`#${id}`);
      if (el) el.addEventListener('change', () => { filtros[campo] = el.checked; salvarEAplicar(); });
    });

    // Inputs de data
    toolbarEl.querySelector('#fe-data-inicio').addEventListener('change', e => {
      filtros.dataInicio = e.target.value;
      salvarEAplicar();
    });
    toolbarEl.querySelector('#fe-data-fim').addEventListener('change', e => {
      filtros.dataFim = e.target.value;
      salvarEAplicar();
    });

    // Reset
    toolbarEl.querySelector('#fe-reset').addEventListener('click', () => {
      filtros = { ...FILTROS_PADRAO };
      sincronizarUI();
      salvarEAplicar();
    });

    sincronizarUI();
    tabela.insertAdjacentElement('beforebegin', toolbarEl);
    aplicarFiltros();
  }

  function sincronizarUI() {
    if (!toolbarEl) return;

    toolbarEl.querySelectorAll('[data-cat]').forEach(input => {
      input.checked = filtros.categoriasOcultas.includes(input.dataset.cat);
    });
    [
      ['fe-ocultar-interno',    'ocultarInterno'],
      ['fe-ocultar-externo',    'ocultarExterno'],
      ['fe-ocultar-sistema',    'ocultarSistema'],
      ['fe-agrupar-intimacoes', 'agruparIntimacoes'],
    ].forEach(([id, campo]) => {
      const el = toolbarEl.querySelector(`#${id}`);
      if (el) el.checked = !!filtros[campo];
    });

    const di = toolbarEl.querySelector('#fe-data-inicio');
    const df = toolbarEl.querySelector('#fe-data-fim');
    if (di) di.value = filtros.dataInicio || '';
    if (df) df.value = filtros.dataFim    || '';
  }

  function salvarEAplicar() {
    chrome.storage.local.set({ [STORAGE_KEY]: filtros });
    aplicarFiltros();
  }

  // ─── Limpeza ─────────────────────────────────────────────────────
  function limpar() {
    if (toolbarEl) { toolbarEl.remove(); toolbarEl = null; }
    document.querySelectorAll('.fe-cadeia-toggle-row').forEach(el => el.remove());
    document.querySelectorAll('tr[id^="trEvento"]').forEach(tr => {
      tr.classList.remove('fe-filtrado', 'fe-cadeia-membro', 'fe-cadeia-raiz', 'fe-cadeia-colapsado');
    });
    tabela = null;
  }

  // ─── Ciclo de vida ───────────────────────────────────────────────
  function escanearDebounced() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      scanTimer = null;
      if (!document.querySelector('#tblEventos')) return;
      if (!toolbarEl || !document.contains(toolbarEl)) {
        toolbarEl = null;
        tabela    = null;
        injetarToolbar();
      } else {
        aplicarFiltros();
      }
    }, 200);
  }

  function ativarModulo() {
    if (moduloAtivo) return;
    moduloAtivo = true;

    chrome.storage.local.get(STORAGE_KEY, (data) => {
      if (data[STORAGE_KEY]) filtros = { ...FILTROS_PADRAO, ...data[STORAGE_KEY] };

      injetarToolbar();

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

  // ─── Reagir a mudanças nas configurações ────────────────────────
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[SETTINGS_KEY]) {
      const enabled = changes[SETTINGS_KEY].newValue?.modules?.[MODULE_NAME]?.enabled ?? true;
      if (enabled  && !moduloAtivo) ativarModulo();
      if (!enabled &&  moduloAtivo) desativarModulo();
    }
  });

  // ─── Inicialização condicional ───────────────────────────────────
  chrome.storage.local.get(SETTINGS_KEY, (data) => {
    const enabled = data[SETTINGS_KEY]?.modules?.[MODULE_NAME]?.enabled ?? true;
    if (enabled) ativarModulo();
  });

})();
