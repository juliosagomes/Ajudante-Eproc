// background.js — Ajudante Eproc (service worker)

const DEFAULT_SETTINGS = {
  modules: {
    lembretes:               { enabled: true },
    colorirLocalizadores:    { enabled: true },
    filtrosEventos:          { enabled: true },
    expansorNumeroProcesso:  { enabled: true, defaultOOOO: '', anoMin: 2010 },
  },
  scripts: {
    localizadorBusca: { enabled: true }
  }
};

chrome.runtime.onInstalled.addListener(() => {
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
      }
      if (dirty) chrome.storage.local.set({ eprocSettings: atual });
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

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

  // ─── Módulo Lembretes ────────────────────────────────────────────
  if (msg.tipo === 'exportarDireto') {
    chrome.storage.local.get('eprocLembretes', (data) => {
      sendResponse({ lembretes: data.eprocLembretes || {} });
    });
    return true;
  }

  if (msg.tipo === 'importarDireto') {
    chrome.storage.local.get('eprocLembretes', (data) => {
      const existentes = data.eprocLembretes || {};
      const novos = msg.dados || {};
      const merged = { ...existentes, ...novos };
      chrome.storage.local.set({ eprocLembretes: merged }, () => {
        sendResponse({ ok: true, total: Object.keys(merged).length });
      });
    });
    return true;
  }

  if (msg.tipo === 'obterTotalLembretes') {
    chrome.storage.local.get('eprocLembretes', (data) => {
      const lembretes = data.eprocLembretes || {};
      sendResponse({ total: Object.keys(lembretes).length });
    });
    return true;
  }

  if (msg.tipo === 'limparTodosLembretes') {
    chrome.storage.local.set({ eprocLembretes: {} }, () => {
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
