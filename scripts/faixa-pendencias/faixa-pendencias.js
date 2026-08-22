// scripts/faixa-pendencias/faixa-pendencias.js
// Injeta uma faixa de "pílulas" acima da capa do processo (#fldCapa) resumindo o que
// está pendente: prazos abertos, mandados aguardando cumprimento, audiências pendentes
// e remessas em curso. Portado do Epryx v8.1.4 (src/pendenciaspanel/).
//
// 100% determinístico: cada pílula corresponde a algo que o próprio Eproc afirma.
// Prazos, mandados e remessas são lidos do DOM já carregado (sem rede); audiências
// exigem uma consulta à tela `acao=audiencia_listar` própria do Eproc.
//
// Se nenhuma pendência for encontrada, a faixa não é criada (e é removida, se existia
// de um render anterior) — evita ocupar espaço para informar ausência.

(function () {
    'use strict';

    if (window.self !== window.top) return; // a capa roda com all_frames: true

    chrome.runtime.sendMessage({ tipo: 'obterSettings' }, ({ settings }) => {
        if (!settings?.scripts?.faixaPendencias?.enabled) return;

        const LOG = '[Ajudante Eproc] Faixa de Pendências:';
        const ANCHOR = '#fldCapa';
        const BAR_ID = 'pdp-bar';
        const LIMIAR_URGENTE_DIAS = 3;

        // Linhas de evento na capa. Deliberadamente sem ancorar em #tblEventos (o id da
        // tabela é detalhe interno de uma etapa intermediária da paginação do Eproc).
        const SEL_LINHA_EVENTO = 'tr[id^="trEvento"]';

        // ==============================================================================
        //  Utilidades de data
        // ==============================================================================

        /** 'DD/MM/AAAA hh:mm:ss' -> Date (meia-noite local). null se não casar. */
        function parseDataBR(texto) {
            const m = String(texto || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (!m) return null;
            return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        }

        /** Dias corridos de hoje até a data (negativo = já passou). null se não der. */
        function diasAte(texto) {
            const d = parseDataBR(texto);
            if (!d) return null;
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            return Math.round((d - hoje) / 86400000);
        }

        // null = sem realce; a pílula fica com a cor de repouso do próprio tipo.
        function tomPorDias(dias) {
            if (dias === null) return null;
            if (dias < 0) return 'vencido';
            if (dias <= LIMIAR_URGENTE_DIAS) return 'urgente';
            return null;
        }

        function textoDePrazo(dias) {
            if (dias === null) return '';
            if (dias < 0) return `vencido há ${Math.abs(dias)} d`;
            if (dias === 0) return 'vence hoje';
            if (dias === 1) return 'vence amanhã';
            return `faltam ${dias} d`;
        }

        function numeroDoProcesso() {
            const daUrl = (String(location.href).match(/num_processo=(\d{20})/) || [])[1];
            if (daUrl) return daUrl;
            const campo = document.querySelector('#txtNumProcesso, [name="txtNumProcesso"]');
            const doCampo = campo && String(campo.value || campo.textContent || '').replace(/\D/g, '');
            if (doCampo && doCampo.length === 20) return doCampo;
            const daPagina = (document.body.innerHTML.match(/num_processo=(\d{20})/) || [])[1];
            return daPagina || '';
        }

        // ==============================================================================
        //  PRAZOS ABERTOS — lidos do DOM da capa, sem requisição
        // ==============================================================================

        function coletarPrazos(doc) {
            const alvo = doc || document;
            const prazos = Array.from(alvo.querySelectorAll('tr.infraEventoPrazoAberto')).map(tr => {
                const lupa = tr.querySelector('a[data-infoevento]');
                const info = lupa ? String(lupa.getAttribute('data-infoevento') || '') : '';
                const limpo = info.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
                const parteEl = tr.querySelector('.infraEventoPrazoParte');
                return {
                    seq: (String(tr.id || '').match(/(\d+)/) || [])[1] || '',
                    parte: parteEl ? String(parteEl.textContent || '').trim() : '',
                    dataFinal: (limpo.match(/Data Final do Prazo:\s*([\d/]+(?:\s[\d:]+)?)/i) || [])[1] || '',
                    descricao: String((tr.querySelector('td.infraEventoDescricao') || {}).textContent || '')
                        .replace(/\s+/g, ' ').trim().slice(0, 200)
                };
            }).filter(p => p.seq);

            return prazos.map(p => {
                const dias = diasAte(p.dataFinal);
                const restante = textoDePrazo(dias);
                const parte = String(p.parte || '').trim();
                return {
                    rotulo: p.seq ? `Ev. ${p.seq}` : 'Prazo',
                    detalhe: parte || null,
                    data: (String(p.dataFinal || '').match(/\d{2}\/\d{2}\/\d{4}/) || [null])[0],
                    tom: tomPorDias(dias),
                    titulo: [
                        p.seq ? `Evento ${p.seq}` : null,
                        parte ? `Parte: ${parte}` : null,
                        p.dataFinal ? `Prazo final: ${p.dataFinal}` : null,
                        restante || null,
                        p.descricao || null
                    ].filter(Boolean).join('\n')
                };
            });
        }

        // ==============================================================================
        //  MANDADOS AGUARDANDO CUMPRIMENTO — lidos da capa, sem rede
        // ==============================================================================
        //
        // O Eproc renderiza o status ATUAL do mandado dentro da linha do evento de
        // expedição (não um retrato do momento da expedição), então não é preciso ir à
        // rede. Só o evento de EXPEDIÇÃO conta — "Recebido para cumprimento" carrega o
        // mesmo span, mas é outra etapa do mesmo mandado.
        //
        // Whitelist, não blacklist: só casa "Aguardando cumprimento". Um status
        // desconhecido não vira pílula — errar para menos é o lado seguro aqui.
        const RE_EXPEDICAO_MANDADO = /^\s*Expedi(?:ção|do)\s+(?:de\s+)?mandado/i;
        const RE_MANDADO_PENDENTE = /aguardando\s+cumprimento/i;

        function coletarMandados(doc) {
            const alvo = doc || document;
            const linhas = Array.from(alvo.querySelectorAll(SEL_LINHA_EVENTO));

            const oficialPorMandado = {};
            linhas.forEach(tr => {
                const span = tr.querySelector('span[id^="dadosMandado"]');
                const id = span && (span.id.match(/^dadosMandado(\d+)_/) || [])[1];
                if (!id) return;
                const m = String(tr.textContent || '').replace(/\s+/g, ' ')
                    .match(/Oficial:\s*([A-ZÀ-Ÿ][^:]{2,60}?)(?:\s*Destinatário:|$)/);
                if (m && !oficialPorMandado[id]) oficialPorMandado[id] = m[1].trim();
            });

            const vistos = new Set();
            const pilulas = [];

            for (const tr of linhas) {
                const td = tr.querySelector('td.infraEventoDescricao');
                if (!td) continue;
                const rotulo = String((td.querySelector('label') || {}).textContent || '').trim();
                if (!RE_EXPEDICAO_MANDADO.test(rotulo)) continue;

                const texto = String(td.textContent || '').replace(/\s+/g, ' ').trim();
                if (!RE_MANDADO_PENDENTE.test(texto)) continue;

                const span = td.querySelector('span[id^="dadosMandado"]');
                const idMandado = span && (span.id.match(/^dadosMandado(\d+)_/) || [])[1];
                const seq = (String(tr.id || '').match(/(\d+)/) || [])[1] || '';

                const chave = idMandado || `ev${seq}`;
                if (vistos.has(chave)) continue;
                vistos.add(chave);

                const dataHora = String((tr.children[2] || {}).textContent || '').replace(/\s+/g, ' ').trim();
                const data = (dataHora.match(/\d{2}\/\d{2}\/\d{4}/) || [null])[0];

                const dados = span ? String(span.textContent || '').replace(/\s+/g, ' ').trim() : texto;
                const destinatario = ((dados.match(/Destinatário:\s*([^(]+?)(?:\s*\(|Número do mandado|$)/) || [])[1] || '').trim();
                const prazo = (dados.match(/Prazo:\s*(\d+\s*dias?[^)]*)/) || [])[1] || '';
                const numero = (dados.match(/Número do mandado:\s*(\S+)/) || [])[1]
                    || (texto.match(/Mandado n[ºo]:\s*(\S+)/) || [])[1] || '';
                const sistema = (texto.match(/^\s*Expedi(?:ção|do)\s+(?:de\s+)?mandado\s*-\s*([A-Z]{2,12})\s*-/) || [])[1] || '';

                pilulas.push({
                    rotulo: seq ? `Ev. ${seq}` : 'Mandado',
                    detalhe: destinatario || null,
                    data,
                    // Sem realce de propósito: aguardar cumprimento é o estado normal de
                    // um mandado recém-expedido, não uma anomalia.
                    tom: null,
                    titulo: [
                        numero ? `Mandado nº ${numero}` : null,
                        sistema ? `Sistema: ${sistema}` : null,
                        'Situação: aguardando cumprimento',
                        destinatario ? `Destinatário: ${destinatario}` : null,
                        prazo ? `Prazo: ${prazo}` : null,
                        idMandado && oficialPorMandado[idMandado] ? `Oficial: ${oficialPorMandado[idMandado]}` : null,
                        dataHora ? `Expedido em: ${dataHora}` : null
                    ].filter(Boolean).join('\n')
                });
            }

            return pilulas;
        }

        // ==============================================================================
        //  AUDIÊNCIAS PENDENTES — tela dedicada `acao=audiencia_listar`
        // ==============================================================================
        //
        // Pendente = audiência com início no futuro e situação não terminal. Colunas
        // localizadas pelo CABEÇALHO, nunca por índice fixo.
        const RE_SITUACAO_TERMINAL = /realizad|cancelad|n[ãa]o\s+realizad/i;
        let _cacheAudiencias = { chave: null, promessa: null };

        function urlAudiencias(numero) {
            const href = Array.from(document.querySelectorAll('a'))
                .map(a => (a.getAttribute('href') || '') + ' ' + (a.getAttribute('onclick') || ''))
                .find(h => /acao=audiencia_listar/i.test(h));
            const m = href && href.match(/controlador\.php\?acao=audiencia_listar[^'"\s]*/);
            if (!m) return null;
            try {
                const u = new URL(m[0].replace(/&amp;/g, '&'), window.location.href);
                if (numero) u.searchParams.set('num_processo', numero);
                return u.toString();
            } catch (e) { return null; }
        }

        function indicesDeColuna(tabela) {
            const cab = Array.from(tabela.querySelectorAll('tr')).find(tr =>
                Array.from(tr.cells).some(c => /Data\/Hora\s+In[íi]cio/i.test(c.textContent || '')));
            if (!cab) return null;
            const rot = Array.from(cab.cells).map(c => String(c.textContent || '').replace(/\s+/g, ' ').trim());
            const achar = re => rot.findIndex(r => re.test(r));
            return {
                sala: achar(/^Sala$/i),
                inicio: achar(/Data\/Hora\s+In[íi]cio/i),
                descricao: achar(/Descri[çc][ãa]o/i),
                situacao: achar(/Situa[çc][ãa]o/i)
            };
        }

        async function coletarAudiencias() {
            const numero = numeroDoProcesso();
            const url = urlAudiencias(numero);
            if (!url) return []; // processo/perfil sem a tela de audiências

            if (_cacheAudiencias.chave !== numero || !_cacheAudiencias.promessa) {
                _cacheAudiencias = { chave: numero, promessa: (async () => {
                    const r = await fetch(url, { credentials: 'same-origin' });
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    const html = new TextDecoder('iso-8859-1').decode(await r.arrayBuffer());
                    return new DOMParser().parseFromString(html, 'text/html');
                })() };
            }

            let doc;
            try {
                doc = await _cacheAudiencias.promessa;
            } catch (e) {
                _cacheAudiencias = { chave: null, promessa: null };
                console.warn(`${LOG} Consulta de audiências falhou:`, e);
                return [];
            }

            const celula = Array.from(doc.querySelectorAll('td'))
                .find(td => /^\s*\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s*$/.test(td.textContent || ''));
            const tabela = celula && celula.closest('table');
            if (!tabela) return [];

            const col = indicesDeColuna(tabela);
            if (!col || col.inicio < 0) return [];

            const agora = new Date();
            const pilulas = [];

            for (const tr of Array.from(tabela.querySelectorAll('tr'))) {
                const cels = Array.from(tr.cells);
                if (cels.length <= col.inicio) continue;
                const inicio = String(cels[col.inicio].textContent || '').replace(/\s+/g, ' ').trim();
                const m = inicio.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
                if (!m) continue; // linha de cabeçalho/ordenação

                const quando = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
                if (quando < agora) continue; // já passou: não é pendência de agenda

                const situacao = col.situacao >= 0 && cels[col.situacao]
                    ? String(cels[col.situacao].textContent || '').replace(/\s+/g, ' ').trim() : '';
                if (RE_SITUACAO_TERMINAL.test(situacao)) continue;

                const descricao = col.descricao >= 0 && cels[col.descricao]
                    ? String(cels[col.descricao].textContent || '').replace(/\s+/g, ' ').trim() : '';
                const sala = col.sala >= 0 && cels[col.sala]
                    ? String(cels[col.sala].textContent || '').replace(/\s+/g, ' ').trim() : '';
                const dias = diasAte(inicio);

                pilulas.push({
                    rotulo: m[4] ? `${m[1]}/${m[2]} ${m[4]}:${m[5]}` : `${m[1]}/${m[2]}`,
                    detalhe: (situacao || descricao || '').slice(0, 40) || null,
                    data: null, // já está no rótulo
                    tom: (dias !== null && dias <= LIMIAR_URGENTE_DIAS) ? 'urgente' : null,
                    titulo: [
                        `Início: ${inicio}`,
                        situacao ? `Situação: ${situacao}` : null,
                        descricao ? `Descrição: ${descricao}` : null,
                        sala ? `Sala: ${sala}` : null,
                        textoDePrazo(dias) || null
                    ].filter(Boolean).join('\n')
                });
            }

            return pilulas;
        }

        // ==============================================================================
        //  REMESSAS EM CURSO — inferidas do encadeamento dos eventos
        // ==============================================================================
        //
        // O que marca uma transferência de autos é o par "ORIGEM -> DESTINO" no fim da
        // descrição do evento (o rótulo do evento varia demais conforme o tipo de
        // remessa para ser confiável). Os autos estão onde o ÚLTIMO desses eventos os
        // deixou; a remessa está em curso enquanto esse destino for diferente da
        // unidade atual do usuário.
        const RE_REMESSA = /\b([A-Z][A-Z0-9]{1,15})\s*->\s*([A-Z][A-Z0-9]{1,15})\b/;

        function siglaDaUnidadeAtual() {
            const sel = document.querySelector('#selInfraUnidades');
            const opt = sel && sel.options[sel.selectedIndex];
            const texto = opt ? String(opt.textContent || '') : '';
            return (texto.match(/^\s*([A-Z0-9]+)\s*\//) || [])[1] || '';
        }

        function coletarRemessas(doc) {
            const alvo = doc || document;
            const remessas = Array.from(alvo.querySelectorAll(SEL_LINHA_EVENTO)).map(tr => {
                const td = tr.querySelector('td.infraEventoDescricao');
                const texto = String((td && td.textContent) || '').replace(/\s+/g, ' ');
                const m = texto.match(RE_REMESSA);
                if (!m || m[1] === m[2]) return null; // origem === destino: falso positivo
                return {
                    seq: Number((String(tr.id || '').match(/(\d+)/) || [])[1] || 0),
                    origem: m[1],
                    destino: m[2],
                    rotuloEvento: String(((td && td.querySelector('label')) || {}).textContent || '')
                        .replace(/\s+/g, ' ').trim(),
                    dataHora: String((tr.children[2] || {}).textContent || '').replace(/\s+/g, ' ').trim()
                };
            }).filter(Boolean).sort((a, b) => a.seq - b.seq);

            if (!remessas.length) return [];

            const ultima = remessas[remessas.length - 1];
            const casa = siglaDaUnidadeAtual() || remessas[0].origem;
            if (!casa || ultima.destino === casa) return [];

            const dias = diasAte(ultima.dataHora);
            return [{
                rotulo: ultima.destino,
                detalhe: 'sem retorno',
                data: (ultima.dataHora.match(/\d{2}\/\d{2}\/\d{4}/) || [null])[0],
                tom: null,
                titulo: [
                    ultima.rotuloEvento || 'Autos remetidos',
                    `${ultima.origem} → ${ultima.destino}`,
                    ultima.dataHora ? `Em: ${ultima.dataHora}` : null,
                    dias !== null && dias < 0 ? `Há ${Math.abs(dias)} dia(s)` : null,
                    `Evento ${ultima.seq}`,
                    `Sem evento posterior devolvendo os autos a ${casa}`
                ].filter(Boolean).join('\n')
            }];
        }

        // ==============================================================================
        //  Tabela de eventos truncada — detectar e oferecer conferência
        // ==============================================================================
        //
        // A capa pode não trazer todos os eventos na carga inicial. Como os eventos são
        // numerados sequencialmente e listados do mais novo para o mais antigo, se o
        // menor `trEvento<N>` presente não é 1, a tabela está truncada — e um mandado ou
        // prazo antigo pode estar invisível. Detecta-se de graça; não se completa
        // sozinho (a paginação por fetch do Eproc é stateful e não dá conta).
        function tabelaDeEventosParcial(doc) {
            const seqs = Array.from(doc.querySelectorAll(SEL_LINHA_EVENTO))
                .map(tr => Number((String(tr.id).match(/(\d+)/) || [])[1] || 0))
                .filter(Boolean);
            if (!seqs.length) return false;
            return Math.min(...seqs) > 1;
        }

        let _conferencia = { chave: null, completa: false, emCurso: null };

        /**
         * Completa a tabela de eventos clicando no próprio link "Carregar TODOS os
         * eventos" da página (`javascript:carregarTodasPaginas();`). O clique nativo
         * num link `javascript:` executa a função no mundo da própria página — não
         * precisa de fetch nem de permissão extra.
         */
        function completarEventos() {
            const numero = numeroDoProcesso();
            if (_conferencia.chave !== numero) _conferencia = { chave: numero, completa: false, emCurso: null };
            if (_conferencia.completa) return Promise.resolve(true);
            if (_conferencia.emCurso) return _conferencia.emCurso;

            _conferencia.emCurso = new Promise((resolve) => {
                const link = document.querySelector([
                    'a.infraLink[href="javascript:carregarTodasPaginas();"]',
                    'a[href="javascript:carregarTodasPaginas();"]',
                    'a.infraLink[href*="carregarTodasPaginas"]',
                    'a[onclick*="carregarTodasPaginas"]'
                ].join(', '));
                if (!link) { resolve(false); return; }

                link.click();

                let tentativas = 0;
                const iv = setInterval(() => {
                    tentativas++;
                    if (!tabelaDeEventosParcial(document)) {
                        clearInterval(iv);
                        resolve(true);
                    } else if (tentativas > 40) { // ~20s
                        clearInterval(iv);
                        resolve(false);
                    }
                }, 500);
            }).then(ok => {
                _conferencia.emCurso = null;
                _conferencia.completa = ok;
                return ok;
            });
            return _conferencia.emCurso;
        }

        function pilulaConferencia(doc) {
            const alvo = doc || document;
            if (_conferencia.chave === numeroDoProcesso() && _conferencia.completa) return null;
            if (!tabelaDeEventosParcial(alvo)) return null;
            const seqs = Array.from(alvo.querySelectorAll(SEL_LINHA_EVENTO))
                .map(tr => Number((String(tr.id).match(/(\d+)/) || [])[1] || 0)).filter(Boolean);
            const menor = seqs.length ? Math.min(...seqs) : 0;
            return {
                rotulo: 'Verificar mais eventos',
                detalhe: menor > 1 ? `${menor - 1} não lidos` : null,
                acao: 'completarEventos',
                titulo: 'A capa carregou apenas os eventos mais recentes'
                    + (menor > 1 ? ` (a partir do ${menor})` : '') + '.\n'
                    + 'Prazos, mandados e remessas anteriores a esse ponto NÃO foram conferidos.\n'
                    + 'Clique para carregar todos os eventos e refazer a conferência.'
            };
        }

        // ==============================================================================
        //  Registro de tipos e agregação
        // ==============================================================================

        const TIPOS = [
            { id: 'prazos', emoji: '⏳', coletar: coletarPrazos },
            { id: 'mandados', emoji: '📮', coletar: coletarMandados },
            { id: 'audiencias', emoji: '⚖️', coletarAsync: coletarAudiencias },
            { id: 'remessas', emoji: '📦', coletar: coletarRemessas }
        ];

        function marcar(tipo, itens) {
            return (itens || []).map(item => Object.assign({}, item, {
                tipoId: tipo.id,
                emoji: tipo.emoji
            }));
        }

        function marcarConferencia(doc) {
            try {
                const p = pilulaConferencia(doc);
                return p ? [Object.assign({}, p, { tipoId: 'conferencia', emoji: '🔎' })] : [];
            } catch (e) {
                console.warn(`${LOG} Conferência de eventos falhou:`, e);
                return [];
            }
        }

        function coletarTudo(doc) {
            const alvo = doc || document;
            const pilulas = [];
            for (const tipo of TIPOS) {
                if (typeof tipo.coletar !== 'function') continue;
                try {
                    pilulas.push(...marcar(tipo, tipo.coletar(alvo)));
                } catch (e) {
                    console.warn(`${LOG} Coletor "${tipo.id}" falhou:`, e);
                }
            }
            return pilulas.length ? pilulas.concat(marcarConferencia(alvo)) : pilulas;
        }

        async function coletarTudoAsync(doc) {
            const alvo = doc || document;
            const porTipo = await Promise.all(TIPOS.map(async tipo => {
                try {
                    if (typeof tipo.coletarAsync === 'function') return marcar(tipo, await tipo.coletarAsync(alvo));
                    if (typeof tipo.coletar === 'function') return marcar(tipo, tipo.coletar(alvo));
                } catch (e) {
                    console.warn(`${LOG} Coletor "${tipo.id}" falhou:`, e);
                }
                return [];
            }));
            const pilulas = porTipo.flat();
            return pilulas.length ? pilulas.concat(marcarConferencia(alvo)) : pilulas;
        }

        // ==============================================================================
        //  UI
        // ==============================================================================

        const ACOES = {
            completarEventos: (el) => {
                el.disabled = true;
                const forte = el.querySelector('b');
                if (forte) forte.textContent = '🔎 Carregando eventos…';
                const det = el.querySelector('.pdp-detalhe');
                if (det) det.remove();
                completarEventos()
                    .then(ok => {
                        if (!ok) console.warn(`${LOG} Não foi possível completar a tabela de eventos.`);
                        injetar();
                    })
                    .catch(e => { console.warn(`${LOG} Falha ao completar eventos:`, e); injetar(); });
            }
        };

        function montarPilula(item) {
            if (item.acao && ACOES[item.acao]) {
                const bt = document.createElement('button');
                bt.type = 'button';
                bt.className = `pdp-pilula pdp-t-${item.tipoId}`;
                if (item.titulo) bt.title = item.titulo;
                const forte = document.createElement('b');
                forte.textContent = `${item.emoji || ''} ${item.rotulo || ''}`.trim();
                bt.appendChild(forte);
                if (item.detalhe) {
                    const det = document.createElement('span');
                    det.className = 'pdp-detalhe';
                    det.textContent = item.detalhe;
                    bt.appendChild(det);
                }
                bt.addEventListener('click', () => ACOES[item.acao](bt));
                return bt;
            }

            const el = document.createElement('span');
            el.className = `pdp-pilula pdp-t-${item.tipoId}` + (item.tom ? ` pdp-${item.tom}` : '');
            if (item.titulo) el.title = item.titulo;

            const forte = document.createElement('b');
            forte.textContent = `${item.emoji || ''} ${item.rotulo || ''}`.trim();
            el.appendChild(forte);

            if (item.detalhe) {
                const det = document.createElement('span');
                det.className = 'pdp-detalhe';
                det.textContent = item.detalhe;
                el.appendChild(det);
            }
            if (item.data) {
                const dt = document.createElement('span');
                dt.className = 'pdp-data';
                dt.textContent = item.data;
                el.appendChild(dt);
            }
            return el;
        }

        function construirBarra(pilulas) {
            const bar = document.createElement('div');
            bar.id = BAR_ID;

            const rot = document.createElement('span');
            rot.className = 'pdp-rotulo';
            rot.textContent = 'Pendências do processo:';
            bar.appendChild(rot);

            pilulas.forEach(p => bar.appendChild(montarPilula(p)));
            return bar;
        }

        function assinatura(pilulas) {
            return pilulas.map(p => [p.tipoId, p.rotulo, p.detalhe, p.data, p.tom].join('|')).join('§');
        }

        function desenhar(pilulas) {
            const capa = document.querySelector(ANCHOR);
            if (!capa || !capa.parentElement) return false;

            const existente = document.getElementById(BAR_ID);

            if (!pilulas.length) {
                if (existente) existente.remove();
                return true;
            }

            const assin = assinatura(pilulas);
            if (existente && existente.dataset.assinatura === assin && existente.nextElementSibling === capa) {
                return true; // nada mudou
            }

            const nova = construirBarra(pilulas);
            nova.dataset.assinatura = assin;
            if (existente) existente.replaceWith(nova);
            else capa.parentElement.insertBefore(nova, capa);
            return true;
        }

        function injetar() {
            const capa = document.querySelector(ANCHOR);
            if (!capa || !capa.parentElement) return false;

            desenhar(coletarTudo(document));

            coletarTudoAsync(document)
                .then(todas => { desenhar(todas); })
                .catch(e => console.warn(`${LOG} Coleta assíncrona falhou:`, e));

            return true;
        }

        function iniciar() {
            try { injetar(); } catch (e) { console.warn(`${LOG} Falha ao injetar:`, e); }

            // Observador com debounce: a capa é reescrita por várias ações do Eproc
            // (troca de localizador, movimentação sem reload, filtro de eventos).
            //
            // As mutações da PRÓPRIA faixa são ignoradas de propósito — sem esse filtro,
            // o redesenho assíncrono acordaria o observador, que chamaria `injetar` de
            // novo, num ciclo perpétuo (o debounce só o espaçaria, não o interromperia).
            const nossa = (m) => {
                const bar = document.getElementById(BAR_ID);
                if (bar && bar.contains(m.target)) return true;
                const ehBarra = (n) => n && n.id === BAR_ID;
                const nos = [...m.addedNodes, ...m.removedNodes];
                return nos.length > 0 && nos.every(ehBarra);
            };

            let agendado = false;
            const obs = new MutationObserver((mutacoes) => {
                if (mutacoes.every(nossa)) return;
                if (agendado) return;
                agendado = true;
                setTimeout(() => {
                    agendado = false;
                    try { injetar(); } catch (e) { /* noop */ }
                }, 200);
            });
            obs.observe(document.documentElement, { childList: true, subtree: true });

            // Rede de segurança nos primeiros ~20 s (a capa monta em etapas).
            let tentativas = 0;
            const iv = setInterval(() => {
                try { injetar(); } catch (e) { /* noop */ }
                if (++tentativas > 50) clearInterval(iv);
            }, 400);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar, { once: true });
        } else {
            iniciar();
        }
    });
})();
