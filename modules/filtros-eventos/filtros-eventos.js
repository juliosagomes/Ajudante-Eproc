// modules/filtros-eventos/filtros-eventos.js — Módulo +Filtros de Eventos

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  const SETTINGS_KEY = 'eprocSettings';
  const STORAGE_KEY  = 'eprocFiltrosEventos';
  const POLOS_KEY    = 'eprocFiltrosEventosPolos';
  const MODULE_NAME  = 'filtrosEventos';

  // ─── Configuração de cores dos polos ────────────────────────────
  // Editável pelo usuário via página de opções (painel +Filtros de Eventos).
  // presets: cores das 4 categorias built-in
  // customizados: regras adicionais com termos (substring, normalizado) → cor
  const POLOS_CFG_PADRAO = {
    presets: {
      ativo:   '#1e8a3c',
      passivo: '#c0382b',
      mp:      '#6f42c1',
      outro:   '#000000',
    },
    customizados: [],
  };
  let polosCfg = JSON.parse(JSON.stringify(POLOS_CFG_PADRAO));

  // ─── Categorias de evento ────────────────────────────────────────
  // teste(tipoNorm, descNorm, parsed) — cada categoria escolhe o que olhar:
  //   tipoNorm = texto do <label class="infraEventoDescricao"> normalizado
  //   descNorm = textContent inteiro de cells[3] normalizado (inclui sufixo fora do label)
  //   parsed   = objeto retornado por parsearLinha (ehComplementar, eventoComplementadoNum, etc.)
  const CATEGORIAS = [
    {
      key: 'intimacao_expedida',
      label: 'Intimações expedidas',
      teste: (tipoNorm) => tipoNorm.includes('expedida') && tipoNorm.includes('intimacao'),
    },
    {
      key: 'intimacao_confirmada',
      label: 'Confirmações de intimação',
      teste: (tipoNorm) => tipoNorm.includes('confirmada') && tipoNorm.includes('intimacao'),
    },
    {
      key: 'publicacao_djen',
      label: 'Publicações no DJEN',
      teste: (tipoNorm) => tipoNorm.includes('publicado no djen')
        || tipoNorm.includes('disponibilizado no djen')
        || (tipoNorm.includes('disponibilizado') && (tipoNorm.includes('djen') || tipoNorm.includes('diario'))),
    },
    {
      key: 'complementar',
      label: 'Complementares a evento',
      // O sufixo "Complementar ao evento nº N" fica FORA do <label> (texto irmão na <td>),
      // então precisa ser detectado contra a descrição inteira da célula, não só tipoNorm.
      teste: (_tipoNorm, _descNorm, parsed) => !!parsed?.ehComplementar,
    },
  ];

  // ─── Padrões de etapa de cadeia de intimação ────────────────────
  // Tudo que casar é uma ETAPA (step), não uma raiz decisória.
  const STEP_PATTERNS = [
    /^Expedida\/certificada a intima/i,
    /^Confirmada a intima/i,
    /^Disponibilizado no DJEN/i,
    /^Disponibilizado no Di[áa]rio Eletr[ôo]nico/i,
    /^Publicado no DJEN/i,
    /^Publicado no Di[áa]rio Eletr[ôo]nico/i,
    /^Decorrido o prazo/i,
    /^Certid[ãa]o de decurso de prazo/i,
  ];

  const FILTROS_PADRAO = {
    categoriasOcultas: [],
    ocultarSistema:    false,
    ocultarInterno:    false,
    ocultarExterno:    false,
    dataInicio:        '',
    dataFim:           '',
    agruparIntimacoes: true,
    colapsarIntimacoes: false,
  };

  let filtros      = { ...FILTROS_PADRAO };
  let moduloAtivo  = false;
  let observer     = null;
  let tabela       = null;
  let toolbarEl    = null;
  let scanTimer    = null;
  let aplicando    = false;
  // Persiste estado de colapso (rootNum → true=colapsado) entre re-renders do agrupador
  const estadoCadeias = new Map();

  // ─── Normalizar texto para comparação (strip acentos, lowercase) ─
  function norm(s) {
    return String(s).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // ─── Extrair descrição estruturada da cell[3] ───────────────────
  // Em eventos complementares o template do Eproc renderiza:
  //   <label class="infraEventoDescricao">Proferido despacho ...</label> - Complementar ao evento nº 20
  // ou seja, " - Complementar ao evento nº N" é nó-texto IRMÃO do <label>.
  // Esta função expõe tanto o texto de dentro do label (tipoLabel) quanto
  // o texto fora dele (sufixoComplemento) e a descrição completa da célula.
  function extrairDescricao(td) {
    if (!td) return { descCompleta: '', descNorm: '', tipoLabel: '', tipoNorm: '',
                      sufixoComplemento: '', ehComplementar: false, eventoComplementadoNum: null };

    const labelEl   = td.querySelector('label');
    const tipoLabel = (labelEl?.textContent || '').replace(/\s+/g, ' ').trim();
    const tipoNorm  = norm(tipoLabel);

    const descCompleta = (td.textContent || '').replace(/\s+/g, ' ').trim();
    const descNorm     = norm(descCompleta);

    // Concatenar texto dos nós irmãos do <label> na <td> (texto fora do label).
    let sufixoParts = [];
    if (labelEl) {
      for (const node of td.childNodes) {
        if (node === labelEl) continue;
        const t = node.textContent;
        if (t) sufixoParts.push(t);
      }
    }
    const sufixoComplemento = sufixoParts.join(' ').replace(/\s+/g, ' ')
      .replace(/^[\s\-–—]+/, '').trim();

    const ehComplementar = descNorm.includes('complementar ao evento');
    let eventoComplementadoNum = null;
    if (ehComplementar) {
      const m = /complementar\s+ao\s+evento\s+n[º°o]?\.?\s*(\d+)/i.exec(descCompleta);
      if (m) eventoComplementadoNum = Number(m[1]);
    }

    return { descCompleta, descNorm, tipoLabel, tipoNorm, sufixoComplemento,
             ehComplementar, eventoComplementadoNum };
  }

  // ─── Parsear linha da tabela de eventos ─────────────────────────
  function parsearLinha(tr) {
    const cells = tr.cells;
    if (!cells || cells.length < 5) return null;

    const numero = parseInt(cells[1]?.textContent?.trim(), 10);
    if (isNaN(numero)) return null;

    const dataHoraText = cells[2]?.textContent?.trim() || '';
    const desc = extrairDescricao(cells[3]);
    const { descCompleta, descNorm, tipoLabel, tipoNorm,
            sufixoComplemento, ehComplementar, eventoComplementadoNum } = desc;

    const usuarioText = cells[4]?.textContent?.trim() || '';
    const ehSistema   = /sistema|automatiza/i.test(usuarioText);

    const dataParte = (tr.dataset.parte || '').toUpperCase().trim();

    // Parsear "Refer. ao(s) Evento(s): N, M e P" — usa descCompleta da célula
    const refsMatch = /Refer\.\s*ao(?:s)?\s*Evento(?:s)?\s*:?\s*([0-9 ,e]+)/i.exec(descCompleta);
    const refsEventos = refsMatch
      ? refsMatch[1].split(/[ ,e]+/).filter(Boolean).map(Number)
      : [];

    // Parsear data dd/mm/aaaa
    const dm = dataHoraText.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    const dataParsed = dm ? new Date(+dm[3], +dm[2] - 1, +dm[1]) : null;

    const parsedBase = {
      numero, dataHoraText, dataParsed, tipoLabel, tipoNorm,
      descCompleta, descNorm, sufixoComplemento,
      ehComplementar, eventoComplementadoNum,
      dataParte, ehSistema, refsEventos, tr,
    };

    const cat = CATEGORIAS.find(c => c.teste(tipoNorm, descNorm, parsedBase));
    parsedBase.categoria = cat ? cat.key : 'outros';

    return parsedBase;
  }

  function lerEventos() {
    if (!tabela) return [];
    return Array.from(tabela.querySelectorAll('tr[id^="trEvento"]'))
      .map(parsearLinha).filter(Boolean);
  }

  // ─── Detecção e agrupamento de cadeias de intimação ────────────

  // Indexar todos os eventos da tabela pelo número (id + label + refs + isStep).
  // Independente de parsearLinha para usar o mesmo índice na resolução de raiz.
  function indexarEventos() {
    const idx = new Map();
    if (!tabela) return idx;
    for (const tr of tabela.querySelectorAll('tr[id^="trEvento"]')) {
      const m = /^trEvento(\d+)$/.exec(tr.id);
      if (!m) continue;
      const numero = Number(m[1]);
      const d = extrairDescricao(tr.cells[3]);
      // label = texto do <label> (cai para descCompleta se não houver label)
      const label = d.tipoLabel || d.descCompleta;
      const rm    = /Refer\.\s*ao(?:s)?\s*Evento(?:s)?\s*:?\s*([0-9 ,e]+)/i.exec(d.descCompleta);
      const refs  = rm ? rm[1].split(/[ ,e]+/).filter(Boolean).map(Number) : [];
      idx.set(numero, {
        numero, tr, label, refs,
        isStep: STEP_PATTERNS.some(re => re.test(label)),
        ehComplementar: d.ehComplementar,
        eventoComplementadoNum: d.eventoComplementadoNum,
      });
    }
    return idx;
  }

  // Subir pelos refs enquanto o candidato for step — para no ato decisório original.
  function rootOf(num, idx, seen = new Set()) {
    if (seen.has(num)) return num;               // proteção contra ciclos
    seen.add(num);
    const ev = idx.get(num);
    if (!ev || !ev.isStep || ev.refs.length === 0) return num;
    // Usar o primeiro ref que exista no índice; se nenhum, usar o primeiro mesmo assim
    const candidate = ev.refs.find(n => idx.has(n)) ?? ev.refs[0];
    return rootOf(candidate, idx, seen);
  }

  // Agrupar todos os steps por raiz → Map<rootNum, { rootLabel, rootInIdx, rootTr, members[] }>
  function construirGrupos(idx) {
    const grupos = new Map();
    for (const ev of idx.values()) {
      if (!ev.isStep) continue;
      const rootNum = rootOf(ev.numero, idx);
      const rootEv  = idx.get(rootNum);
      if (!grupos.has(rootNum)) {
        grupos.set(rootNum, {
          rootNum,
          rootLabel: rootEv?.label || `Evento ${rootNum}`,
          rootInIdx: !!rootEv,
          rootTr:    rootEv?.tr || null,
          members:   [],
        });
      }
      grupos.get(rootNum).members.push(ev);
    }
    return grupos;
  }

  // ─── Polos destinatários da cadeia (a partir das etapas "Expedida/certificada") ──
  // Usa o texto visível de <span class="infraEventoPrazoParte"> (REQUERENTE,
  // REQUERIDO, MINISTÉRIO PÚBLICO, etc.), normalizado a maiúsculas. Dedup por
  // primeira aparição.
  function extrairPolosDaCadeia(membros) {
    const vistos = new Set();
    const ordem  = [];
    for (const m of membros) {
      const td = m.tr?.cells?.[3];
      if (!td) continue;
      const spans = td.querySelectorAll('span.infraEventoPrazoParte');
      for (const sp of spans) {
        const polo = (sp.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase();
        if (!polo) continue;
        if (!vistos.has(polo)) { vistos.add(polo); ordem.push(polo); }
      }
    }
    return ordem;
  }

  // Categoria built-in do polo (sem considerar regras customizadas do usuário).
  function categoriaPolo(polo) {
    const p = norm(polo);
    if (p.includes('requerente') || p.includes('autor') || p.includes('exequente') ||
        p.includes('embargante') || p.includes('agravante') || p.includes('apelante') ||
        p.includes('impetrante') || p.includes('reclamante')) return 'ativo';
    if (p.includes('requerido') || p.includes('reu') || p.includes('executado') ||
        p.includes('embargado') || p.includes('agravado') || p.includes('apelado') ||
        p.includes('impetrado') || p.includes('reclamado')) return 'passivo';
    if (p.includes('ministerio publico') || p === 'mp' || p.startsWith('mp ') ||
        p.includes('promotor') || p.includes('procurador da republica')) return 'mp';
    return 'outro';
  }

  function classePolo(polo) {
    return 'fe-polo--' + categoriaPolo(polo);
  }

  // Cor efetiva: regras customizadas têm prioridade; depois, preset built-in
  // (sobrescrito pelo usuário se polosCfg.presets[cat] existir).
  function corDoPolo(polo) {
    const p = norm(polo);
    for (const c of polosCfg.customizados || []) {
      const termos = c?.termos || [];
      for (const termo of termos) {
        if (termo && p.includes(norm(termo))) return c.cor || null;
      }
    }
    const cat = categoriaPolo(polo);
    return polosCfg.presets?.[cat] || POLOS_CFG_PADRAO.presets[cat] || null;
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderPolosHtml(polos) {
    if (!polos || polos.length === 0) return '';
    return polos
      .map(p => {
        const cor       = corDoPolo(p);
        const styleAttr = cor ? ` style="color:${escHtml(cor)}"` : '';
        return `<span class="fe-polo ${classePolo(p)}"${styleAttr}>${escHtml(p)}</span>`;
      })
      .join(', ');
  }

  // Marcar DOM e inserir linha-toggle ACIMA do primeiro membro (menor rowIndex).
  //
  // INVARIANT: apenas STEPS (eventos cuja label casa STEP_PATTERNS) recebem a classe
  // .fe-cadeia-membro e o atributo data-fe-cadeia-root. Eventos não-step que estiverem
  // fisicamente intercalados entre dois steps na tabela (ex.: petição do advogado entre
  // "Expedida a intimação" e "Confirmada a intimação") NÃO são marcados aqui — só os
  // membros de g.members é que são, e g.members vem de construirGrupos, que filtra por
  // isStep. Como o handler de toggle só altera display de tr.fe-cadeia-membro, eventos
  // intercalados ficam imunes ao colapso/expansão da cadeia, mantendo posição e
  // visibilidade originais. O contador de etapas (membrosVisiveis.length) também conta
  // somente steps, então petições intercaladas não inflam o "N etapas" do botão.
  function aplicarGrupos(grupos) {
    for (const [rootNum, g] of grupos) {
      const membrosVisiveis = g.members.filter(m => !m.tr.classList.contains('fe-filtrado'));
      if (membrosVisiveis.length === 0) continue;

      membrosVisiveis.forEach(m => {
        m.tr.classList.add('fe-cadeia-membro');
        m.tr.dataset.feCadeiaRoot = String(rootNum);
      });

      if (g.rootInIdx && g.rootTr && !g.rootTr.classList.contains('fe-filtrado')) {
        g.rootTr.classList.add('fe-cadeia-raiz');
        // data-fe-cadeia-root-self (distinto de data-fe-cadeia-root) garante que a raiz
        // nunca caia no seletor tr.fe-cadeia-membro[data-fe-cadeia-root="N"] do toggle
        g.rootTr.dataset.feCadeiaRootSelf = String(rootNum);
      }

      // Preservar estado de colapso entre re-renders
      const estaColapsado = estadoCadeias.has(rootNum)
        ? estadoCadeias.get(rootNum) === true
        : !!filtros.colapsarIntimacoes;
      if (estaColapsado) {
        membrosVisiveis.forEach(m => { m.tr.style.display = 'none'; });
      }

      const sorted = membrosVisiveis.map(m => m.tr).sort((a, b) => a.rowIndex - b.rowIndex);
      const primeiroMembro = sorted[0];
      const polos = extrairPolosDaCadeia(membrosVisiveis);
      const toggleRow = criarToggleCadeia(rootNum, g.rootInIdx, membrosVisiveis.length, estaColapsado, polos);
      primeiroMembro.parentNode.insertBefore(toggleRow, primeiroMembro);
    }
  }

  // ─── Aplicar filtros (função interna, sem guard) ─────────────────
  function _aplicarFiltros() {
    const eventos = lerEventos();

    // Remover UI de cadeias anteriores — incluindo style.display inline do colapso
    document.querySelectorAll('.fe-cadeia-toggle-row').forEach(el => el.remove());
    if (tabela) {
      tabela.querySelectorAll('[data-fe-cadeia-root], [data-fe-cadeia-root-self]').forEach(tr => {
        tr.classList.remove('fe-cadeia-membro', 'fe-cadeia-raiz');
        tr.style.removeProperty('display');
        delete tr.dataset.feCadeiaRoot;
        delete tr.dataset.feCadeiaRootSelf;
      });
    }

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
      aplicarGrupos(construirGrupos(indexarEventos()));
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
  // rootInIdx: se false, raiz não está na página (paginação/filtro nativo)
  // inicialmenteColapsado: restaura estado salvo em estadoCadeias
  function criarToggleCadeia(rootNum, rootInIdx, count, inicialmenteColapsado, polos) {
    const tr = document.createElement('tr');
    tr.className = 'fe-cadeia-toggle-row';
    tr.dataset.feCadeiaToggle = String(rootNum);

    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'fe-cadeia-toggle-cell';

    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'fe-cadeia-btn';
    btn.setAttribute('aria-expanded', String(!inicialmenteColapsado));

    const prefixo = rootInIdx
      ? `Cadeia de intimação (ato: ${rootNum})`
      : `Etapas de intimação`;
    const etapas    = count === 1 ? '1 etapa' : `${count} etapas`;
    const polosHtml = renderPolosHtml(polos);

    // Quando colapsado: mostra polos ao lado de "exibir N etapas".
    // Quando expandido: omitimos polos (a info já está visível nas linhas).
    const renderLabelHtml = (expandido) => {
      if (expandido) return `${escHtml(prefixo)} — ocultar ${escHtml(etapas)}`;
      return polosHtml
        ? `${escHtml(prefixo)} — exibir ${escHtml(etapas)} · ${polosHtml}`
        : `${escHtml(prefixo)} — exibir ${escHtml(etapas)}`;
    };

    btn.innerHTML = `
      <svg class="fe-cadeia-btn__icon" viewBox="0 0 16 16" fill="none" width="11" height="11" aria-hidden="true">
        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="fe-cadeia-btn__label">${renderLabelHtml(!inicialmenteColapsado)}</span>
    `;
    if (inicialmenteColapsado) {
      btn.querySelector('.fe-cadeia-btn__icon').style.transform = 'rotate(-90deg)';
    }

    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const btnEl     = ev.currentTarget;
      const expandido = btnEl.getAttribute('aria-expanded') === 'true';
      const novoEstado = !expandido;
      btnEl.setAttribute('aria-expanded', String(novoEstado));
      btnEl.querySelector('.fe-cadeia-btn__icon').style.transform = novoEstado ? '' : 'rotate(-90deg)';
      // innerHTML aqui é seguro: prefixo/etapas vêm de constantes do módulo
      // (escapadas por escHtml) e polosHtml é montado com texto escapado +
      // classes CSS fixas (fe-polo--ativo|passivo|mp|outro). Cores customizadas
      // entram via style="color:#xxx" — o valor também passa por escHtml.
      btnEl.querySelector('.fe-cadeia-btn__label').innerHTML = renderLabelHtml(novoEstado);
      estadoCadeias.set(rootNum, !novoEstado);

      const tbl = tr.closest('table') || tabela;
      if (tbl) {
        // Seletor restrito a tr.fe-cadeia-membro: só alcança steps da cadeia.
        // Eventos não-step intercalados não têm essa classe e portanto preservam
        // seu display original ao colapsar/expandir.
        tbl.querySelectorAll(`tr.fe-cadeia-membro[data-fe-cadeia-root="${CSS.escape(String(rootNum))}"]`)
          .forEach(mTr => { mTr.style.display = novoEstado ? '' : 'none'; });
      }
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
        <button type="button" class="fe-toolbar__toggle" aria-expanded="false" aria-controls="fe-body"
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
            <label class="fe-check"><input type="checkbox" id="fe-colapsar-intimacoes"> Retrair cadeias por padrão</label>
          </div>
        </div>
        <div class="fe-toolbar__footer">
          <button type="button" class="fe-btn-reset" id="fe-reset">↺ Limpar filtros</button>
        </div>
      </div>
    `;

    // Toggle expand / recolher
    const toggleBtn = toolbarEl.querySelector('.fe-toolbar__toggle');
    const bodyEl    = toolbarEl.querySelector('#fe-body');
    const chevron   = toolbarEl.querySelector('.fe-toolbar__chevron');

    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
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
      ['fe-colapsar-intimacoes', 'colapsarIntimacoes'],
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
    toolbarEl.querySelector('#fe-reset').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      filtros = { ...FILTROS_PADRAO };
      sincronizarUI();
      salvarEAplicar();
    });

    // Suprimir Enter em inputs do toolbar — inputs type=date/text dentro de <form>
    // acionariam submit ao pressionar Enter
    toolbarEl.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); }
      });
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
      ['fe-colapsar-intimacoes', 'colapsarIntimacoes'],
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
      tr.classList.remove('fe-filtrado', 'fe-cadeia-membro', 'fe-cadeia-raiz');
      tr.style.removeProperty('display');
      delete tr.dataset.feCadeiaRoot;
      delete tr.dataset.feCadeiaRootSelf;
    });
    estadoCadeias.clear();
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

    chrome.storage.local.get([STORAGE_KEY, POLOS_KEY], (data) => {
      if (data[STORAGE_KEY]) filtros = { ...FILTROS_PADRAO, ...data[STORAGE_KEY] };
      if (data[POLOS_KEY])   polosCfg = mesclarPolosCfg(data[POLOS_KEY]);

      injetarToolbar();

      observer = new MutationObserver(escanearDebounced);
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Mescla config persistida com defaults (resiliente a chaves faltantes).
  function mesclarPolosCfg(raw) {
    const out = JSON.parse(JSON.stringify(POLOS_CFG_PADRAO));
    if (raw && typeof raw === 'object') {
      if (raw.presets && typeof raw.presets === 'object') {
        for (const k of Object.keys(out.presets)) {
          if (typeof raw.presets[k] === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.presets[k])) {
            out.presets[k] = raw.presets[k];
          }
        }
      }
      if (Array.isArray(raw.customizados)) {
        out.customizados = raw.customizados
          .filter(c => c && typeof c === 'object' && Array.isArray(c.termos))
          .map(c => ({
            id:     String(c.id || ''),
            nome:   String(c.nome || ''),
            termos: c.termos.map(String),
            cor:    /^#[0-9a-fA-F]{6}$/.test(c.cor || '') ? c.cor : '#000000',
          }));
      }
    }
    return out;
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
    if (changes[POLOS_KEY]) {
      polosCfg = mesclarPolosCfg(changes[POLOS_KEY].newValue);
      if (moduloAtivo) aplicarFiltros();
    }
  });

  // ─── Inicialização condicional ───────────────────────────────────
  chrome.storage.local.get(SETTINGS_KEY, (data) => {
    const enabled = data[SETTINGS_KEY]?.modules?.[MODULE_NAME]?.enabled ?? true;
    if (enabled) ativarModulo();
  });

})();
