// modules/expansor-numero-processo/expansor-numero-processo.js
// Expande formatos abreviados no campo de busca rápida do Eproc.

(function () {
  'use strict';

  if (!window.location.hostname.includes('eproc')) return;

  const SETTINGS_KEY = 'eprocSettings';
  const MODULE_NAME  = 'expansorNumeroProcesso';
  const FIELD_ID     = 'txtNumProcessoPesquisaRapida';

  const J_FIXO  = '8';
  const TR_FIXO = '13';

  let moduloAtivo = false;
  let observer    = null;
  let cfg         = { defaultOOOO: '', anoMin: 2010 };
  // Mapa: input.id ou referência → { handler, errEl }
  const camposGrudados = new WeakMap();

  // ═══════════════════════════════════════════════════════════════
  // ALGORITMO CNJ — Mod 97 base 10 (ISO 7064:2003)
  // ═══════════════════════════════════════════════════════════════

  function calcularDD(N, A, J, TR, O) {
    const base = BigInt(`${N}${A}${J}${TR}${O}00`);
    const dd = 98n - (base % 97n);
    return dd.toString().padStart(2, '0');
  }

  function validarNumeroCompleto(numero20digitos) {
    if (!/^\d{20}$/.test(numero20digitos)) return false;
    // Formato canônico: N(7) + DD(2) + A(4) + J(1) + TR(2) + O(4).
    // Para o mod 97, reordena para (N + A + J + TR + O + DD).
    const N  = numero20digitos.substring(0, 7);
    const DD = numero20digitos.substring(7, 9);
    const A  = numero20digitos.substring(9, 13);
    const J  = numero20digitos.substring(13, 14);
    const TR = numero20digitos.substring(14, 16);
    const O  = numero20digitos.substring(16, 20);
    return BigInt(`${N}${A}${J}${TR}${O}${DD}`) % 97n === 1n;
  }

  function deduzirAno(N, DD, OOOO, J = J_FIXO, TR = TR_FIXO, anoMin = 2010) {
    const anoMax = new Date().getFullYear() + 1;
    for (let ano = anoMax; ano >= anoMin; ano--) {
      const full = `${N}${ano}${J}${TR}${OOOO}${DD}`;
      if (BigInt(full) % 97n === 1n) return String(ano);
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════
  // PARSER
  // ═══════════════════════════════════════════════════════════════

  function expandir(input, config) {
    const raw = String(input || '').trim();
    if (!raw) return { ok: false, erro: 'vazio' };

    const apenasDigitos = raw.replace(/\D/g, '');

    // Caso 1 e 6: 20 dígitos (canônico formatado vira 20 após strip)
    if (apenasDigitos.length === 20) {
      if (!validarNumeroCompleto(apenasDigitos)) {
        return { ok: false, erro: 'Número completo inválido (dígito verificador incorreto).' };
      }
      return { ok: true, numero: apenasDigitos, modo: 'completo' };
    }

    // Separar override OOOO (primeira ocorrência de '.')
    let prefixo, oooOverride;
    const idxPonto = raw.indexOf('.');
    if (idxPonto !== -1) {
      prefixo     = raw.substring(0, idxPonto);
      oooOverride = raw.substring(idxPonto + 1);
      if (!/^\d{4}$/.test(oooOverride)) {
        return { ok: false, erro: 'Código do órgão deve ter exatamente 4 dígitos.' };
      }
    } else {
      prefixo     = raw;
      oooOverride = null;
    }

    const OOOO = oooOverride ?? (config.defaultOOOO || '');
    if (!/^\d{4}$/.test(OOOO)) {
      return { ok: false, erro: 'Configure o órgão padrão nas opções da extensão.' };
    }

    // Modo N-DD vs N+YY
    let parteN, parteDD = null, YY = null, modoAno = 'YY';
    const idxTraco = prefixo.indexOf('-');
    if (idxTraco !== -1) {
      parteN  = prefixo.substring(0, idxTraco);
      parteDD = prefixo.substring(idxTraco + 1);
      modoAno = 'DD';
      if (!/^\d+$/.test(parteN) && parteN !== '') {
        return { ok: false, erro: 'Formato de input não reconhecido.' };
      }
      if (!/^\d{2}$/.test(parteDD)) {
        return { ok: false, erro: 'DD deve ter exatamente 2 dígitos.' };
      }
    } else {
      if (!/^\d+$/.test(prefixo)) {
        return { ok: false, erro: 'Formato de input não reconhecido.' };
      }
      if (prefixo.length < 2) {
        return { ok: false, erro: 'Formato inválido: ano ausente ou incompleto.' };
      }
      YY     = prefixo.slice(-2);
      parteN = prefixo.slice(0, -2);
    }

    if (parteN === '') {
      return { ok: false, erro: 'Número sequencial inválido.' };
    }
    if (!/^\d{1,6}$/.test(parteN)) {
      return { ok: false, erro: 'Número sequencial inválido.' };
    }

    const NNNNNNN = '1' + parteN.padStart(6, '0');

    let AAAA, DD, modoFinal;
    if (modoAno === 'YY') {
      AAAA = '20' + YY;
      DD   = calcularDD(NNNNNNN, AAAA, J_FIXO, TR_FIXO, OOOO);
      modoFinal = oooOverride ? 'N+YY+OOOO' : 'N+YY';
    } else {
      DD = parteDD;
      const ano = deduzirAno(NNNNNNN, DD, OOOO, J_FIXO, TR_FIXO, config.anoMin || 2010);
      if (!ano) {
        return { ok: false, erro: 'DD não confere. Verifique o número, o DD ou o órgão.' };
      }
      AAAA = ano;
      modoFinal = oooOverride ? 'N-DD+OOOO' : 'N-DD';
    }

    // Formato canônico: N + DD + A + J + TR + O
    const numero = `${NNNNNNN}${DD}${AAAA}${J_FIXO}${TR_FIXO}${OOOO}`;
    return { ok: true, numero, modo: modoFinal };
  }

  // ═══════════════════════════════════════════════════════════════
  // UI — mensagem de erro inline abaixo do campo
  // ═══════════════════════════════════════════════════════════════

  function obterOuCriarErrEl(field) {
    let errEl = field._exproErrEl;
    if (errEl && errEl.isConnected) return errEl;

    errEl = document.createElement('div');
    errEl.className = 'expro-erro';
    errEl.setAttribute('role', 'alert');
    errEl.style.display = 'none';
    field.insertAdjacentElement('afterend', errEl);
    field._exproErrEl = errEl;
    return errEl;
  }

  function mostrarErro(field, msg) {
    const errEl = obterOuCriarErrEl(field);
    errEl.textContent = msg;
    errEl.style.display = '';
  }

  function limparErro(field) {
    const errEl = field._exproErrEl;
    if (errEl) errEl.style.display = 'none';
  }

  // ═══════════════════════════════════════════════════════════════
  // HOOK no campo do Eproc
  // ═══════════════════════════════════════════════════════════════

  function grudarHandler(field) {
    if (camposGrudados.has(field)) return;

    const onKeyDown = (e) => {
      if (e.key !== 'Enter') return;

      const valor = field.value;
      if (!valor || !valor.trim()) {
        // Input vazio: deixa fluir (sem ação).
        return;
      }

      const resultado = expandir(valor, cfg);
      if (resultado.ok) {
        field.value = resultado.numero;
        limparErro(field);
        // Deixa o submit/validação nativa fluir.
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      mostrarErro(field, resultado.erro);
    };

    const onInput = () => limparErro(field);

    field.addEventListener('keydown', onKeyDown, true);
    field.addEventListener('input', onInput);

    camposGrudados.set(field, { onKeyDown, onInput });
  }

  function desgrudarHandler(field) {
    const refs = camposGrudados.get(field);
    if (!refs) return;
    field.removeEventListener('keydown', refs.onKeyDown, true);
    field.removeEventListener('input', refs.onInput);
    camposGrudados.delete(field);
    if (field._exproErrEl) {
      field._exproErrEl.remove();
      delete field._exproErrEl;
    }
  }

  function varrer() {
    const field = document.getElementById(FIELD_ID);
    if (field) grudarHandler(field);
  }

  // ═══════════════════════════════════════════════════════════════
  // CICLO DE VIDA
  // ═══════════════════════════════════════════════════════════════

  function lerCfg(callback) {
    chrome.storage.local.get(SETTINGS_KEY, (data) => {
      const m = data[SETTINGS_KEY]?.modules?.[MODULE_NAME] || {};
      cfg = {
        defaultOOOO: typeof m.defaultOOOO === 'string' ? m.defaultOOOO : '',
        anoMin:      Number.isFinite(m.anoMin) ? m.anoMin : 2010,
      };
      if (callback) callback();
    });
  }

  function ativarModulo() {
    if (moduloAtivo) return;
    moduloAtivo = true;

    lerCfg(() => {
      varrer();
      observer = new MutationObserver(varrer);
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

    const field = document.getElementById(FIELD_ID);
    if (field) desgrudarHandler(field);
  }

  // ─── Reagir a mudanças de settings em tempo real ────────────────
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[SETTINGS_KEY]) return;
    const novo = changes[SETTINGS_KEY].newValue || {};
    const m = novo.modules?.[MODULE_NAME] || {};
    const enabled = m.enabled ?? true;

    cfg = {
      defaultOOOO: typeof m.defaultOOOO === 'string' ? m.defaultOOOO : '',
      anoMin:      Number.isFinite(m.anoMin) ? m.anoMin : 2010,
    };

    if (enabled && !moduloAtivo) ativarModulo();
    if (!enabled && moduloAtivo) desativarModulo();
  });

  // ─── Inicialização condicional ──────────────────────────────────
  chrome.storage.local.get(SETTINGS_KEY, (data) => {
    const enabled = data[SETTINGS_KEY]?.modules?.[MODULE_NAME]?.enabled ?? true;
    if (enabled) ativarModulo();
  });

  // ═══════════════════════════════════════════════════════════════
  // Auto-teste manual (gated por window.__EXPANSOR_TESTAR === true)
  // Cole no console: window.__EXPANSOR_TESTAR = true; location.reload();
  // ═══════════════════════════════════════════════════════════════
  if (typeof window !== 'undefined' && window.__EXPANSOR_TESTAR === true) {
    const testCfg = { defaultOOOO: '0702', anoMin: 2010 };
    const casos = [
      // [input, esperado, modo]
      ['43325',                        '10004330720258130702', 'N+YY'],
      ['433-07',                       '10004330720258130702', 'N-DD'],
      ['43325.0702',                   '10004330720258130702', 'N+YY+OOOO'],
      ['433-07.0702',                  '10004330720258130702', 'N-DD+OOOO'],
      ['1000433-07.2025.8.13.0702',    '10004330720258130702', 'completo'],
      ['10004330720258130702',         '10004330720258130702', 'completo'],
      ['  43325  ',                    '10004330720258130702', 'N+YY'],
    ];
    const erros = [
      ['abc'],
      ['43325.123'],
      ['43325.12345'],
      ['43'],
      ['1234567890.0702'],
      ['433-99.0702'],
      ['10004330720258130703'],
    ];
    console.group('[Expansor] Auto-teste');
    casos.forEach(([inp, esperado, modo]) => {
      const r = expandir(inp, testCfg);
      const ok = r.ok && r.numero === esperado;
      console[ok ? 'log' : 'error'](
        `${ok ? '✓' : '✗'} ${JSON.stringify(inp)} → ${r.ok ? r.numero : r.erro} (modo: ${r.modo || '-'})`
      );
    });
    erros.forEach(([inp]) => {
      const r = expandir(inp, testCfg);
      console[!r.ok ? 'log' : 'error'](
        `${!r.ok ? '✓' : '✗'} ${JSON.stringify(inp)} → erro esperado: ${r.ok ? `MAS PASSOU: ${r.numero}` : r.erro}`
      );
    });
    // Sanidade isolada
    console.log('calcularDD(1000433,2025,8,13,0702) =',
      calcularDD('1000433', '2025', '8', '13', '0702'), '(esperado 07)');
    console.log('validarNumeroCompleto(10004330720258130702) =',
      validarNumeroCompleto('10004330720258130702'), '(esperado true)');
    console.log('deduzirAno(1000433, 07, 0702) =',
      deduzirAno('1000433', '07', '0702'), '(esperado 2025)');
    console.log('deduzirAno(1000433, 99, 0702) =',
      deduzirAno('1000433', '99', '0702'), '(esperado null)');
    console.groupEnd();
  }

})();
