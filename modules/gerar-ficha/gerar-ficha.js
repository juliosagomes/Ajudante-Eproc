// modules/gerar-ficha/gerar-ficha.js
// Injeta botão "📄 Gerar Ficha" no Painel de Ações e gera uma ficha HTML do processo.
// Portado de Epryx/contentscript37.js.

(async function () {
  'use strict';

  // ─── Guards ──────────────────────────────────────────────────────
  if (window.self !== window.top) return;
  if (!window.location.href.includes('controlador.php?acao=processo_selecionar')) return;

  // ===================================================================================
  // UTILITÁRIOS
  // ===================================================================================

  const log  = (...a) => console.log ('%c[Ajudante Ficha]', 'color:#1a56db;font-weight:bold', ...a);
  const warn = (...a) => console.warn('%c[Ajudante Ficha]', 'color:#e07b00;font-weight:bold', ...a);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const qs  = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => [...r.querySelectorAll(s)];
  const txt = (s, fb = '—')     => qs(s)?.textContent.replace(/\s+/g, ' ').trim() || fb;

  async function waitForElement(selector, timeout = 10000, ctx = document) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = ctx.querySelector(selector);
      if (el && (el.offsetParent !== null || el.tagName === 'INPUT' || el.type === 'hidden')) return el;
      await sleep(250);
    }
    return null;
  }

  // ===================================================================================
  // CARREGAMENTO DA LIB QR (via recurso da extensão)
  // ===================================================================================

  async function carregarQRCodeLib() {
    try {
      const url = chrome.runtime.getURL('libs/qrcode.min.js');
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.text();
    } catch (e) {
      warn('Não foi possível carregar libs/qrcode.min.js:', e.message);
      return null;
    }
  }

  // ===================================================================================
  // EXTRAÇÃO DOS DADOS DO PROCESSO
  // ===================================================================================

  async function extrairDadosProcesso() {
    const numeroProcesso = txt('#txtNumProcesso');
    const classeAcao     = txt('#txtClasse');
    const competencia    = txt('#txtCompetencia');
    const dataAutuacao   = txt('#txtAutuacao');
    const situacao       = txt('#txtSituacao');
    const orgaoJulgador  = txt('#txtOrgaoJulgador');
    const magistrado     = txt('#txtMagistrado');
    const segredoJust    = txt('#txtSegredoJustica', '');

    const assuntos = qsa('#fldAssuntos table tbody tr')
      .map(r => r.querySelector('td:nth-child(2)')?.textContent.trim())
      .filter(Boolean);

    const linkMaisPartes = qs('a[id^="lnkOutrasPartes"]');
    if (linkMaisPartes) {
      log('Expandindo lista de partes...');
      linkMaisPartes.click();
      await sleep(1000);
    }

    function obterValorCausa() {
      for (const row of qsa('#tblCopiarExcel tr')) {
        const th = row.querySelector('th');
        if (th?.textContent.trim() === 'Valor da causa') {
          const raw = row.querySelector('td')?.textContent.replace(/ /g, '').trim();
          if (raw) {
            const num = parseFloat(raw.replace(',', '.'));
            return isNaN(num)
              ? 'R$ ' + raw
              : 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
        }
      }
      return '—';
    }
    const valorCausa = obterValorCausa();

    let telefoneJuizo = '—';
    let emailJuizo    = '—';
    const orgaoEl = qs('#txtOrgaoJulgador');
    if (orgaoEl) {
      const om = orgaoEl.getAttribute('onmouseover') || '';
      const argMatch = om.match(/infraTooltipMostrar\(\s*'([\s\S]*?)'\s*,/);
      if (argMatch) {
        const decoded = argMatch[1]
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'").replace(/&quot;/g, '"');
        const foneM  = decoded.match(/Fone\s*:\s*([^<\n]+)/i);
        const emailM = decoded.match(/E?-?mail\s*:\s*([^<\n]+)/i);
        if (foneM)  telefoneJuizo = foneM[1].trim();
        if (emailM) emailJuizo    = emailM[1].trim();
      }
    }

    log('Obtendo chave de acesso...');
    let chaveAcesso = null;

    async function obterChave() {
      let sp = qs('#spnChaveProcesso');
      if (sp?.textContent.trim()) return sp.textContent.trim();

      const infoContainer = qs('#fldInformacoesAdicionais_content');
      const legend        = qs('#legInfAdicional');
      if (legend && (!infoContainer || infoContainer.children.length === 0)) {
        legend.click();
        await new Promise((res, rej) => {
          const obs = new MutationObserver(() => {
            if (qs('#imgChaveProcesso')) { obs.disconnect(); res(); }
          });
          obs.observe(document.body, { childList: true, subtree: true });
          setTimeout(() => {
            obs.disconnect();
            qs('#imgChaveProcesso') ? res() : rej(new Error('Timeout fieldset'));
          }, 5000);
        });
      }

      sp = qs('#spnChaveProcesso');
      if (sp?.textContent.trim()) return sp.textContent.trim();

      const keyIcon = qs('#imgChaveProcesso');
      if (!keyIcon) throw new Error('#imgChaveProcesso não encontrado');
      if (keyIcon.style.display !== 'none') keyIcon.click();

      return new Promise((res, rej) => {
        const target = qs('#spnChaveProcesso') || document.body;
        const obs = new MutationObserver(() => {
          const k = qs('#spnChaveProcesso')?.textContent.trim();
          if (k) { obs.disconnect(); res(k); }
        });
        obs.observe(target, { childList: true, subtree: true, characterData: true });
        setTimeout(() => {
          obs.disconnect();
          const k = qs('#spnChaveProcesso')?.textContent.trim();
          k ? res(k) : rej(new Error('Timeout chave'));
        }, 5000);
      });
    }

    try {
      chaveAcesso = await obterChave();
      log('✅ Chave:', chaveAcesso);
    } catch (e) {
      warn('Chave não obtida:', e.message);
    }

    const mapaConsulta = {
      'eproc1g.tjsc.jus.br' : 'https://eprocwebcon.tjsc.jus.br/consulta1g/externo_controlador.php',
      'eproc2g.tjsc.jus.br' : 'https://eprocwebcon.tjsc.jus.br/consulta2g/externo_controlador.php',
      'eproc1g.tjrs.jus.br' : 'https://www.tjrs.jus.br/site_php/consulta/consulta_processo.php',
      'eproc1g.tjmg.jus.br' : 'https://eproc-consulta-publica-1g.tjmg.jus.br/',
      'eproc2g.tjmg.jus.br' : 'https://eproc-consulta-publica-2g.tjmg.jus.br/',
      'eproc.trf4.jus.br'   : 'https://eproc.trf4.jus.br/eproc2trf4/externo_controlador.php',
      'eproc.trf2.jus.br'   : 'https://eproc.trf2.jus.br/eproc/externo_controlador.php',
      'eproc1g.trf6.jus.br' : 'https://eproc1g.trf6.jus.br/eproc/externo_controlador.php',
      'eproc2g.trf6.jus.br' : 'https://eproc2g.trf6.jus.br/eproc/externo_controlador.php',
    };
    const base = Object.entries(mapaConsulta)
      .find(([h]) => location.href.includes(h))?.[1]
      ?? 'https://eprocwebcon.tjsc.jus.br/consulta1g/externo_controlador.php';
    const numDigitos   = numeroProcesso.replace(/\D/g, '');
    const linkConsulta = chaveAcesso && numDigitos
      ? `${base}?acao=processo_seleciona_publica&acao_origem=processo_consulta_publica&num_processo=${numDigitos}&num_chave=${chaveAcesso}`
      : '';

    const tabelaPartes = qs('#tblPartesERepresentantes');
    if (tabelaPartes) {
      const linksOutros = [...tabelaPartes.querySelectorAll('a')]
        .filter(a => a.textContent.toLowerCase().includes('outros'));
      for (const link of linksOutros) {
        log('Expandindo partes ocultas...');
        link.click();
        await sleep(500);
      }
    }

    function getPartesHtmlLimpo() {
      const orig = qs('#tblPartesERepresentantes');
      if (!orig) return '<p style="color:#999;font-style:italic">Tabela de partes não encontrada.</p>';

      const t = orig.cloneNode(true);

      t.querySelectorAll('a[title*="Histórico de Representantes"]').forEach(a => a.remove());
      t.querySelectorAll('.btn-parte-consulta-situacao').forEach(b => b.remove());
      t.querySelectorAll('span[aria-label*="procuração"]').forEach(s => s.remove());
      t.querySelectorAll('span[id^="iconeSituacaoPessoa"]').forEach(s => s.remove());
      t.querySelectorAll('style, script').forEach(s => s.remove());
      t.querySelectorAll('.material-icons,.material-icons-outlined,.material-icons-round').forEach(s => s.remove());
      t.querySelectorAll('div[id*="popover"],div[id*="widgetlink"],span[id*="card"]').forEach(s => s.remove());

      t.querySelectorAll('td, th, span, div').forEach(el => {
        el.querySelectorAll('a').forEach(a => {
          a.replaceWith(document.createTextNode(a.textContent.trim()));
        });
        if (el.childNodes.length > 0) {
          el.innerHTML = el.innerHTML.replace(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi, '');
        }
      });

      t.querySelectorAll('*').forEach(el => {
        [...el.attributes].forEach(at => {
          if (at.name.startsWith('on')) el.removeAttribute(at.name);
        });
      });

      return t.outerHTML;
    }

    return {
      numeroProcesso, classeAcao, competencia, dataAutuacao,
      situacao, orgaoJulgador, magistrado, segredoJust,
      assuntos, valorCausa, telefoneJuizo, emailJuizo,
      chaveAcesso, linkConsulta, numDigitos,
      partesHtml: getPartesHtmlLimpo(),
    };
  }

  // ===================================================================================
  // GERAÇÃO DO HTML DA FICHA
  // ===================================================================================

  function gerarHtmlFicha(dados, qrCodeLibText) {
    const {
      numeroProcesso, classeAcao, competencia, dataAutuacao,
      situacao, orgaoJulgador, magistrado, segredoJust,
      assuntos, valorCausa, telefoneJuizo, emailJuizo,
      chaveAcesso, linkConsulta, partesHtml,
    } = dados;

    const agora = new Date().toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const htmlAssuntos = assuntos.length
      ? assuntos.map(a => `<span class="badge">${a}</span>`).join('')
      : '<span class="nd">—</span>';

    const htmlQR = linkConsulta
      ? `<div class="qr-box">
          <div id="qr-canvas-container" style="display:flex;justify-content:center;margin-bottom:5px;"></div>
          <p class="qr-rot">Consulta pública</p>
        </div>`
      : `<div class="qr-box qr-off"><span class="nd">QR indisponível</span><small>chave não encontrada</small></div>`;

    const htmlLink = linkConsulta
      ? `<a class="link-url" href="${linkConsulta}" target="_blank">${linkConsulta}</a>`
      : '<span class="nd">Não disponível</span>';

    const htmlChave = chaveAcesso
      ? `<code class="mono">${chaveAcesso}</code>`
      : '<span class="nd">Não encontrada</span>';

    const htmlContatos = (telefoneJuizo !== '—' || emailJuizo !== '—') ? `
      <div class="divisor"></div>
      <section class="sec">
        <h2 class="sec-tit">Contatos do Juízo</h2>
        <div class="ig duas">
          ${telefoneJuizo !== '—' ? `<div class="ic">
            <div class="rot">Telefone</div>
            <div class="val"><a href="tel:${telefoneJuizo.replace(/\D/g,'')}" class="link-c">${telefoneJuizo}</a></div>
          </div>` : ''}
          ${emailJuizo !== '—' ? `<div class="ic">
            <div class="rot">E-mail</div>
            <div class="val"><a href="mailto:${emailJuizo}" class="link-c">${emailJuizo}</a></div>
          </div>` : ''}
        </div>
      </section>` : '';

    const scriptQR = qrCodeLibText && linkConsulta ? `
<script>
${qrCodeLibText}
</script>
<script>
  window.addEventListener('DOMContentLoaded', function() {
    var link = ${JSON.stringify(linkConsulta)};
    if (link && typeof QRCode !== 'undefined') {
      new QRCode(document.getElementById('qr-canvas-container'), {
        text: link,
        width: 116,
        height: 116,
        colorDark : '#000000',
        colorLight : '#ffffff',
        correctLevel : QRCode.CorrectLevel.M
      });
    }
  });
</script>` : '';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Ficha — ${numeroProcesso}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --az:  #0f2d5e;--azm: #1e4d99;--azc: #3b75d4;
  --fg:  #f0f4fb;--bd:  #c3d3ee;--tx:  #1a2840;
  --gz:  #5c7399;--fn: 'IBM Plex Sans',sans-serif;--fm: 'IBM Plex Mono',monospace;
}
body{font-family:var(--fn);font-size:11.5px;line-height:1.55;color:var(--tx);background:#d6dcea}
.pagina{width:210mm;min-height:297mm;margin:10mm auto;background:#fff;box-shadow:0 8px 40px rgba(0,0,0,.16);display:flex;flex-direction:column}
.cab{background:var(--az);color:#fff;display:flex;min-height:66px}
.cab-faixa{width:6px;background:var(--azc);flex-shrink:0}
.cab-in{flex:1;padding:13px 20px 13px 16px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.cab-rot{font-size:7.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.55;margin-bottom:3px}
.cab-num{font-family:var(--fm);font-size:19px;font-weight:600;letter-spacing:-.3px;line-height:1.1}
.cab-cl{font-size:10px;opacity:.8;margin-top:4px}
.pill{display:inline-block;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.24);border-radius:20px;padding:3px 11px;font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:3px}
.cab-dt{font-size:8px;opacity:.5;text-align:right}
.fv{background:var(--azm);color:#fff;padding:6px 22px;display:flex;align-items:baseline;gap:10px}
.fv-rot{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:.65}
.fv-val{font-family:var(--fm);font-size:17px;font-weight:600;letter-spacing:-.3px}
.corpo{flex:1;padding:16px 22px 12px}
.sec{margin-bottom:0}
.sec-tit{font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:var(--azc);margin-bottom:8px;padding-bottom:4px;border-bottom:1.5px solid var(--bd)}
.ig{display:grid;gap:7px 16px}
.ig.tres{grid-template-columns:repeat(3,1fr)}
.ig.duas{grid-template-columns:repeat(2,1fr)}
.ic-full{grid-column:1/-1}
.rot{font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gz);margin-bottom:2px}
.val{font-size:11.5px;font-weight:600;color:var(--tx);line-height:1.3}
.badge{display:inline-block;background:var(--fg);border:1px solid var(--bd);border-radius:3px;padding:2px 7px;font-size:9px;color:var(--az);margin:1px 2px 1px 0;font-weight:500}
.divisor{height:1px;background:var(--bd);margin:12px 0;opacity:.55}
.partes-wrap table{width:100%;border-collapse:collapse;font-size:10.5px}
.partes-wrap table th{background:var(--az);color:#fff;font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;padding:5px 8px;text-align:left}
.partes-wrap table td{padding:5px 8px;border-bottom:1px solid var(--fg);vertical-align:top;line-height:1.4;color:var(--tx)}
.partes-wrap table tr:last-child td{border-bottom:none}
.partes-wrap img{display:none}
.acesso-row{display:flex;gap:14px;align-items:flex-start}
.acesso-info{flex:1}
.acesso-info .ic{margin-bottom:9px}
.mono{font-family:var(--fm);font-size:10px;background:var(--fg);border:1px solid var(--bd);border-radius:3px;padding:3px 8px;letter-spacing:.4px;word-break:break-all;display:inline-block;max-width:100%}
.link-url{font-family:var(--fm);font-size:8.5px;color:var(--azc);word-break:break-all;text-decoration:none;line-height:1.5;display:block}
.link-url:hover{text-decoration:underline}
.link-c{color:var(--azc);text-decoration:none;font-weight:600}
.info-ok{margin-top:8px;padding:6px 10px;background:#edf6ea;border:1px solid #b5d9ac;border-radius:3px;font-size:9.5px;color:#256018;line-height:1.4}
.qr-box{flex-shrink:0;text-align:center;border:1px solid var(--bd);border-radius:5px;padding:10px 12px 8px;background:var(--fg);min-width:140px}
.qr-box canvas{border-radius:4px}
.qr-rot{font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gz);margin-top:6px}
.qr-off{display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:80px;color:#aab4c8;gap:4px;font-size:10px}
.qr-off small{font-size:8.5px}
.rod{background:var(--fg);border-top:1px solid var(--bd);padding:7px 22px;display:flex;justify-content:space-between;align-items:center;gap:12px}
.rod-av{font-size:7.5px;color:#8a9fbe;font-style:italic;flex:1}
.rod-dt{font-family:var(--fm);font-size:8px;color:#8a9fbe;white-space:nowrap}
.nd{color:#aab8cf;font-style:italic}
@media print{
  body{background:#fff}
  .pagina{margin:0;box-shadow:none;width:100%;min-height:auto;display:block}
  @page{size:A4;margin:8mm 10mm}
}
</style>
</head>
<body>
<div class="pagina">

<header class="cab">
  <div class="cab-faixa"></div>
  <div class="cab-in">
    <div>
      <div class="cab-rot">Ficha de Processo Judicial</div>
      <div class="cab-num">${numeroProcesso}</div>
      ${classeAcao !== '—' ? `<div class="cab-cl">${classeAcao}</div>` : ''}
    </div>
    <div>
      <div class="pill">${situacao !== '—' ? situacao : 'Em andamento'}</div>
      <div class="cab-dt">Autuação: ${dataAutuacao}</div>
    </div>
  </div>
</header>

<div class="fv">
  <span class="fv-rot">Valor da Causa</span>
  <span class="fv-val">${valorCausa}</span>
</div>

<main class="corpo">

  <section class="sec">
    <h2 class="sec-tit">Dados da Ação</h2>
    <div class="ig tres">
      <div class="ic">
        <div class="rot">Classe</div>
        <div class="val">${classeAcao}</div>
      </div>
      <div class="ic">
        <div class="rot">Competência</div>
        <div class="val">${competencia}</div>
      </div>
      <div class="ic">
        <div class="rot">Situação</div>
        <div class="val">${situacao}</div>
      </div>
      ${assuntos.length ? `<div class="ic ic-full">
        <div class="rot">Assunto(s)</div>
        <div class="val">${htmlAssuntos}</div>
      </div>` : ''}
      ${segredoJust ? `<div class="ic ic-full">
        <div class="rot">Segredo de Justiça</div>
        <div class="val">${segredoJust}</div>
      </div>` : ''}
    </div>
  </section>

  <div class="divisor"></div>

  <section class="sec">
    <h2 class="sec-tit">Dados do Juízo</h2>
    <div class="ig duas">
      <div class="ic">
        <div class="rot">Órgão Julgador</div>
        <div class="val">${orgaoJulgador}</div>
      </div>
      <div class="ic">
        <div class="rot">Magistrado(a)</div>
        <div class="val">${magistrado}</div>
      </div>
    </div>
  </section>

  ${htmlContatos}

  <div class="divisor"></div>

  <section class="sec">
    <h2 class="sec-tit">Partes e Representantes</h2>
    <div class="partes-wrap">${partesHtml}</div>
  </section>

  <div class="divisor"></div>

  <section class="sec">
    <h2 class="sec-tit">Acesso ao Processo</h2>
    <div class="acesso-row">
      <div class="acesso-info">
        <div class="ic">
          <div class="rot">Chave de Acesso</div>
          <div class="val">${htmlChave}</div>
        </div>
        <div class="ic">
          <div class="rot">Link para Consulta Pública</div>
          <div class="val">${htmlLink}</div>
        </div>
        ${linkConsulta ? `<div class="info-ok">
          <strong>Como consultar:</strong> Acesse o link acima ou escaneie o QR Code para
          acompanhar o processo sem necessidade de senha ou login.
        </div>` : ''}
      </div>
      ${htmlQR}
    </div>
  </section>

</main>

<footer class="rod">
  <span class="rod-av">Documento gerado automaticamente. Consulte sempre o sistema oficial.</span>
  <span class="rod-dt">Gerado em ${agora}</span>
</footer>

</div>
${scriptQR}
</body>
</html>`;
  }

  // ===================================================================================
  // ORQUESTRADOR PRINCIPAL (chamado pelo clique no botão)
  // ===================================================================================

  async function gerarFicha(btn) {
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Gerando ficha...';

    try {
      log('Carregando lib QR...');
      const qrCodeLibText = await carregarQRCodeLib();

      log('Extraindo dados do processo...');
      const dados = await extrairDadosProcesso();

      log('Montando HTML da ficha...');
      const html = gerarHtmlFicha(dados, qrCodeLibText);

      log('Abrindo ficha em nova aba...');
      const blob    = new Blob([html], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const aba     = window.open(blobUrl, '_blank');

      if (!aba) {
        warn('Popup bloqueado — fazendo download...');
        const a = document.createElement('a');
        a.href     = blobUrl;
        a.download = `ficha_${dados.numDigitos || 'proc'}.html`;
        a.click();
      } else {
        log('✅ Ficha gerada com sucesso!');
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 90_000);

    } catch (err) {
      console.error('[Ajudante Ficha] Erro ao gerar ficha:', err);
      alert(`[Ajudante Ficha] Erro ao gerar ficha: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = textoOriginal;
    }
  }

  // ===================================================================================
  // INICIALIZAÇÃO
  // ===================================================================================

  const data = await new Promise(r => chrome.storage.local.get('eprocSettings', r));
  if (!data.eprocSettings?.modules?.gerarFicha?.enabled) return;

  // Aguarda a área de dados do processo estar pronta
  const numEl = await waitForElement('#txtNumProcesso', 10000);
  if (!numEl) return;

  // Evita injeção duplicada
  if (document.getElementById('ajudante-btn-gerar-ficha')) return;

  // Aguarda o painel criado pelo painel-acoes.js (pode ter leve delay async)
  let container = null;
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    container = document.getElementById('ajudante-painel-botoes');
    if (container) break;
    await sleep(100);
  }
  // Fallback: pede ao painel-acoes para criar o container (o que inclui criar o fieldset)
  if (!container && window.__AjudanteEproc?.getPainelAcoesContainer) {
    container = window.__AjudanteEproc.getPainelAcoesContainer();
  }
  if (!container) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'ajudante-btn-gerar-ficha';
  btn.className = 'ajudante-btn infraButton';
  btn.innerHTML = '📄 Gerar Ficha';
  btn.title = 'Gera uma ficha resumida do processo em HTML para impressão ou consulta rápida';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    gerarFicha(btn);
  });
  container.appendChild(btn);
  log('✅ Botão "Gerar Ficha" injetado.');

})();
