// termos/termos.js — Página de aceitação dos Termos de Uso

(function () {
  'use strict';

  // ─── Scroll-spy + smooth scroll ────────────────────────────────
  const viewport = document.querySelector('.viewport');
  const tocItems = document.querySelectorAll('.toc__item');
  const sections = [];

  tocItems.forEach((item) => {
    const id = item.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) sections.push({ item, el });

    item.addEventListener('click', (e) => {
      e.preventDefault();
      if (el) {
        viewport.scrollTo({
          top: el.offsetTop - 8,
          behavior: 'smooth',
        });
      }
    });
  });

  function updateActive() {
    const scrollPos = viewport.scrollTop + 60;
    let activeIdx = 0;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].el.offsetTop <= scrollPos) activeIdx = i;
    }
    tocItems.forEach((it) => it.classList.remove('is-active'));
    if (sections[activeIdx]) sections[activeIdx].item.classList.add('is-active');
  }

  viewport.addEventListener('scroll', updateActive, { passive: true });
  updateActive();

  // ─── Botões ────────────────────────────────────────────────────
  document.getElementById('btnAceitarTermos').addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ tipo: 'aceitarTermos' }, () => window.close());
    } else {
      alert('✓ Termos aceitos (preview)');
    }
  });

  document.getElementById('btnDesinstalar').addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.management) {
      chrome.management.uninstallSelf({ showConfirmDialog: true });
    } else {
      alert('Em produção: abre o diálogo de desinstalação da extensão.');
    }
  });
})();
