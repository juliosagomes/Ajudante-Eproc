// lib/alertas.js — Toasts e confirmação custom do Ajudante Eproc
// Depende de lib/modal-manager.js para integrar ESC no modal de confirmação.

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  window.__AjudanteEproc = window.__AjudanteEproc || {};
  if (window.__AjudanteEproc.alertas) return;

  const TOAST_ID = 'ajudante-mensagem-toast';
  const CONFIRM_ID = 'ajudante-mensagem-confirmacao';
  const STYLES_ID = 'ajudante-modal-styles';
  const KEYBOARD_NAV_CLASS = 'ajudante-keyboard-navigation';

  const state = { erroAtivo: false };

  function montarSegundaLinha(total) {
    if (typeof total === 'number' && !isNaN(total)) {
      return `<span style="font-size:15px;font-weight:400;">Total: ${total}</span>`;
    }
    if (typeof total === 'string' && total.trim() !== '') {
      const isNum = !isNaN(Number(total));
      const prefixo = isNum ? 'Total: ' : '';
      return `<span style="font-size:15px;font-weight:400;">${prefixo}${total}</span>`;
    }
    return '';
  }

  function criarToast(cor) {
    const msg = document.createElement('div');
    msg.id = TOAST_ID;
    msg.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${cor};
      color: #fff;
      padding: 22px 36px;
      border-radius: 10px;
      font-size: 17px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-weight: 600;
      box-shadow: 0 4px 24px rgba(0,0,0,0.25);
      z-index: 99999;
      text-align: center;
      opacity: 0;
      transition: opacity 0.2s;
      min-width: 450px;
    `;
    return msg;
  }

  function sucesso(texto, total) {
    const existente = document.getElementById(TOAST_ID);
    if (existente) existente.remove();

    const msg = criarToast('#16a34a');
    const segundaLinha = montarSegundaLinha(total);
    msg.innerHTML = `${texto}${segundaLinha ? '<br>' + segundaLinha : ''}`;
    document.body.appendChild(msg);

    setTimeout(() => { msg.style.opacity = '1'; }, 10);
    setTimeout(() => {
      msg.style.opacity = '0';
      setTimeout(() => { if (msg.parentNode) msg.parentNode.removeChild(msg); }, 300);
    }, 1500);
  }

  function erro(texto, total) {
    // Proteção contra duplicação concorrente
    if (state.erroAtivo) return;
    state.erroAtivo = true;

    const existente = document.getElementById(TOAST_ID);
    if (existente) existente.remove();

    const msg = criarToast('#dc2626');
    const segundaLinha = montarSegundaLinha(total);
    msg.innerHTML = `${texto}${segundaLinha ? '<br>' + segundaLinha : ''}`;
    document.body.appendChild(msg);

    setTimeout(() => { msg.style.opacity = '1'; }, 10);
    setTimeout(() => {
      msg.style.opacity = '0';
      setTimeout(() => {
        if (msg.parentNode) msg.parentNode.removeChild(msg);
        state.erroAtivo = false;
      }, 300);
    }, 1500);
  }

  function garantirEstilosConfirmacao() {
    if (document.getElementById(STYLES_ID)) return;
    const style = document.createElement('style');
    style.id = STYLES_ID;
    style.textContent = `
      #${CONFIRM_ID} button:focus { outline: none !important; }
      #${CONFIRM_ID} button[data-ajudante-cancel="true"]:focus,
      #${CONFIRM_ID} button[data-ajudante-cancel="true"]:focus-visible,
      #${CONFIRM_ID} button[data-ajudante-cancel="true"]:active {
        border-color: #dc2626 !important;
        border-width: 1px !important;
        outline: none !important;
      }
      #${CONFIRM_ID} button:not([data-ajudante-cancel]):focus,
      #${CONFIRM_ID} button:not([data-ajudante-cancel]):focus-visible,
      #${CONFIRM_ID} button:not([data-ajudante-cancel]):active {
        border-color: #2563eb !important;
        border-width: 1px !important;
        outline: none !important;
      }
      body.${KEYBOARD_NAV_CLASS}, body.${KEYBOARD_NAV_CLASS} * { cursor: none !important; }
    `;
    document.head.appendChild(style);
  }

  function confirmacao(mensagem) {
    return new Promise((resolve) => {
      const existente = document.getElementById(CONFIRM_ID);
      if (existente) existente.remove();

      garantirEstilosConfirmacao();

      let isKeyboardNavigation = false;
      let jaResolvido = false;
      let botaoAtivo = 'ok';

      const overlay = document.createElement('div');
      overlay.id = CONFIRM_ID;
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.10);
        z-index: 100000;
        display: flex; align-items: center; justify-content: center;
      `;

      const box = document.createElement('div');
      box.style.cssText = `
        background: #fff;
        color: #222;
        padding: 28px 38px 22px 38px;
        border-radius: 12px;
        font-size: 17px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        font-weight: 500;
        box-shadow: 0 4px 24px rgba(0,0,0,0.25);
        min-width: 450px;
        max-width: 90vw;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
      `;

      const mensagemProcessada = String(mensagem).replace(
        /Total:\s*(\d+)/gi,
        '<span style="font-size: 14px; font-weight: normal; text-transform: uppercase;"><span style="color: inherit;">TOTAL:</span> <span style="color: #6b7280;">$1</span></span>'
      );
      const msg = document.createElement('div');
      msg.innerHTML = mensagemProcessada;
      msg.style.marginBottom = '24px';
      box.appendChild(msg);

      const btns = document.createElement('div');
      btns.style.cssText = 'display: flex; gap: 8px;';

      const btnOk = document.createElement('button');
      btnOk.textContent = 'Ok';
      btnOk.type = 'button';
      btnOk.tabIndex = 1;
      btnOk.style.cssText = `
        background: #e6f2ff;
        color: #1e40af;
        border: 1px solid #2563eb;
        border-radius: 6px;
        padding: 8px 18px;
        min-width: 110px;
        font-size: 15px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        cursor: pointer;
        transition: all 0.15s ease;
        font-weight: 500;
      `;

      const btnCancelar = document.createElement('button');
      btnCancelar.textContent = 'Cancelar';
      btnCancelar.type = 'button';
      btnCancelar.tabIndex = 2;
      btnCancelar.setAttribute('data-ajudante-cancel', 'true');
      btnCancelar.style.cssText = `
        background: #fee2e2;
        color: #dc2626;
        border: 1px solid #dc2626;
        border-radius: 6px;
        padding: 8px 18px;
        min-width: 110px;
        font-size: 15px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        cursor: pointer;
        transition: all 0.15s ease;
        font-weight: 500;
        margin-left: 8px;
      `;

      function okAtivo() {
        botaoAtivo = 'ok';
        btnOk.style.background = '#2563eb';
        btnOk.style.color = '#fff';
        btnOk.style.borderColor = '#2563eb';
        btnCancelar.style.background = '#fee2e2';
        btnCancelar.style.color = '#dc2626';
        btnCancelar.style.borderColor = '#dc2626';
      }
      function cancelarAtivo() {
        botaoAtivo = 'cancelar';
        btnCancelar.style.background = '#dc2626';
        btnCancelar.style.color = '#fff';
        btnCancelar.style.borderColor = '#dc2626';
        btnCancelar.style.setProperty('border-color', '#dc2626', 'important');
        btnOk.style.background = '#e6f2ff';
        btnOk.style.color = '#1e40af';
        btnOk.style.borderColor = '#2563eb';
      }
      function ativarProximo() {
        if (botaoAtivo === 'ok') cancelarAtivo();
        else okAtivo();
      }

      function hideCursor() {
        isKeyboardNavigation = true;
        document.body.classList.add(KEYBOARD_NAV_CLASS);
      }
      function showCursor() {
        isKeyboardNavigation = false;
        document.body.classList.remove(KEYBOARD_NAV_CLASS);
      }

      function handleMouseMove(e) {
        if (isKeyboardNavigation) showCursor();

        const sob = document.elementFromPoint(e.clientX, e.clientY);
        if (sob === btnOk) okAtivo();
        else if (sob === btnCancelar) cancelarAtivo();

        if (!isKeyboardNavigation) {
          document.body.classList.remove(KEYBOARD_NAV_CLASS);
        }
      }

      function handleKeyDown(e) {
        if (e.key === 'Tab') {
          hideCursor();
          e.preventDefault();
          ativarProximo();
        } else if (e.key === 'Enter') {
          if (botaoAtivo === 'ok') btnOk.click();
          else btnCancelar.click();
        }
      }

      function removerListenersGlobais() {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keydown', escListener, true);
        overlay.removeEventListener('keydown', trapFocus, true);
        document.body.classList.remove(KEYBOARD_NAV_CLASS);
      }

      function fechar(resultado) {
        if (jaResolvido) return;
        jaResolvido = true;
        removerListenersGlobais();
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (window.__AjudanteEproc?.modalManager) {
          window.__AjudanteEproc.modalManager.unregisterModal(CONFIRM_ID);
        }
        resolve(resultado);
      }

      btnOk.addEventListener('mouseover', okAtivo);
      btnOk.addEventListener('mouseenter', () => { if (isKeyboardNavigation) showCursor(); okAtivo(); });
      btnOk.addEventListener('click', () => fechar(true));

      btnCancelar.addEventListener('mouseover', cancelarAtivo);
      btnCancelar.addEventListener('mouseenter', () => { if (isKeyboardNavigation) showCursor(); cancelarAtivo(); });
      btnCancelar.addEventListener('click', () => fechar(false));

      btns.appendChild(btnOk);
      btns.appendChild(btnCancelar);
      box.appendChild(btns);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      okAtivo();

      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) fechar(false);
      });

      // Tab/Shift+Tab restrito aos dois botões
      const trapFocus = function (e) {
        if (e.key !== 'Tab') return;
        const focusable = [btnOk, btnCancelar];
        const idx = focusable.indexOf(document.activeElement);
        if (e.shiftKey) {
          if (idx === 0 || document.activeElement === overlay) {
            e.preventDefault();
            focusable[1].focus();
          }
        } else {
          if (idx === 1 || document.activeElement === overlay) {
            e.preventDefault();
            focusable[0].focus();
          }
        }
      };
      overlay.addEventListener('keydown', trapFocus, true);

      // ESC com prioridade (capture) — resolve(false)
      const escListener = function (e) {
        if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
          e.preventDefault();
          e.stopImmediatePropagation();
          fechar(false);
        }
      };
      setTimeout(() => document.addEventListener('keydown', escListener, true), 0);

      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('keydown', handleKeyDown, { passive: false });

      // Integra ao modalManager (prioridade alta para sobrescrever modais comuns)
      if (window.__AjudanteEproc?.modalManager) {
        window.__AjudanteEproc.modalManager.registerModal(
          CONFIRM_ID,
          overlay,
          () => fechar(false),
          { priority: 100 }
        );
      }

      setTimeout(() => btnOk.focus(), 100);
    });
  }

  window.__AjudanteEproc.alertas = { sucesso, erro, confirmacao };
})();
