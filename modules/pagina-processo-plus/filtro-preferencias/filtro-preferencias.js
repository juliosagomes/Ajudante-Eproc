// modules/pagina-processo-plus/filtro-preferencias/filtro-preferencias.js
// Sub-recurso do módulo "Capa de Processo+".
// Adiciona barra de busca em cima das três listas de preferências da capa
// do processo (Minutas, Movimentação, Intimação) com:
//   • realce do termo digitado;
//   • captura de teclado opcional (botão atalho);
//   • Filtros Favoritos — chips clicáveis abaixo do campo para reaplicar
//     buscas frequentes sem redigitar.

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  const SETTINGS_KEY  = 'eprocSettings';
  const FAVORITOS_KEY = 'eprocFiltroFavoritos';
  const MODULE_NAME   = 'paginaProcessoPlus';
  const SUB_FEATURE   = 'filtrarPreferencias';
  const SUB_ATALHO    = 'filtrarPreferenciasAtalhoAtivo';

  // ── Configuração de cada um dos três tipos ───────────────────────
  const TIPOS = {
    minuta: {
      idContainer:    'ae-fp-minutas',
      idsListas:      ['preferencia-minuta-individual', 'preferencia-minuta-unidade', 'preferencia-minuta-ocultas'],
      idsHospedeiros: ['divMinPref'],
      placeholder:    'Digite para filtrar as preferências de Minutas...',
      mensagemVazio:  'Nenhuma preferência de minuta encontrada. Pressione ESC para cancelar o filtro.',
    },
    movimentacao: {
      idContainer:    'ae-fp-movimentacoes',
      idsListas:      ['preferencia-movimentacao-individual', 'preferencia-movimentacao-unidade', 'preferencia-movimentacao-ocultas'],
      idsHospedeiros: ['div-preferencia-movimentacao'],
      hospedeiroUsaFieldset: true,
      placeholder:    'Digite para filtrar as preferências de Movimentações...',
      mensagemVazio:  'Nenhuma preferência de movimentação encontrada. Pressione ESC para cancelar o filtro.',
    },
    intimacao: {
      idContainer:    'ae-fp-intimacoes',
      idsListas:      ['preferencia-intimacao-individual', 'preferencia-intimacao-unidade', 'preferencia-intimacao-ocultas'],
      idsHospedeiros: ['div-preferencia-intimacao'],
      hospedeiroUsaFieldset: true,
      placeholder:    'Digite para filtrar as preferências de Intimações...',
      mensagemVazio:  'Nenhuma preferência de intimação encontrada. Pressione ESC para cancelar o filtro.',
    },
  };

  let scriptAtivo  = false;
  let observer     = null;
  let escListener  = null;
  let keyListener  = null;
  let atalhoAtivo  = null; // 'minuta' | 'movimentacao' | 'intimacao' | null
  // { minuta: ['…','…'], movimentacao: [...], intimacao: [...] }
  let favoritos    = { minuta: [], movimentacao: [], intimacao: [] };

  // ── Utilitários de texto ─────────────────────────────────────────
  function normalizar(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }

  function criarRegexAcentos(termo) {
    const escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const padrao = escapado
      .replace(/a/g, '[aáàâãäAÁÀÂÃÄ]')
      .replace(/e/g, '[eéèêëEÉÈÊË]')
      .replace(/i/g, '[iíìîïIÍÌÎÏ]')
      .replace(/o/g, '[oóòôõöOÓÒÔÕÖ]')
      .replace(/u/g, '[uúùûüUÚÙÛÜ]')
      .replace(/c/g, '[cçCÇ]')
      .replace(/n/g, '[nñNÑ]');
    return new RegExp(padrao, 'gi');
  }

  function removerHighlights(elemento) {
    const marcados = elemento.querySelectorAll('.ae-fp-highlight');
    marcados.forEach((m) => {
      const pai = m.parentNode;
      pai.replaceChild(document.createTextNode(m.textContent), m);
      pai.normalize();
    });
  }

  function destacarTexto(elemento, textoBusca) {
    if (!textoBusca || textoBusca.length < 3) {
      removerHighlights(elemento);
      return;
    }

    removerHighlights(elemento);

    const textoOriginal = elemento.textContent;
    if (!textoOriginal) return;

    const termos = textoBusca.toLowerCase().trim().split(/\s+/).filter((t) => t.length >= 3);
    if (termos.length === 0) return;

    let novoHTML = textoOriginal;
    termos.forEach((termo) => {
      const regex = criarRegexAcentos(termo);
      novoHTML = novoHTML.replace(regex, '<span class="ae-fp-highlight">$&</span>');
    });

    if (novoHTML !== textoOriginal) {
      elemento.innerHTML = novoHTML;
    }
  }

  // ── Filtragem ─────────────────────────────────────────────────────
  function filtrar(tipo, textoFiltro) {
    const cfg = TIPOS[tipo];
    const textoNorm = normalizar(textoFiltro);

    let totalVisiveis = 0;

    cfg.idsListas.forEach((idLista) => {
      const div = document.getElementById(idLista);
      if (!div) return;

      let links = div.querySelectorAll('a.content-link.text-primary');
      if (links.length === 0) {
        links = div.querySelectorAll('a.content-link');
      }

      links.forEach((link) => {
        const item = link.closest('li');
        if (!item) return;

        const textoLink = normalizar(link.textContent);
        const casa = textoNorm === '' || textoLink.includes(textoNorm);

        if (casa) {
          item.style.display = '';
          item.style.opacity = '1';
          totalVisiveis++;
          if (textoFiltro && textoFiltro.length >= 3) {
            destacarTexto(link, textoFiltro);
          } else {
            destacarTexto(link, '');
          }
        } else {
          item.style.display = 'none';
          item.style.opacity = '0.3';
          destacarTexto(link, '');
        }
      });
    });

    // Mensagem "vazio"
    const containerFiltro = document.getElementById(cfg.idContainer);
    const msgExistente = containerFiltro?.parentNode?.querySelector(`.ae-fp-msg-vazio[data-tipo="${tipo}"]`);
    if (msgExistente) msgExistente.remove();

    if (textoNorm !== '' && totalVisiveis === 0 && containerFiltro?.parentNode) {
      const msg = document.createElement('div');
      msg.className = 'ae-fp-msg-vazio';
      msg.dataset.tipo = tipo;
      msg.textContent = cfg.mensagemVazio;
      containerFiltro.parentNode.insertBefore(msg, containerFiltro.nextSibling);
    }

    atualizarBotaoFavoritar(tipo);
  }

  function limparFiltro(tipo) {
    const container = document.getElementById(TIPOS[tipo].idContainer);
    if (!container) return;
    const input = container.querySelector('input[type="text"]');
    if (input) {
      input.value = '';
      filtrar(tipo, '');
    }
  }

  function aplicarFiltro(tipo, termo) {
    const container = document.getElementById(TIPOS[tipo].idContainer);
    if (!container) return;
    const input = container.querySelector('input[type="text"]');
    if (!input) return;
    input.value = termo;
    filtrar(tipo, termo);
    input.focus();
  }

  // ── Filtros Favoritos ────────────────────────────────────────────
  function normalizarLista(lista) {
    if (!Array.isArray(lista)) return [];
    const out = [];
    const vistos = new Set();
    for (const item of lista) {
      const s = String(item || '').trim();
      if (!s) continue;
      const chave = s.toLowerCase();
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      out.push(s);
    }
    return out;
  }

  function salvarFavoritos() {
    chrome.storage.local.set({ [FAVORITOS_KEY]: favoritos });
  }

  function adicionarFavorito(tipo, termo) {
    const t = String(termo || '').trim();
    if (!t) return false;
    const lista = favoritos[tipo] || [];
    if (lista.some((x) => x.toLowerCase() === t.toLowerCase())) return false;
    favoritos[tipo] = [...lista, t];
    salvarFavoritos();
    renderFavoritos(tipo);
    return true;
  }

  function removerFavorito(tipo, termo) {
    const lista = favoritos[tipo] || [];
    favoritos[tipo] = lista.filter((x) => x.toLowerCase() !== String(termo).toLowerCase());
    salvarFavoritos();
    renderFavoritos(tipo);
  }

  function jaEhFavorito(tipo, termo) {
    const t = String(termo || '').trim().toLowerCase();
    if (!t) return false;
    return (favoritos[tipo] || []).some((x) => x.toLowerCase() === t);
  }

  function atualizarBotaoFavoritar(tipo) {
    const container = document.getElementById(TIPOS[tipo].idContainer);
    if (!container) return;
    const input = container.querySelector('input[type="text"]');
    const btn   = container.querySelector('.ae-fp-btn-favoritar');
    if (!input || !btn) return;
    const valor = input.value.trim();
    const temTexto = valor.length > 0;
    const ehFav    = jaEhFavorito(tipo, valor);
    btn.disabled = !temTexto || ehFav;
    btn.classList.toggle('is-ja-favorito', ehFav && temTexto);
    if (!temTexto) {
      btn.title = 'Digite um filtro para salvá-lo como favorito';
    } else if (ehFav) {
      btn.title = 'Este filtro já está nos favoritos';
    } else {
      btn.title = `Salvar "${valor}" como filtro favorito`;
    }
  }

  function renderFavoritos(tipo) {
    const container = document.getElementById(TIPOS[tipo].idContainer);
    if (!container) return;
    const wrap = container.parentNode?.querySelector(`.ae-fp-favoritos[data-tipo="${tipo}"]`);
    if (!wrap) return;

    const lista = favoritos[tipo] || [];
    wrap.innerHTML = '';
    if (lista.length === 0) {
      wrap.classList.add('is-vazio');
      return;
    }
    wrap.classList.remove('is-vazio');

    const label = document.createElement('span');
    label.className = 'ae-fp-favoritos__label';
    label.textContent = 'FAVORITOS:';
    wrap.appendChild(label);

    lista.forEach((termo) => {
      const chip = document.createElement('span');
      chip.className = `ae-fp-favorito ae-fp-favorito--${tipo}`;
      chip.dataset.tipo = tipo;
      chip.dataset.termo = termo;
      chip.title = `Aplicar filtro: ${termo}`;

      const btnAplicar = document.createElement('button');
      btnAplicar.type = 'button';
      btnAplicar.className = 'ae-fp-favorito__termo';
      btnAplicar.textContent = termo;
      btnAplicar.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        aplicarFiltro(tipo, termo);
      });

      const btnRemover = document.createElement('button');
      btnRemover.type = 'button';
      btnRemover.className = 'ae-fp-favorito__remover';
      btnRemover.title = 'Remover favorito';
      btnRemover.setAttribute('aria-label', `Remover favorito ${termo}`);
      btnRemover.textContent = '×';
      btnRemover.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removerFavorito(tipo, termo);
        atualizarBotaoFavoritar(tipo);
      });

      chip.appendChild(btnAplicar);
      chip.appendChild(btnRemover);
      wrap.appendChild(chip);
    });
  }

  function renderTodosFavoritos() {
    Object.keys(TIPOS).forEach(renderFavoritos);
  }

  // ── Botão "atalho de teclado" (botão especial do AZflow) ─────────
  function atualizarEstiloBotaoAtalho(botao) {
    const tipo  = botao.dataset.tipo;
    const ativo = atalhoAtivo === tipo;
    botao.classList.toggle('is-ativo', ativo);
    botao.title = ativo
      ? 'Captura de teclado ATIVADA. Pressione qualquer letra para escrever no filtro. Clique para desativar.'
      : 'Captura de teclado DESATIVADA. Clique para ativar (qualquer letra digitada na página vai direto para este filtro).';
  }

  function atualizarTodosBotoesAtalho() {
    document.querySelectorAll('.ae-fp-btn-atalho').forEach(atualizarEstiloBotaoAtalho);
  }

  function salvarAtalho() {
    chrome.storage.local.get(SETTINGS_KEY, (data) => {
      const cfg = data[SETTINGS_KEY] || {};
      if (!cfg.modules) cfg.modules = {};
      if (!cfg.modules[MODULE_NAME]) cfg.modules[MODULE_NAME] = {};
      cfg.modules[MODULE_NAME][SUB_ATALHO] = atalhoAtivo;
      chrome.storage.local.set({ [SETTINGS_KEY]: cfg });
    });
  }

  function toggleAtalho(tipo) {
    atalhoAtivo = (atalhoAtivo === tipo) ? null : tipo;
    salvarAtalho();
    atualizarTodosBotoesAtalho();
  }

  function criarBotaoAtalho(tipo) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ae-fp-btn-atalho';
    btn.dataset.tipo = tipo;
    btn.innerHTML = `
      <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
        <rect x="2" y="6" width="16" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
        <path d="M5 9h0M8 9h0M11 9h0M14 9h0M6 12h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>`;
    atualizarEstiloBotaoAtalho(btn);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleAtalho(tipo);
      btn.blur();
    });
    return btn;
  }

  function criarBotaoFavoritar(tipo) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ae-fp-btn-favoritar';
    btn.dataset.tipo = tipo;
    btn.setAttribute('aria-label', 'Salvar filtro atual como favorito');
    btn.innerHTML = `
      <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
        <path d="M10 2.5l2.2 4.55 5.05.7-3.65 3.55.85 5.05L10 13.95 5.55 16.35l.85-5.05L2.75 7.75l5.05-.7L10 2.5z"
              fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      </svg>`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const container = document.getElementById(TIPOS[tipo].idContainer);
      const input = container?.querySelector('input[type="text"]');
      const termo = (input?.value || '').trim();
      if (!termo) return;
      const adicionado = adicionarFavorito(tipo, termo);
      if (adicionado) atualizarBotaoFavoritar(tipo);
    });
    return btn;
  }

  // ── Construção da barra de filtro ────────────────────────────────
  function montarContainerFiltro(tipo) {
    const cfg = TIPOS[tipo];
    const container = document.createElement('div');
    container.id = cfg.idContainer;
    container.className = 'ae-fp-container';

    const label = document.createElement('label');
    label.className = 'ae-fp-label';
    label.textContent = 'FILTRAR:';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = `ae-fp-input ae-fp-input--${tipo}`;
    input.placeholder = cfg.placeholder;
    input.autocomplete = 'off';

    input.addEventListener('input', () => filtrar(tipo, input.value.trim()));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        input.value = '';
        filtrar(tipo, '');
        input.blur();
      } else if (e.key === 'Enter') {
        // Enter no campo salva o filtro atual como favorito
        e.preventDefault();
        const termo = input.value.trim();
        if (termo) {
          const adicionado = adicionarFavorito(tipo, termo);
          if (adicionado) atualizarBotaoFavoritar(tipo);
        }
      }
    });

    const btnFavoritar = criarBotaoFavoritar(tipo);

    const btnLimpar = document.createElement('button');
    btnLimpar.type = 'button';
    btnLimpar.className = 'ae-fp-btn-limpar';
    btnLimpar.textContent = '×';
    btnLimpar.title = 'Limpar filtro (ESC)';
    btnLimpar.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.value = '';
      filtrar(tipo, '');
      input.focus();
    });

    const btnAtalho = criarBotaoAtalho(tipo);

    const grupoBotoes = document.createElement('div');
    grupoBotoes.className = 'ae-fp-botoes';
    grupoBotoes.appendChild(btnFavoritar);
    grupoBotoes.appendChild(btnAtalho);
    grupoBotoes.appendChild(btnLimpar);

    container.appendChild(label);
    container.appendChild(input);
    container.appendChild(grupoBotoes);

    return container;
  }

  function montarFavoritos(tipo) {
    const wrap = document.createElement('div');
    wrap.className = 'ae-fp-favoritos is-vazio';
    wrap.dataset.tipo = tipo;
    return wrap;
  }

  function obterHospedeiroETopo(tipo) {
    const cfg = TIPOS[tipo];
    for (const id of cfg.idsHospedeiros) {
      const div = document.getElementById(id);
      if (!div) continue;
      if (cfg.hospedeiroUsaFieldset) {
        const fs = div.querySelector('fieldset');
        if (fs) return fs;
      } else {
        return div;
      }
    }
    return null;
  }

  function temAlgumaListaCarregada(tipo) {
    return TIPOS[tipo].idsListas.some((id) => {
      const div = document.getElementById(id);
      return div && div.querySelector('a.content-link');
    });
  }

  function injetar(tipo) {
    if (document.getElementById(TIPOS[tipo].idContainer)) return;
    if (!temAlgumaListaCarregada(tipo)) return;

    const hospedeiro = obterHospedeiroETopo(tipo);
    if (!hospedeiro) return;

    const container = montarContainerFiltro(tipo);
    const favoritosWrap = montarFavoritos(tipo);
    // Ordem (de cima para baixo): campo de filtro, depois chips de favoritos.
    hospedeiro.insertBefore(favoritosWrap, hospedeiro.firstChild);
    hospedeiro.insertBefore(container, favoritosWrap);

    renderFavoritos(tipo);
    atualizarBotaoFavoritar(tipo);
  }

  function injetarTodos() {
    Object.keys(TIPOS).forEach(injetar);
  }

  // ── Listener global ESC (limpa todos os filtros não-focados) ─────
  function instalarListenerESC() {
    if (escListener) return;
    escListener = function (e) {
      if (e.key !== 'Escape') return;
      const ativo = document.activeElement;
      const ehInput = ativo && (
        ativo.tagName === 'INPUT' ||
        ativo.tagName === 'TEXTAREA' ||
        ativo.isContentEditable ||
        ativo.tagName === 'SELECT'
      );
      if (ehInput) return;

      let limpou = false;
      Object.keys(TIPOS).forEach((tipo) => {
        const container = document.getElementById(TIPOS[tipo].idContainer);
        const input = container?.querySelector('input[type="text"]');
        if (input && input.value.trim() !== '') {
          limparFiltro(tipo);
          limpou = true;
        }
      });
      if (limpou) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', escListener, false);
  }

  // ── Listener de captura de teclado (botão atalho) ────────────────
  function instalarListenerAtalho() {
    if (keyListener) return;
    keyListener = function (e) {
      if (!atalhoAtivo) return;

      const ativo = document.activeElement;
      const ehInput = ativo && (
        ativo.tagName === 'INPUT' ||
        ativo.tagName === 'TEXTAREA' ||
        ativo.tagName === 'BUTTON' ||
        ativo.tagName === 'SELECT' ||
        ativo.isContentEditable ||
        ativo.hasAttribute('tabindex')
      );
      if (ehInput) return;

      const teclaValida = e.key.length === 1
        && e.key !== ' '
        && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey;
      if (!teclaValida) return;

      const container = document.getElementById(TIPOS[atalhoAtivo].idContainer);
      const input = container?.querySelector('input[type="text"]');
      if (!input) return;

      e.preventDefault();
      e.stopPropagation();
      input.focus();
      input.value = input.value + e.key;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    document.addEventListener('keydown', keyListener, true);
  }

  function removerListeners() {
    if (escListener) {
      document.removeEventListener('keydown', escListener, false);
      escListener = null;
    }
    if (keyListener) {
      document.removeEventListener('keydown', keyListener, true);
      keyListener = null;
    }
  }

  // ── Ciclo de vida ────────────────────────────────────────────────
  function ativar() {
    if (scriptAtivo) return;
    scriptAtivo = true;
    injetarTodos();
    instalarListenerESC();
    instalarListenerAtalho();
    observer = new MutationObserver(injetarTodos);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function desativar() {
    if (!scriptAtivo) return;
    scriptAtivo = false;
    if (observer) { observer.disconnect(); observer = null; }
    removerListeners();
    Object.values(TIPOS).forEach((cfg) => {
      const c = document.getElementById(cfg.idContainer);
      if (c) c.remove();
    });
    document.querySelectorAll('.ae-fp-favoritos').forEach((f) => f.remove());
    document.querySelectorAll('.ae-fp-msg-vazio').forEach((m) => m.remove());
    document.querySelectorAll('.ae-fp-highlight').forEach((h) => {
      const pai = h.parentNode;
      if (!pai) return;
      pai.replaceChild(document.createTextNode(h.textContent), h);
      pai.normalize();
    });
    // Restaurar visibilidade dos itens
    Object.values(TIPOS).forEach((cfg) => {
      cfg.idsListas.forEach((id) => {
        const div = document.getElementById(id);
        if (!div) return;
        div.querySelectorAll('li').forEach((li) => {
          li.style.display = '';
          li.style.opacity = '';
        });
      });
    });
  }

  // ── Bootstrap: lê settings e ativa/desativa ──────────────────────
  function lerEstadoModulo(eprocSettings) {
    const mod = eprocSettings?.modules?.[MODULE_NAME] || {};
    const moduloAtivo = mod.enabled !== false;
    const subAtivo    = mod[SUB_FEATURE] !== false;
    return {
      enabled:     moduloAtivo && subAtivo,
      atalhoAtivo: mod[SUB_ATALHO] ?? null,
    };
  }

  function aplicarFavoritosSalvos(raw) {
    favoritos = {
      minuta:       normalizarLista(raw?.minuta),
      movimentacao: normalizarLista(raw?.movimentacao),
      intimacao:    normalizarLista(raw?.intimacao),
    };
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes[FAVORITOS_KEY]) {
      aplicarFavoritosSalvos(changes[FAVORITOS_KEY].newValue);
      if (scriptAtivo) renderTodosFavoritos();
    }

    if (!changes[SETTINGS_KEY]) return;
    const novo = lerEstadoModulo(changes[SETTINGS_KEY].newValue);
    if (novo.atalhoAtivo !== atalhoAtivo) {
      atalhoAtivo = novo.atalhoAtivo;
      atualizarTodosBotoesAtalho();
    }
    if (novo.enabled && !scriptAtivo) ativar();
    if (!novo.enabled && scriptAtivo)  desativar();
  });

  chrome.storage.local.get([SETTINGS_KEY, FAVORITOS_KEY], (data) => {
    aplicarFavoritosSalvos(data[FAVORITOS_KEY]);
    const estado = lerEstadoModulo(data[SETTINGS_KEY]);
    atalhoAtivo = estado.atalhoAtivo;
    if (estado.enabled) ativar();
  });

})();
