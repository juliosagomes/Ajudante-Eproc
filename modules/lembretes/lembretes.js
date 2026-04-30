// modules/lembretes/lembretes.js — Módulo de Lembretes do Ajudante Eproc

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  const SETTINGS_KEY = 'eprocSettings';
  const STORAGE_KEY  = 'eprocLembretes';
  const MODULE_NAME  = 'lembretes';

  let lembretes  = {};
  let modoEdicao = false;
  let moduloAtivo = false;
  let observer   = null;

  // ─── Storage ────────────────────────────────────────────────────
  function carregarLembretes(callback) {
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      lembretes = data[STORAGE_KEY] || {};
      if (callback) callback();
    });
  }

  function salvarLembretes(callback) {
    chrome.storage.local.set({ [STORAGE_KEY]: lembretes }, callback);
  }

  // Grupos de preferências do Eproc — seletores estáveis por tipo
  const GROUPS = [
    { tipo: 'minuta',        painel: '#div-preferencia-minuta',                itemSel: 'a.content-link.text-primary' },
    { tipo: 'movimentacao',  painel: '#div-preferencia-movimentacao',          itemSel: 'a.content-link.text-success' },
    { tipo: 'intimacao',     painel: '#div-preferencia-intimacao',             itemSel: 'a.content-link.text-danger'  },
    {
      tipo: 'automatizacao',
      painel: '#div-preferencia-automatizacao-dados',
      // Âncora de injeção: o botão vermelho "Executar regra com um clique"
      itemSel: 'a[title="Executar regra com um clique"]',
      // Chave vem do container pai do botão (que contém o nome da preferência)
      obterTexto: (el) => (el.parentElement?.textContent || '')
        .replace(/play_circle_outline/g, '')
        .trim(),
    },
  ];

  // ─── Chave única (prefixada com tipo para evitar colisões) ──────
  function gerarChave(tipo, texto) {
    return `${tipo}:${texto.trim().replace(/\s+/g, ' ').substring(0, 100)}`;
  }

  // ─── Injetar ícone após o <a> da preferência ────────────────────
  function injetarIcone(chave, linkEl) {
    // Não duplicar — wrapper já é o irmão imediato
    if (linkEl.nextElementSibling?.classList.contains('eproc-lembrete-wrapper')) return;

    const wrapper = document.createElement('span');
    wrapper.className = 'eproc-lembrete-wrapper';

    const icone = document.createElement('span');
    icone.className = 'eproc-lembrete-icon';
    icone.setAttribute('data-chave', chave);

    const temLembrete = lembretes[chave];
    icone.innerHTML = temLembrete ? '📌' : '＋';
    icone.classList.toggle('eproc-lembrete-icon--ativo', !!temLembrete);
    icone.classList.toggle('eproc-lembrete-icon--vazio', !temLembrete);
    icone.title = temLembrete ? '' : 'Clique para adicionar lembrete';

    if (temLembrete) {
      const balao = document.createElement('span');
      balao.className = 'eproc-lembrete-balao';
      balao.textContent = lembretes[chave];
      wrapper.appendChild(balao);
    }

    icone.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      abrirEditorLembrete(chave, linkEl, icone);
    });

    wrapper.appendChild(icone);
    // Insere o wrapper como irmão seguinte ao link, não como filho
    linkEl.insertAdjacentElement('afterend', wrapper);
  }

  // ─── Editor inline ──────────────────────────────────────────────
  function abrirEditorLembrete(chave, elemento, icone) {
    document.querySelectorAll('.eproc-lembrete-editor').forEach(el => el.remove());

    const editor = document.createElement('div');
    editor.className = 'eproc-lembrete-editor';

    const titulo = document.createElement('div');
    titulo.className = 'eproc-lembrete-editor__titulo';
    titulo.textContent = '📌 Lembrete';

    const textarea = document.createElement('textarea');
    textarea.className = 'eproc-lembrete-editor__textarea';
    textarea.placeholder = 'Digite seu lembrete aqui...';
    textarea.value = lembretes[chave] || '';
    textarea.rows = 3;

    const botoes = document.createElement('div');
    botoes.className = 'eproc-lembrete-editor__botoes';

    const btnSalvar = document.createElement('button');
    btnSalvar.type      = 'button';
    btnSalvar.className = 'eproc-lembrete-editor__btn eproc-lembrete-editor__btn--salvar';
    btnSalvar.textContent = 'Salvar';
    btnSalvar.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const texto = textarea.value.trim();
      if (texto) {
        lembretes[chave] = texto;
      } else {
        delete lembretes[chave];
      }
      salvarLembretes(() => {
        editor.remove();
        if (elemento.nextElementSibling?.classList.contains('eproc-lembrete-wrapper')) {
          elemento.nextElementSibling.remove();
        }
        injetarIcone(chave, elemento);
      });
    });

    const btnRemover = document.createElement('button');
    btnRemover.type      = 'button';
    btnRemover.className = 'eproc-lembrete-editor__btn eproc-lembrete-editor__btn--remover';
    btnRemover.textContent = 'Remover';
    btnRemover.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      delete lembretes[chave];
      salvarLembretes(() => {
        editor.remove();
        if (elemento.nextElementSibling?.classList.contains('eproc-lembrete-wrapper')) {
          elemento.nextElementSibling.remove();
        }
        injetarIcone(chave, elemento);
      });
    });

    const btnCancelar = document.createElement('button');
    btnCancelar.type      = 'button';
    btnCancelar.className = 'eproc-lembrete-editor__btn eproc-lembrete-editor__btn--cancelar';
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); editor.remove(); });

    botoes.appendChild(btnSalvar);
    botoes.appendChild(btnRemover);
    botoes.appendChild(btnCancelar);

    editor.appendChild(titulo);
    editor.appendChild(textarea);
    editor.appendChild(botoes);

    const rect = icone.getBoundingClientRect();
    editor.style.position = 'fixed';
    editor.style.top = `${rect.bottom + 6}px`;
    editor.style.left = `${Math.min(rect.left, window.innerWidth - 320)}px`;
    editor.style.zIndex = '2147483647';

    document.body.appendChild(editor);
    textarea.focus();

    setTimeout(() => {
      document.addEventListener('mousedown', function fecharFora(ev) {
        if (!editor.contains(ev.target) && ev.target !== icone) {
          editor.remove();
          document.removeEventListener('mousedown', fecharFora);
        }
      });
    }, 100);
  }

  // ─── Escanear painéis de preferências do Eproc ──────────────────
  function escanearPreferencias() {
    for (const g of GROUPS) {
      const painel = document.querySelector(g.painel);
      if (!painel) continue;

      painel.querySelectorAll(g.itemSel).forEach((el) => {
        const texto = g.obterTexto ? g.obterTexto(el) : el.textContent.trim();
        if (!texto) return;

        const chave = gerarChave(g.tipo, texto);

        if (lembretes[chave] || modoEdicao) {
          injetarIcone(chave, el);
        }
      });
    }
  }

  // ─── Modo edição ────────────────────────────────────────────────
  function toggleModoEdicao(ativo) {
    modoEdicao = ativo;
    document.body.classList.toggle('eproc-lembrete-modo-edicao', ativo);
    document.querySelectorAll('.eproc-lembrete-wrapper').forEach(el => el.remove());
    escanearPreferencias();
    mostrarNotificacao(ativo
      ? '📌 Modo lembrete ATIVADO — clique no ＋ para adicionar'
      : '📌 Modo lembrete desativado');
  }

  function mostrarNotificacao(msg) {
    const existente = document.querySelector('.eproc-lembrete-notificacao');
    if (existente) existente.remove();

    const notif = document.createElement('div');
    notif.className = 'eproc-lembrete-notificacao';
    notif.textContent = msg;
    document.body.appendChild(notif);

    setTimeout(() => {
      notif.classList.add('eproc-lembrete-notificacao--saindo');
      setTimeout(() => notif.remove(), 400);
    }, 2500);
  }

  // ─── Ativar / Desativar módulo ──────────────────────────────────
  function ativarModulo() {
    if (moduloAtivo) return;
    moduloAtivo = true;

    carregarLembretes(() => {
      escanearPreferencias();

      observer = new MutationObserver(() => {
        escanearPreferencias();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  function desativarModulo() {
    if (!moduloAtivo) return;
    moduloAtivo = false;

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    document.querySelectorAll(
      '.eproc-lembrete-wrapper, .eproc-lembrete-editor, .eproc-lembrete-notificacao'
    ).forEach(el => el.remove());

    document.body.classList.remove('eproc-lembrete-modo-edicao');
    modoEdicao = false;
  }

  // ─── Mensagens do popup ─────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.tipo === 'toggleModoEdicao') {
      if (moduloAtivo) toggleModoEdicao(msg.ativo);
      sendResponse({ ok: true });
    }

    if (msg.tipo === 'exportarLembretes') {
      sendResponse({ lembretes });
    }

    if (msg.tipo === 'importarLembretes') {
      const novos = msg.dados;
      if (novos && typeof novos === 'object') {
        Object.assign(lembretes, novos);
        salvarLembretes(() => {
          if (moduloAtivo) {
            document.querySelectorAll('.eproc-lembrete-wrapper').forEach(el => el.remove());
            escanearPreferencias();
            mostrarNotificacao(`📌 ${Object.keys(novos).length} lembrete(s) importado(s)`);
          }
          sendResponse({ ok: true, total: Object.keys(lembretes).length });
        });
        return true;
      }
    }

    if (msg.tipo === 'obterEstado') {
      sendResponse({ modoEdicao, totalLembretes: Object.keys(lembretes).length, moduloAtivo });
    }

    return true;
  });

  // ─── Atalho de teclado ──────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (moduloAtivo && e.ctrlKey && e.shiftKey && e.key === 'L') {
      e.preventDefault();
      toggleModoEdicao(!modoEdicao);
    }
  });

  // ─── Reagir a mudanças de settings e de dados em tempo real ─────
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes[SETTINGS_KEY]) {
      const novoSettings = changes[SETTINGS_KEY].newValue || {};
      const enabled = novoSettings?.modules?.[MODULE_NAME]?.enabled ?? true;
      if (enabled && !moduloAtivo) ativarModulo();
      if (!enabled && moduloAtivo) desativarModulo();
    }

    if (changes[STORAGE_KEY] && moduloAtivo) {
      lembretes = changes[STORAGE_KEY].newValue || {};
      document.querySelectorAll('.eproc-lembrete-wrapper').forEach(el => el.remove());
      escanearPreferencias();
    }
  });

  // ─── Inicialização condicional ──────────────────────────────────
  chrome.storage.local.get(SETTINGS_KEY, (data) => {
    const settings = data[SETTINGS_KEY] || {};
    const enabled  = settings?.modules?.[MODULE_NAME]?.enabled ?? true;
    if (enabled) ativarModulo();
  });

})();
