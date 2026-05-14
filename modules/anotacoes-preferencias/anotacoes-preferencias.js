// modules/anotacoes-preferencias/anotacoes-preferencias.js — Módulo de Anotações em Preferências do Ajudante Eproc

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  const SETTINGS_KEY = 'eprocSettings';
  const STORAGE_KEY  = 'eprocAnotacoesPreferencias';
  const MODULE_NAME  = 'anotacoesPreferencias';

  let anotacoes   = {};
  let modoEdicao  = false;
  let moduloAtivo = false;
  let observer    = null;

  // ─── Storage ────────────────────────────────────────────────────
  function carregarAnotacoes(callback) {
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      anotacoes = data[STORAGE_KEY] || {};
      if (callback) callback();
    });
  }

  function salvarAnotacoes(callback) {
    chrome.storage.local.set({ [STORAGE_KEY]: anotacoes }, callback);
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
    if (linkEl.nextElementSibling?.classList.contains('eproc-anotacao-wrapper')) return;

    const wrapper = document.createElement('span');
    wrapper.className = 'eproc-anotacao-wrapper';

    const icone = document.createElement('span');
    icone.className = 'eproc-anotacao-icon';
    icone.setAttribute('data-chave', chave);

    const temAnotacao = anotacoes[chave];
    icone.innerHTML = temAnotacao ? '📌' : '＋';
    icone.classList.toggle('eproc-anotacao-icon--ativo', !!temAnotacao);
    icone.classList.toggle('eproc-anotacao-icon--vazio', !temAnotacao);
    icone.title = temAnotacao ? '' : 'Clique para adicionar anotação';

    if (temAnotacao) {
      const balao = document.createElement('span');
      balao.className = 'eproc-anotacao-balao';
      balao.textContent = anotacoes[chave];
      wrapper.appendChild(balao);
    }

    icone.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      abrirEditorAnotacao(chave, linkEl, icone);
    });

    wrapper.appendChild(icone);
    // Insere o wrapper como irmão seguinte ao link, não como filho
    linkEl.insertAdjacentElement('afterend', wrapper);
  }

  // ─── Editor inline ──────────────────────────────────────────────
  function abrirEditorAnotacao(chave, elemento, icone) {
    document.querySelectorAll('.eproc-anotacao-editor').forEach(el => el.remove());

    const editor = document.createElement('div');
    editor.className = 'eproc-anotacao-editor';

    const titulo = document.createElement('div');
    titulo.className = 'eproc-anotacao-editor__titulo';
    titulo.textContent = '📌 Anotação';

    const textarea = document.createElement('textarea');
    textarea.className = 'eproc-anotacao-editor__textarea';
    textarea.placeholder = 'Digite sua anotação aqui...';
    textarea.value = anotacoes[chave] || '';
    textarea.rows = 3;

    const botoes = document.createElement('div');
    botoes.className = 'eproc-anotacao-editor__botoes';

    const btnSalvar = document.createElement('button');
    btnSalvar.type      = 'button';
    btnSalvar.className = 'eproc-anotacao-editor__btn eproc-anotacao-editor__btn--salvar';
    btnSalvar.textContent = 'Salvar';
    btnSalvar.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const texto = textarea.value.trim();
      if (texto) {
        anotacoes[chave] = texto;
      } else {
        delete anotacoes[chave];
      }
      salvarAnotacoes(() => {
        editor.remove();
        if (elemento.nextElementSibling?.classList.contains('eproc-anotacao-wrapper')) {
          elemento.nextElementSibling.remove();
        }
        injetarIcone(chave, elemento);
      });
    });

    const btnRemover = document.createElement('button');
    btnRemover.type      = 'button';
    btnRemover.className = 'eproc-anotacao-editor__btn eproc-anotacao-editor__btn--remover';
    btnRemover.textContent = 'Remover';
    btnRemover.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      delete anotacoes[chave];
      salvarAnotacoes(() => {
        editor.remove();
        if (elemento.nextElementSibling?.classList.contains('eproc-anotacao-wrapper')) {
          elemento.nextElementSibling.remove();
        }
        injetarIcone(chave, elemento);
      });
    });

    const btnCancelar = document.createElement('button');
    btnCancelar.type      = 'button';
    btnCancelar.className = 'eproc-anotacao-editor__btn eproc-anotacao-editor__btn--cancelar';
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

        if (anotacoes[chave] || modoEdicao) {
          injetarIcone(chave, el);
        }
      });
    }
  }

  // ─── Modo edição ────────────────────────────────────────────────
  function toggleModoEdicao(ativo) {
    modoEdicao = ativo;
    document.body.classList.toggle('eproc-anotacao-modo-edicao', ativo);
    document.querySelectorAll('.eproc-anotacao-wrapper').forEach(el => el.remove());
    escanearPreferencias();
    mostrarNotificacao(ativo
      ? '📌 Modo anotação ATIVADO — clique no ＋ para adicionar'
      : '📌 Modo anotação desativado');
  }

  function mostrarNotificacao(msg) {
    const existente = document.querySelector('.eproc-anotacao-notificacao');
    if (existente) existente.remove();

    const notif = document.createElement('div');
    notif.className = 'eproc-anotacao-notificacao';
    notif.textContent = msg;
    document.body.appendChild(notif);

    setTimeout(() => {
      notif.classList.add('eproc-anotacao-notificacao--saindo');
      setTimeout(() => notif.remove(), 400);
    }, 2500);
  }

  // ─── Ativar / Desativar módulo ──────────────────────────────────
  function ativarModulo() {
    if (moduloAtivo) return;
    moduloAtivo = true;

    carregarAnotacoes(() => {
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
      '.eproc-anotacao-wrapper, .eproc-anotacao-editor, .eproc-anotacao-notificacao'
    ).forEach(el => el.remove());

    document.body.classList.remove('eproc-anotacao-modo-edicao');
    modoEdicao = false;
  }

  // ─── Mensagens do popup ─────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.tipo === 'toggleModoEdicao') {
      if (moduloAtivo) toggleModoEdicao(msg.ativo);
      sendResponse({ ok: true });
    }

    if (msg.tipo === 'exportarAnotacoes') {
      sendResponse({ anotacoes });
    }

    if (msg.tipo === 'importarAnotacoes') {
      const novos = msg.dados;
      if (novos && typeof novos === 'object') {
        Object.assign(anotacoes, novos);
        salvarAnotacoes(() => {
          if (moduloAtivo) {
            document.querySelectorAll('.eproc-anotacao-wrapper').forEach(el => el.remove());
            escanearPreferencias();
            mostrarNotificacao(`📌 ${Object.keys(novos).length} anotaç${Object.keys(novos).length !== 1 ? 'ões' : 'ão'} importada${Object.keys(novos).length !== 1 ? 's' : ''}`);
          }
          sendResponse({ ok: true, total: Object.keys(anotacoes).length });
        });
        return true;
      }
    }

    if (msg.tipo === 'obterEstado') {
      sendResponse({ modoEdicao, totalAnotacoes: Object.keys(anotacoes).length, moduloAtivo });
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
      anotacoes = changes[STORAGE_KEY].newValue || {};
      document.querySelectorAll('.eproc-anotacao-wrapper').forEach(el => el.remove());
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
