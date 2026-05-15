// lib/modal-manager.js — Gerenciador universal de modais do Ajudante Eproc
// Garante que ESC feche apenas o modal/tela ativa (maior z-index/prioridade),
// aplica focus trap e isola o scroll do modal sob o cursor.

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  window.__AjudanteEproc = window.__AjudanteEproc || {};
  if (window.__AjudanteEproc.modalManager) return;

  const FOCUSABLE_SELECTOR = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  const manager = {
    modals: new Map(),
    escListenerActive: false,
    _escHandler: null,

    registerModal(id, element, closeCallback, options = {}) {
      const modal = {
        id,
        element,
        closeCallback,
        zIndex: this.getZIndex(element),
        priority: options.priority || 0,
        preventClose: options.preventClose || false,
        disableFocusTrap: options.disableFocusTrap || false,
        timestamp: Date.now(),
        focusTrapHandler: null
      };

      this.modals.set(id, modal);
      this.updateZIndex(id);
      this.ensureEscListener();
      if (!modal.disableFocusTrap) this.activateFocusTrap(id);
    },

    unregisterModal(id) {
      if (!this.modals.has(id)) return;
      this.deactivateFocusTrap(id);
      this.modals.delete(id);

      if (this.modals.size === 0) {
        this.removeEscListener();
        return;
      }

      const active = this.getActiveModal();
      if (active && !active.disableFocusTrap) {
        this.activateFocusTrap(active.id);
        setTimeout(() => {
          if (!active.element) return;
          const rodape = active.element.querySelector('div, footer');
          let btn = rodape ? rodape.querySelector('button') : null;
          if (!btn) btn = active.element.querySelector('button');
          if (btn) {
            btn.focus({ preventScroll: true });
            btn.style.outline = 'none';
            btn.style.boxShadow = 'none';
          }
        }, 30);
      }
    },

    getZIndex(element) {
      const zIndex = parseInt(window.getComputedStyle(element).zIndex, 10);
      return isNaN(zIndex) ? 0 : zIndex;
    },

    updateZIndex(id) {
      const modal = this.modals.get(id);
      if (modal) modal.zIndex = this.getZIndex(modal.element);
    },

    getActiveModal() {
      if (this.modals.size === 0) return null;

      let activeModal = null;
      let maxZIndex = -1;
      let maxPriority = -1;
      let newestTimestamp = 0;

      for (const modal of this.modals.values()) {
        if (!document.body.contains(modal.element)) {
          this.unregisterModal(modal.id);
          continue;
        }

        const currentZIndex = this.getZIndex(modal.element);
        modal.zIndex = currentZIndex;

        const shouldSelect =
          modal.priority > maxPriority ||
          (modal.priority === maxPriority && currentZIndex > maxZIndex) ||
          (modal.priority === maxPriority && currentZIndex === maxZIndex && modal.timestamp > newestTimestamp);

        if (shouldSelect) {
          activeModal = modal;
          maxZIndex = currentZIndex;
          maxPriority = modal.priority;
          newestTimestamp = modal.timestamp;
        }
      }

      return activeModal;
    },

    ensureEscListener() {
      if (this.escListenerActive) return;
      this._escHandler = this.handleEscKey.bind(this);
      document.addEventListener('keydown', this._escHandler, { capture: true, passive: false });
      this.escListenerActive = true;
    },

    removeEscListener() {
      if (!this.escListenerActive || !this._escHandler) return;
      document.removeEventListener('keydown', this._escHandler, { capture: true, passive: false });
      this._escHandler = null;
      this.escListenerActive = false;
    },

    handleEscKey(event) {
      if (event.key !== 'Escape') return;

      // Exceção: input de filtro com texto — ESC limpa em vez de fechar
      const ativo = document.activeElement;
      if (
        ativo &&
        ativo.tagName === 'INPUT' &&
        (ativo.placeholder === '' || ativo.placeholder === undefined) &&
        ativo.parentElement &&
        ativo.parentElement.querySelector('div') &&
        ativo.parentElement.querySelector('div').textContent?.includes('Digite algo para filtrar') &&
        ativo.value && ativo.value.length > 0
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        ativo.value = '';
        ativo.dispatchEvent(new Event('input', { bubbles: true }));
        ativo.style.caretColor = 'transparent';
        ativo.tabIndex = -1;
        ativo.blur();
        if (typeof window.atualizarVisibilidadeFiltro === 'function') {
          window.atualizarVisibilidadeFiltro();
        }
        return;
      }

      const activeModal = this.getActiveModal();
      if (!activeModal) return;
      if (activeModal.preventClose) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      try { activeModal.closeCallback(); } catch (_) {}
      this.unregisterModal(activeModal.id);
    },

    closeModal(id) {
      const modal = this.modals.get(id);
      if (!modal) return;
      try { modal.closeCallback(); } catch (_) {}
      this.unregisterModal(id);
    },

    closeAllModals() {
      Array.from(this.modals.keys()).forEach((id) => this.closeModal(id));
    },

    listActiveModals() {
      return Array.from(this.modals.values()).map((m) => ({
        id: m.id,
        zIndex: m.zIndex,
        priority: m.priority,
        timestamp: m.timestamp,
        element:
          m.element.tagName +
          (m.element.id ? `#${m.element.id}` : '') +
          (m.element.className ? `.${String(m.element.className).split(' ').join('.')}` : '')
      }));
    },

    activateFocusTrap(id) {
      const modal = this.modals.get(id);
      if (!modal || !modal.element) return;

      const handler = function (e) {
        if (e.key !== 'Tab') return;
        const focusables = Array.from(modal.element.querySelectorAll(FOCUSABLE_SELECTOR))
          .filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (!modal.element.contains(document.activeElement)) {
          first.focus();
          e.preventDefault();
          return;
        }
        if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        } else if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      };

      modal.focusTrapHandler = handler;
      modal.element.addEventListener('keydown', handler, true);

      setTimeout(() => {
        const focusables = Array.from(modal.element.querySelectorAll(FOCUSABLE_SELECTOR))
          .filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0);
        if (focusables.length > 0) focusables[0].focus();
      }, 10);
    },

    deactivateFocusTrap(id) {
      const modal = this.modals.get(id);
      if (modal && modal.element && modal.focusTrapHandler) {
        modal.element.removeEventListener('keydown', modal.focusTrapHandler, true);
        modal.focusTrapHandler = null;
      }
    }
  };

  // Isolamento de scroll: bloqueia "scroll chaining" para a página atrás do modal
  function handleModalWheel(e) {
    if (!manager.modals.size) return;

    let modalUnderMouse = null;
    for (const modal of manager.modals.values()) {
      if (!modal.element) continue;
      const rect = modal.element.getBoundingClientRect();
      if (
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom
      ) {
        modalUnderMouse = modal;
        break;
      }
    }
    if (!modalUnderMouse) return;

    let el = document.elementFromPoint(e.clientX, e.clientY);
    let scrollTarget = null;
    while (el && el !== modalUnderMouse.element.parentElement) {
      const overflowY = window.getComputedStyle(el).overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        scrollTarget = el;
        break;
      }
      el = el.parentElement;
    }
    if (!scrollTarget) scrollTarget = modalUnderMouse.element;

    const canScroll = scrollTarget.scrollHeight > scrollTarget.clientHeight;
    if (canScroll) {
      const atTop = scrollTarget.scrollTop === 0;
      const atBottom = Math.abs(scrollTarget.scrollTop + scrollTarget.clientHeight - scrollTarget.scrollHeight) < 1;
      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
        e.preventDefault();
        e.stopPropagation();
      }
    } else {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  document.addEventListener('wheel', handleModalWheel, { passive: false, capture: true });
  window.addEventListener('wheel', handleModalWheel, { passive: false, capture: true });

  window.__AjudanteEproc.modalManager = manager;

  if (typeof console !== 'undefined') {
    console.ajudanteModals = () => manager.listActiveModals();
  }
})();
