// modules/pagina-processo-plus/pagina-processo-plus.js
// Modulo com 4 sub-recursos para a pagina do processo:
//   1. Barra de info sticky (numero + atalho Arvore + localizadores coloridos)
//   2. Click no numero do processo copia formatado (pontos e tracos)
//   3. Atalho para Arvore dentro da barra (substitui o botao flutuante)
//   4. Atalhos de scroll para Minuta / Movimentacao / Intimacao
//
// Cada sub-recurso liga/desliga independente pelo seu sub-toggle.

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;
  if (!window.location.href.includes('controlador.php?acao=processo_selecionar')) return;

  const SETTINGS_KEY  = 'eprocSettings';
  const CORES_KEY     = 'eprocCoresLocalizadores';
  const MODULE_NAME   = 'paginaProcessoPlus';

  const BARRA_ID      = 'fe-pp-barra';

  const PREF_TIPOS = [
    { id: 'minuta',       label: 'Minuta',       cor: '#2563eb', target: '#div-preferencia-minuta' },
    { id: 'movimentacao', label: 'Movimentação', cor: '#16a34a', target: '#div-preferencia-movimentacao' },
    { id: 'intimacao',    label: 'Intimação',    cor: '#dc2626', target: '#div-preferencia-intimacao' },
  ];

  // ─── SVG icons ──────────────────────────────────────────────────
  const ICON_COPY = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M3 10.5V3.5A1 1 0 0 1 4 2.5h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  const ICON_TREE = '<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="2" y="3" width="6" height="3.5" rx="0.6" stroke="currentColor" stroke-width="1.4"/><rect x="10" y="3" width="6" height="3.5" rx="0.6" stroke="currentColor" stroke-width="1.4"/><rect x="2" y="11.5" width="6" height="3.5" rx="0.6" stroke="currentColor" stroke-width="1.4"/><rect x="10" y="11.5" width="6" height="3.5" rx="0.6" stroke="currentColor" stroke-width="1.4"/><path d="M5 6.5v6.5M13 6.5v2.5M5 9.5h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  const ICON_TAG  = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 7.5V3a.5.5 0 0 1 .5-.5h4.5L13 8 8 13l-5.5-5.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="5.5" cy="5.5" r="0.9" fill="currentColor"/></svg>';

  // ─── Helpers ────────────────────────────────────────────────────
  function copiarParaClipboard(texto) {
    if (!texto) return Promise.resolve(false);
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(texto).then(() => true).catch(() => fallbackCopy(texto));
    }
    return Promise.resolve(fallbackCopy(texto));
  }

  function fallbackCopy(texto) {
    try {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.cssText = 'position:fixed;opacity:0;left:-9999px;';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (_) { return false; }
  }

  function luminancia(hex) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const lin = (v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  function corTextoPara(bg) {
    return luminancia(bg) > 0.35 ? '#1a1a2e' : '#ffffff';
  }

  function feedbackCopiado(anchor) {
    if (!anchor) return;
    let tip = anchor.querySelector('.fe-pp-feedback');
    if (tip) tip.remove();
    tip = document.createElement('span');
    tip.className = 'fe-pp-feedback';
    tip.textContent = 'copiado';
    anchor.appendChild(tip);
    setTimeout(() => tip.remove(), 1100);
  }

  // ─── Estado global do modulo ────────────────────────────────────
  let cfg = null;             // sub-toggles
  let coresLocal = {};        // mapa nome → hex
  let barraEl = null;
  let copyHandler = null;
  let mutationWatcher = null;
  let capaObserver = null;
  let scrollHandler = null;
  let scrollRaf = 0;
  let posResizeHandler = null;
  let barraVisivel = false;

  // ─── 1. Barra de info ───────────────────────────────────────────
  function obterNumProc() {
    const el = document.getElementById('txtNumProcesso');
    return el ? (el.textContent || '').trim() : '';
  }
  function obterLocalizadores() {
    const div = document.getElementById('dvLocalizadoresOrgao');
    if (!div) return [];
    return Array.from(div.querySelectorAll('a'))
      .filter((a) => {
        const txt = (a.textContent || '').trim();
        const href = a.href || '';
        const cls = a.className || '';
        return txt &&
          !href.includes('processo_localizador_historico_listar') &&
          !cls.includes('memoLocalizadorOrgao') &&
          !a.querySelector('img[src*="duvida.png"]');
      })
      .map((a) => (a.textContent || '').trim())
      .filter(Boolean);
  }

  function renderLocalizadores() {
    if (!barraEl) return;
    const wrap = barraEl.querySelector('.fe-pp-locs');
    if (!wrap) return;
    wrap.innerHTML = '';
    const nomes = obterLocalizadores();
    if (nomes.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'fe-pp-locs__empty';
      empty.textContent = 'Sem localizadores';
      wrap.appendChild(empty);
      return;
    }
    nomes.forEach((nome) => {
      const tag = document.createElement('span');
      tag.className = 'fe-pp-loc';
      tag.textContent = nome;
      const corBg = coresLocal[nome];
      if (corBg) {
        const fg = corTextoPara(corBg);
        tag.style.setProperty('background-color', corBg, 'important');
        tag.style.setProperty('color', fg, 'important');
        tag.style.setProperty('border-color', corBg, 'important');
      }
      wrap.appendChild(tag);
    });
  }

  function renderBarraConteudo() {
    if (!barraEl) return;
    const numEl = barraEl.querySelector('.fe-pp-num');
    if (numEl) numEl.textContent = obterNumProc() || '—';
    renderLocalizadores();
  }

  function montarBarra() {
    if (document.getElementById(BARRA_ID)) {
      barraEl = document.getElementById(BARRA_ID);
      return;
    }

    barraEl = document.createElement('div');
    barraEl.id = BARRA_ID;
    barraEl.className = 'fe-pp-barra';

    // Bloco numero
    const numWrap = document.createElement('div');
    numWrap.className = 'fe-pp-bloco fe-pp-bloco--num';
    const numIcon = document.createElement('span');
    numIcon.className = 'fe-pp-bloco__icon';
    numIcon.innerHTML = ICON_TAG;
    const numVal = document.createElement('span');
    numVal.className = 'fe-pp-num';
    numVal.title = 'Clique para copiar o número';
    numWrap.appendChild(numIcon);
    numWrap.appendChild(numVal);

    // Bloco atalho Arvore (populado por renderBotaoArvore se a sub-feature estiver ligada)
    const arvoreWrap = document.createElement('div');
    arvoreWrap.className = 'fe-pp-bloco fe-pp-bloco--arvore';

    // Bloco localizadores
    const locsWrap = document.createElement('div');
    locsWrap.className = 'fe-pp-bloco fe-pp-bloco--locs';
    const locsLabel = document.createElement('span');
    locsLabel.className = 'fe-pp-orgao__label';
    locsLabel.textContent = 'Locs';
    const locs = document.createElement('div');
    locs.className = 'fe-pp-locs';
    locsWrap.appendChild(locsLabel);
    locsWrap.appendChild(locs);

    // Bloco atalhos de preferencias (Minuta/Movimentacao/Intimacao)
    const atalhosWrap = document.createElement('div');
    atalhosWrap.className = 'fe-pp-bloco fe-pp-bloco--atalhos';

    barraEl.appendChild(numWrap);
    barraEl.appendChild(arvoreWrap);
    barraEl.appendChild(locsWrap);
    barraEl.appendChild(atalhosWrap);

    // Anexa em document.body (segue padrao do AZflow: bar fixa, fora do fluxo).
    // Posicao (top/left/width) e visibilidade vem via JS.
    document.body.appendChild(barraEl);

    renderBarraConteudo();
    recalcularPosicao();
  }

  // Soma altura das barras do topo do eproc (mesma estrategia do AZflow:
  // usa offsetHeight independente de position, pois quando elas estao no topo
  // o usuario ainda vai ver a barra abaixo; quando rolaram, nao bagunca muito).
  function obterAlturaNavbar() {
    let total = 0;
    const navbarAcc = document.getElementById('navbar-accessibility');
    if (navbarAcc) total += navbarAcc.offsetHeight;
    const navbar = document.getElementById('navbar');
    if (navbar) total += navbar.offsetHeight;
    return total;
  }

  // Largura/left do bloco de conteudo (sem a sidebar), com fallback p/ viewport
  // util quando o wrapper relata largura anormal durante reflows.
  function obterDimensoesConteudo() {
    const wrapper = document.getElementById('page-content-wrapper')
                 || document.getElementById('divInfraAreaProcesso');
    if (!wrapper) return { left: 0, width: window.innerWidth };
    const r = wrapper.getBoundingClientRect();
    const vw = Math.max(window.innerWidth || 0, document.documentElement?.clientWidth || 0);
    const left = Math.max(0, Number.isFinite(r.left) ? r.left : 0);
    const widthRect = Math.max(0, Number.isFinite(r.width) ? r.width : 0);
    const widthViewport = Math.max(0, vw - left);
    const usarFallback = widthViewport > 0 && widthRect > 0 && widthRect < widthViewport * 0.85;
    return { left, width: usarFallback ? widthViewport : (widthRect || widthViewport) };
  }

  function recalcularPosicao() {
    if (!barraEl) return;
    const dim = obterDimensoesConteudo();
    barraEl.style.top   = obterAlturaNavbar() + 'px';
    barraEl.style.left  = dim.left + 'px';
    barraEl.style.width = dim.width + 'px';
  }

  function setBarraVisivel(visivel) {
    if (!barraEl) return;
    if (visivel === barraVisivel) return;
    barraVisivel = visivel;
    barraEl.style.display = visivel ? 'flex' : 'none';
    if (visivel) recalcularPosicao();
  }

  // Determina se a barra deve estar visivel a partir do rect atual de #fldCapa
  function verificarVisibilidadeBarra() {
    if (!barraEl) return;
    const fldCapa = document.getElementById('fldCapa');
    if (!fldCapa) return;
    const rect = fldCapa.getBoundingClientRect();
    const wh = window.innerHeight || document.documentElement.clientHeight;
    const tolerancia = 30;
    // Mostra quando a capa saiu acima OU abaixo da viewport
    const passou = rect.bottom <= tolerancia || rect.top >= wh - tolerancia;
    // Esconde quando a capa esta bem visivel na viewport
    const visivelNaTela = rect.top < wh - tolerancia && rect.bottom > tolerancia;
    if (passou) setBarraVisivel(true);
    else if (visivelNaTela) setBarraVisivel(false);
  }

  function agendarVerificacao() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      verificarVisibilidadeBarra();
    });
  }

  function iniciarObserverCapa() {
    if (capaObserver) return;
    const fldCapa = document.getElementById('fldCapa');
    if (!fldCapa) return;

    if ('IntersectionObserver' in window) {
      capaObserver = new IntersectionObserver(() => verificarVisibilidadeBarra(), {
        root: null,
        rootMargin: '-30px 0px -30px 0px',
        threshold: [0, 0.1, 0.5, 1],
      });
      capaObserver.observe(fldCapa);
    }

    // Listener de scroll redundante para garantir o show em qualquer caso
    if (!scrollHandler) {
      scrollHandler = agendarVerificacao;
      window.addEventListener('scroll', scrollHandler, { passive: true, capture: true });
      window.addEventListener('wheel', scrollHandler, { passive: true });
    }

    // Sync inicial
    verificarVisibilidadeBarra();
  }

  function desmontarBarra() {
    if (barraEl) barraEl.remove();
    barraEl = null;
    barraVisivel = false;
    if (mutationWatcher) {
      try { mutationWatcher.disconnect(); } catch (_) {}
      mutationWatcher = null;
    }
    if (capaObserver) {
      try { capaObserver.disconnect(); } catch (_) {}
      capaObserver = null;
    }
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler, { capture: true });
      window.removeEventListener('wheel', scrollHandler);
      scrollHandler = null;
    }
    if (scrollRaf) {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = 0;
    }
    if (posResizeHandler) {
      window.removeEventListener('resize', posResizeHandler);
      window.removeEventListener('orientationchange', posResizeHandler);
      posResizeHandler = null;
    }
  }

  function iniciarWatcherBarra() {
    if (mutationWatcher) return;
    const alvo = document.getElementById('dvLocalizadoresOrgao');
    if (!alvo) return;
    mutationWatcher = new MutationObserver(() => renderLocalizadores());
    mutationWatcher.observe(alvo, { childList: true, subtree: true, characterData: true });
  }

  function enableBarraInfo() {
    montarBarra();
    iniciarWatcherBarra();
    iniciarObserverCapa();
    if (!posResizeHandler) {
      posResizeHandler = () => recalcularPosicao();
      window.addEventListener('resize', posResizeHandler);
      window.addEventListener('orientationchange', posResizeHandler);
    }
    if (cfg?.atalhosPreferencias) renderAtalhos();
    if (cfg?.botaoFlutuante) renderBotaoArvore();
    if (cfg?.copyNumero) wireCopyDentroDaBarra();
  }

  function disableBarraInfo() {
    desmontarBarra();
  }

  // ─── 2. Copy número do processo ─────────────────────────────────
  function handleCopyClickGlobal(e) {
    const alvo = e.target.closest?.('#txtNumProcesso, .fe-pp-num');
    if (!alvo) return;
    const texto = (alvo.textContent || '').trim();
    if (!texto) return;
    e.preventDefault();
    e.stopPropagation();
    copiarParaClipboard(texto).then(() => feedbackCopiado(alvo.parentElement || alvo));
  }

  function wireCopyDentroDaBarra() {
    if (!barraEl) return;
    const numEl = barraEl.querySelector('.fe-pp-num');
    if (numEl) numEl.classList.add('fe-pp-num--clickable');
  }
  function unwireCopyDentroDaBarra() {
    if (!barraEl) return;
    const numEl = barraEl.querySelector('.fe-pp-num');
    if (numEl) numEl.classList.remove('fe-pp-num--clickable');
  }

  function enableCopyNumero() {
    if (copyHandler) return;
    copyHandler = handleCopyClickGlobal;
    document.addEventListener('click', copyHandler, true);
    // Marcar visualmente o numero nativo do eproc
    const nat = document.getElementById('txtNumProcesso');
    if (nat) {
      nat.classList.add('fe-pp-num--clickable');
      nat.title = 'Clique para copiar o número';
    }
    wireCopyDentroDaBarra();
  }

  function disableCopyNumero() {
    if (copyHandler) {
      document.removeEventListener('click', copyHandler, true);
      copyHandler = null;
    }
    const nat = document.getElementById('txtNumProcesso');
    if (nat) {
      nat.classList.remove('fe-pp-num--clickable');
      nat.removeAttribute('title');
    }
    unwireCopyDentroDaBarra();
  }

  // ─── 3. Atalho para Árvore (dentro da barra de info) ────────────
  function clicarArvoreNativa() {
    let btn = null;
    const fldAcoes = document.getElementById('fldAcoes');
    const candidatos = (fldAcoes || document).querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]');
    for (const el of candidatos) {
      const txt = (el.textContent || el.value || '').trim();
      if (txt === 'Árvore') { btn = el; break; }
    }
    if (!btn) {
      for (const el of candidatos) {
        const txt = (el.textContent || el.value || '').trim();
        if (/árvore/i.test(txt)) { btn = el; break; }
      }
    }
    if (btn) btn.click();
  }

  function renderBotaoArvore() {
    if (!barraEl) return;
    const wrap = barraEl.querySelector('.fe-pp-bloco--arvore');
    if (!wrap) return;
    if (wrap.querySelector('.fe-pp-atalho--arvore')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fe-pp-atalho fe-pp-atalho--arvore';
    btn.title = 'Abrir Árvore do processo';
    btn.setAttribute('aria-label', 'Abrir Árvore do processo');
    btn.innerHTML = `${ICON_TREE}<span>Árvore</span>`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      clicarArvoreNativa();
    });

    wrap.appendChild(btn);
  }

  function removerBotaoArvore() {
    if (!barraEl) return;
    const wrap = barraEl.querySelector('.fe-pp-bloco--arvore');
    if (wrap) wrap.innerHTML = '';
  }

  function enableBotaoFlutuante() {
    if (cfg?.barraInfo) renderBotaoArvore();
  }

  function disableBotaoFlutuante() {
    removerBotaoArvore();
  }

  // ─── 4. Atalhos de preferências ─────────────────────────────────
  function renderAtalhos() {
    if (!barraEl) return;
    const wrap = barraEl.querySelector('.fe-pp-bloco--atalhos');
    if (!wrap) return;
    wrap.innerHTML = '';

    PREF_TIPOS.forEach((tipo) => {
      const alvo = document.querySelector(tipo.target);
      if (!alvo) return; // só renderiza botão se a seção existe
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `fe-pp-atalho fe-pp-atalho--${tipo.id}`;
      btn.style.setProperty('--cor', tipo.cor);
      btn.title = `Ir para ${tipo.label}`;
      btn.setAttribute('aria-label', `Rolar para ${tipo.label}`);
      btn.textContent = tipo.label;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Compensar a propria barra fixa sticky
        setTimeout(() => {
          if (barraEl) window.scrollBy({ top: -(barraEl.offsetHeight + 8), behavior: 'instant' });
        }, 250);
      });
      wrap.appendChild(btn);
    });
  }

  function enableAtalhosPreferencias() {
    if (cfg?.barraInfo) renderAtalhos();
  }

  function disableAtalhosPreferencias() {
    if (!barraEl) return;
    const wrap = barraEl.querySelector('.fe-pp-bloco--atalhos');
    if (wrap) wrap.innerHTML = '';
  }

  // ─── Dispatch & bootstrap ───────────────────────────────────────
  let moduloAtivo = false;

  function aplicarSubToggles() {
    if (!cfg) return;
    if (cfg.barraInfo)   enableBarraInfo();   else disableBarraInfo();
    if (cfg.copyNumero)  enableCopyNumero();  else disableCopyNumero();
    if (cfg.botaoFlutuante) enableBotaoFlutuante(); else disableBotaoFlutuante();
    if (cfg.atalhosPreferencias) enableAtalhosPreferencias(); else disableAtalhosPreferencias();
  }

  function ativarModulo() {
    if (moduloAtivo) return;
    moduloAtivo = true;
    aplicarSubToggles();
  }

  function desativarModulo() {
    if (!moduloAtivo) return;
    moduloAtivo = false;
    disableBarraInfo();
    disableCopyNumero();
    disableBotaoFlutuante();
    disableAtalhosPreferencias();
  }

  function lerSettings(callback) {
    chrome.storage.local.get([SETTINGS_KEY, CORES_KEY], (data) => {
      const mod = data[SETTINGS_KEY]?.modules?.[MODULE_NAME] || {};
      cfg = {
        enabled:              !!mod.enabled,
        barraInfo:            mod.barraInfo            !== false,
        copyNumero:           mod.copyNumero           !== false,
        botaoFlutuante:       mod.botaoFlutuante       !== false,
        atalhosPreferencias:  mod.atalhosPreferencias  !== false,
      };
      coresLocal = data[CORES_KEY] || {};
      if (callback) callback();
    });
  }

  lerSettings(() => {
    if (cfg.enabled) ativarModulo();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes[CORES_KEY]) {
      coresLocal = changes[CORES_KEY].newValue || {};
      if (barraEl) renderLocalizadores();
    }

    if (changes[SETTINGS_KEY]) {
      const mod = changes[SETTINGS_KEY].newValue?.modules?.[MODULE_NAME] || {};
      const novoCfg = {
        enabled:              !!mod.enabled,
        barraInfo:            mod.barraInfo            !== false,
        copyNumero:           mod.copyNumero           !== false,
        botaoFlutuante:       mod.botaoFlutuante       !== false,
        atalhosPreferencias:  mod.atalhosPreferencias  !== false,
      };
      cfg = novoCfg;
      if (cfg.enabled) {
        if (!moduloAtivo) ativarModulo();
        else aplicarSubToggles();
      } else {
        desativarModulo();
      }
    }
  });
})();
