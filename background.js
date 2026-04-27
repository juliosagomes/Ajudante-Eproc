// background.js — Ajudante Eproc (service worker)

const DEFAULT_SETTINGS = {
  modules: {
    lembretes: { enabled: true }
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
      // Migração: garantir que scripts existam em instalações anteriores
      const atual = data.eprocSettings;
      if (!atual.scripts) {
        atual.scripts = DEFAULT_SETTINGS.scripts;
        chrome.storage.local.set({ eprocSettings: atual });
      }
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
});
