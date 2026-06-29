// background.js — Ajudante Eproc (service worker)

const DEFAULT_SETTINGS = {
  modules: {
    anotacoesPreferencias:   { enabled: true },
    colorirLocalizadores:    { enabled: true },
    filtrosEventos:          { enabled: true },
    expansorNumeroProcesso:  { enabled: true, defaultOOOO: '', anoMin: 2010, J: '8', TR: '13', primeirosN: ['1', '5'] },
    buscaInteligente:        { enabled: true },
    paginaProcessoPlus: {
      enabled: true,
      barraInfo: true,
      copyNumero: true,
      atalhosPreferencias: true,
      filtrarPreferencias: true,
      filtrarPreferenciasAtalhoAtivo: null,
    },
  },
  scripts: {
    localizadorBusca:        { enabled: true },
    tarjasCustomizadas:      { enabled: true },
    esmaecerZerados:         { enabled: true },
    painelReordenar:         { enabled: true },
    historicoLocalizadores:  { enabled: true },
    painelAcoes:             { enabled: true },
  }
};

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Ajudante Eproc] Extensão instalada.');
  chrome.storage.local.get('eprocSettings', (data) => {
    if (!data.eprocSettings) {
      chrome.storage.local.set({ eprocSettings: DEFAULT_SETTINGS });
    } else {
      // Migração: garantir que novas chaves existam em instalações anteriores
      const atual = data.eprocSettings;
      let dirty = false;
      if (!atual.scripts) {
        atual.scripts = DEFAULT_SETTINGS.scripts;
        dirty = true;
      }
      if (!atual.modules?.colorirLocalizadores) {
        if (!atual.modules) atual.modules = {};
        atual.modules.colorirLocalizadores = DEFAULT_SETTINGS.modules.colorirLocalizadores;
        dirty = true;
      }
      if (!atual.modules?.filtrosEventos) {
        if (!atual.modules) atual.modules = {};
        atual.modules.filtrosEventos = DEFAULT_SETTINGS.modules.filtrosEventos;
        dirty = true;
      }
      if (!atual.modules?.expansorNumeroProcesso) {
        if (!atual.modules) atual.modules = {};
        atual.modules.expansorNumeroProcesso = DEFAULT_SETTINGS.modules.expansorNumeroProcesso;
        dirty = true;
      } else {
        // Backfill: J, TR e primeirosN passaram a ser configuráveis (padrão TJMG).
        // primeirosN é lista ordenada (TJMG: 1=Eproc nativo, 5=migrado do PJe).
        const exp = atual.modules.expansorNumeroProcesso;
        if (typeof exp.J !== 'string')  { exp.J  = '8';  dirty = true; }
        if (typeof exp.TR !== 'string') { exp.TR = '13'; dirty = true; }
        if (!Array.isArray(exp.primeirosN) || !exp.primeirosN.length) {
          // Migra string única primeiroN → lista; senão usa padrão TJMG
          if (typeof exp.primeiroN === 'string' && /^\d$/.test(exp.primeiroN)) {
            exp.primeirosN = [exp.primeiroN];
          } else {
            exp.primeirosN = ['1', '5'];
          }
          dirty = true;
        }
        if ('primeiroN' in exp) {
          delete exp.primeiroN;
          dirty = true;
        }
      }
      if (!atual.modules?.buscaInteligente) {
        if (!atual.modules) atual.modules = {};
        atual.modules.buscaInteligente = DEFAULT_SETTINGS.modules.buscaInteligente;
        dirty = true;
      }
      if (!atual.modules?.paginaProcessoPlus) {
        if (!atual.modules) atual.modules = {};
        atual.modules.paginaProcessoPlus = { ...DEFAULT_SETTINGS.modules.paginaProcessoPlus };
        dirty = true;
      }
      {
        // Backfill: filtrarPreferencias virou sub-recurso do Capa de Processo+
        // (antes era script global "filtroPreferencias"). Move o estado salvo.
        const pp = atual.modules.paginaProcessoPlus;
        const antigo = atual.scripts?.filtroPreferencias;
        if (typeof pp.filtrarPreferencias !== 'boolean') {
          pp.filtrarPreferencias = antigo && typeof antigo.enabled === 'boolean'
            ? antigo.enabled
            : true;
          dirty = true;
        }
        if (!('filtrarPreferenciasAtalhoAtivo' in pp)) {
          pp.filtrarPreferenciasAtalhoAtivo = antigo?.atalhoAtivo ?? null;
          dirty = true;
        }
        // Remoção: "Atalho para Árvore" deixou de ser sub-toggle — agora segue a Barra de info.
        if ('botaoFlutuante' in pp) {
          delete pp.botaoFlutuante;
          dirty = true;
        }
      }
      // Limpa o registro antigo do script global, já migrado para paginaProcessoPlus
      if (atual.scripts?.filtroPreferencias) {
        delete atual.scripts.filtroPreferencias;
        dirty = true;
      }
      // Move: "tarjasCustomizadas" deixou de ser módulo e virou script em Ajustes Gerais
      if (atual.modules?.tarjasCustomizadas) {
        if (!atual.scripts) atual.scripts = {};
        if (!atual.scripts.tarjasCustomizadas) {
          atual.scripts.tarjasCustomizadas = { ...atual.modules.tarjasCustomizadas };
        }
        delete atual.modules.tarjasCustomizadas;
        dirty = true;
      }
      if (!atual.scripts?.tarjasCustomizadas) {
        if (!atual.scripts) atual.scripts = {};
        atual.scripts.tarjasCustomizadas = DEFAULT_SETTINGS.scripts.tarjasCustomizadas;
        dirty = true;
      }
      if (!atual.scripts?.esmaecerZerados) {
        if (!atual.scripts) atual.scripts = {};
        atual.scripts.esmaecerZerados = DEFAULT_SETTINGS.scripts.esmaecerZerados;
        dirty = true;
      }
      if (!atual.scripts?.painelReordenar) {
        if (!atual.scripts) atual.scripts = {};
        atual.scripts.painelReordenar = DEFAULT_SETTINGS.scripts.painelReordenar;
        dirty = true;
      }
      if (!atual.scripts?.historicoLocalizadores) {
        if (!atual.scripts) atual.scripts = {};
        atual.scripts.historicoLocalizadores = DEFAULT_SETTINGS.scripts.historicoLocalizadores;
        dirty = true;
      }
      if (!atual.scripts?.painelAcoes) {
        if (!atual.scripts) atual.scripts = {};
        atual.scripts.painelAcoes = DEFAULT_SETTINGS.scripts.painelAcoes;
        dirty = true;
      }
      // Rename: módulo "lembretes" → "anotacoesPreferencias"
      if (!atual.modules?.anotacoesPreferencias) {
        if (!atual.modules) atual.modules = {};
        atual.modules.anotacoesPreferencias = atual.modules.lembretes
          ? { ...atual.modules.lembretes }
          : DEFAULT_SETTINGS.modules.anotacoesPreferencias;
        dirty = true;
      }
      if (atual.modules?.lembretes) {
        delete atual.modules.lembretes;
        dirty = true;
      }
      if (dirty) chrome.storage.local.set({ eprocSettings: atual });
    }
  });

  // Rename: dados "eprocLembretes" → "eprocAnotacoesPreferencias" (move, não duplica)
  chrome.storage.local.get(['eprocLembretes', 'eprocAnotacoesPreferencias'], (d) => {
    if (!d.eprocLembretes) return;
    const novo = { ...(d.eprocAnotacoesPreferencias || {}), ...d.eprocLembretes };
    chrome.storage.local.set({ eprocAnotacoesPreferencias: novo }, () => {
      chrome.storage.local.remove('eprocLembretes');
    });
  });

  // Abre a página de Termos de Uso na primeira instalação,
  // enquanto o usuário ainda não tiver aceitado.
  if (details && details.reason === 'install') {
    chrome.storage.local.get('eprocTermosAceitos', (data) => {
      if (!data.eprocTermosAceitos) {
        chrome.tabs.create({ url: chrome.runtime.getURL('termos/termos.html') });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ─── Termos de Uso ──────────────────────────────────────────────
  if (msg.tipo === 'aceitarTermos') {
    chrome.storage.local.set({
      eprocTermosAceitos: true,
      eprocTermosAceitosEm: new Date().toISOString(),
    }, () => {
      chrome.runtime.openOptionsPage(() => {
        sendResponse({ ok: true });
      });
    });
    return true;
  }

  if (msg.tipo === 'obterStatusTermos') {
    chrome.storage.local.get(['eprocTermosAceitos', 'eprocTermosAceitosEm'], (data) => {
      sendResponse({
        aceitos: !!data.eprocTermosAceitos,
        em: data.eprocTermosAceitosEm || null,
      });
    });
    return true;
  }

  // ─── Navegação ──────────────────────────────────────────────────
  if (msg.tipo === 'abrirConfiguracoes') {
    chrome.runtime.openOptionsPage();
    return false;
  }

  // ─── Settings ───────────────────────────────────────────────────
  if (msg.tipo === 'obterSettings') {
    chrome.storage.local.get('eprocSettings', (data) => {
      sendResponse({ settings: data.eprocSettings || DEFAULT_SETTINGS });
    });
    return true;
  }

  if (msg.tipo === 'salvarSettings') {
    chrome.storage.local.set({ eprocSettings: msg.settings }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  // ─── Módulo Anotações em Preferências ────────────────────────────
  if (msg.tipo === 'exportarAnotacoesPreferencias') {
    chrome.storage.local.get('eprocAnotacoesPreferencias', (data) => {
      sendResponse({ anotacoes: data.eprocAnotacoesPreferencias || {} });
    });
    return true;
  }

  if (msg.tipo === 'importarAnotacoesPreferencias') {
    chrome.storage.local.get('eprocAnotacoesPreferencias', (data) => {
      const existentes = data.eprocAnotacoesPreferencias || {};
      const novos = msg.dados || {};
      const merged = { ...existentes, ...novos };
      chrome.storage.local.set({ eprocAnotacoesPreferencias: merged }, () => {
        sendResponse({ ok: true, total: Object.keys(merged).length });
      });
    });
    return true;
  }

  if (msg.tipo === 'obterTotalAnotacoesPreferencias') {
    chrome.storage.local.get('eprocAnotacoesPreferencias', (data) => {
      const anotacoes = data.eprocAnotacoesPreferencias || {};
      sendResponse({ total: Object.keys(anotacoes).length });
    });
    return true;
  }

  if (msg.tipo === 'limparTodasAnotacoesPreferencias') {
    chrome.storage.local.set({ eprocAnotacoesPreferencias: {} }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  // ─── Módulo Colorir Localizadores ────────────────────────────────
  if (msg.tipo === 'exportarCoresLocalizadores') {
    chrome.storage.local.get('eprocCoresLocalizadores', (data) => {
      sendResponse({ cores: data.eprocCoresLocalizadores || {} });
    });
    return true;
  }

  if (msg.tipo === 'importarCoresLocalizadores') {
    chrome.storage.local.get('eprocCoresLocalizadores', (data) => {
      const existentes = data.eprocCoresLocalizadores || {};
      const novos = msg.dados || {};
      const merged = { ...existentes, ...novos };
      chrome.storage.local.set({ eprocCoresLocalizadores: merged }, () => {
        sendResponse({ ok: true, total: Object.keys(merged).length });
      });
    });
    return true;
  }

  if (msg.tipo === 'limparCoresLocalizadores') {
    chrome.storage.local.set({ eprocCoresLocalizadores: {} }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});
