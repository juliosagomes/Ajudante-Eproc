// Histórico+ — Timeline visual do Histórico de Localizadores
// Portado do Epryx (contentscript17.js). Autoria original: Augusta Klug.

(function () {
    'use strict';

    chrome.runtime.sendMessage({ tipo: 'obterSettings' }, ({ settings }) => {
        if (!settings?.scripts?.historicoLocalizadores?.enabled) return;

        let selectedTimelineId = null;

        function init() {
            const originalTable = document.querySelector('table[summary="Histórico de Localizadores"]');
            if (!originalTable) return;
            enhanceLocalizadorHistory(originalTable);
        }

        function extractRuleInfo(cellHTML) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cellHTML;
            const ruleSpan = tempDiv.querySelector('span[onmouseover*="consultaDetalhesRegra"]');
            if (ruleSpan) {
                const onmouseover = ruleSpan.getAttribute('onmouseover');
                const ruleIdMatch = onmouseover.match(/consultaDetalhesRegra\('([^']+)'\)/);
                const ruleText = ruleSpan.textContent.trim();
                if (ruleIdMatch && ruleText) {
                    return { id: ruleIdMatch[1], text: ruleText };
                }
            }
            return null;
        }

        function convertDateToSortable(dateTimeStr) {
            if (!dateTimeStr) return '0';
            const parts = dateTimeStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})/);
            if (!parts) return dateTimeStr;
            const [, day, month, year, hour, minute, second] = parts;
            return `${year}${month}${day}${hour}${minute}${second}`;
        }

        function parseDate(dateString) {
            if (!dateString || typeof dateString !== 'string') return null;
            const m = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})$/);
            if (!m) return null;
            const [, dd, mm, yyyy, HH, MM, SS] = m;
            const year = parseInt(yyyy, 10), month = parseInt(mm, 10) - 1, day = parseInt(dd, 10);
            const hour = parseInt(HH, 10), minute = parseInt(MM, 10), second = parseInt(SS, 10);
            const d = new Date(year, month, day, hour, minute, second);
            if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day ||
                d.getHours() !== hour || d.getMinutes() !== minute || d.getSeconds() !== second) return null;
            return d;
        }

        function primaryCellText(cell) {
            if (!cell) return '';
            for (const node of cell.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const t = node.textContent.trim();
                    if (t) return t;
                }
            }
            return cell.textContent.trim();
        }

        function parseRow(rowElement) {
            const cells = rowElement.querySelectorAll('td');
            if (!cells || cells.length < 8) return null;
            return {
                orgao:              (cells[0]?.innerText || '').trim(),
                localizador:        (cells[1]?.innerText || '').trim(),
                dataInclusao:       primaryCellText(cells[4] || null),
                usuarioInclusao:    primaryCellText(cells[3] || null),
                dataDesativacao:    primaryCellText(cells[7] || null),
                usuarioDesativacao: (cells[6]?.innerText || '').trim(),
                ativo:              (cells[5]?.innerText || '').trim(),
                inclusaoCellHTML:   (cells[4]?.innerHTML || '').trim(),
                desativacaoCellHTML:(cells[7]?.innerHTML || '').trim(),
            };
        }

        function createEventsFromRowData(rowData, rowIndex) {
            if (!rowData) return [];
            const events = [];
            const addTime = parseDate(rowData.dataInclusao);
            if (addTime) {
                events.push({ time: addTime, timeText: rowData.dataInclusao, type: 'add', orgao: rowData.orgao, localizador: rowData.localizador, user: rowData.usuarioInclusao, ruleInfo: extractRuleInfo(rowData.inclusaoCellHTML), rowIndex: typeof rowIndex === 'number' ? rowIndex : -1, sourceActive: rowData.ativo === 'Sim' });
            }
            const removeTime = parseDate(rowData.dataDesativacao);
            if (removeTime && rowData.ativo === 'Não') {
                events.push({ time: removeTime, timeText: rowData.dataDesativacao, type: 'remove', orgao: rowData.orgao, localizador: rowData.localizador, user: rowData.usuarioDesativacao, ruleInfo: extractRuleInfo(rowData.desativacaoCellHTML), rowIndex: typeof rowIndex === 'number' ? rowIndex : -1, sourceActive: false });
            }
            return events;
        }

        function sortEvents(events) {
            return events.slice().sort((a, b) => {
                const t = a.time - b.time;
                if (t !== 0) return t;
                const sameKey = (a.orgao === b.orgao) && (a.localizador === b.localizador);
                if (sameKey) {
                    if (a.rowIndex === b.rowIndex && a.rowIndex !== undefined) {
                        if (a.type !== b.type) return a.type === 'add' ? -1 : 1;
                    }
                    const aActiveAdd = a.type === 'add' && a.sourceActive === true;
                    const bActiveAdd = b.type === 'add' && b.sourceActive === true;
                    if (aActiveAdd !== bActiveAdd) return aActiveAdd ? 1 : -1;
                    if (a.type !== b.type) return a.type === 'remove' ? -1 : 1;
                }
                if (typeof a.rowIndex === 'number' && typeof b.rowIndex === 'number') return b.rowIndex - a.rowIndex;
                return 0;
            });
        }

        function buildTimelineFromEvents(sortedEvents) {
            if (!sortedEvents || sortedEvents.length === 0) return [];
            const keyOf = (orgao, text) => `${orgao}::${text}`;
            const parseKey = (key) => { const idx = key.indexOf('::'); return { orgao: key.slice(0, idx), text: key.slice(idx + 2) }; };
            const timeline = [];
            let previousState = new Set();
            const keyMeta = new Map();
            for (const ev of sortedEvents) {
                const key = keyOf(ev.orgao || '', ev.localizador || '');
                keyMeta.set(key, { orgao: ev.orgao || '', text: ev.localizador || '' });
                const currentState = new Set(previousState);
                if (ev.type === 'remove') currentState.delete(key);
                else if (ev.type === 'add') currentState.add(key);
                const union = new Set([...previousState, ...currentState, key]);
                const localizadores = Array.from(union).map(k => {
                    const meta = keyMeta.get(k) || parseKey(k);
                    const was = previousState.has(k), now = currentState.has(k);
                    let status = 'unchanged';
                    if (!was && now) status = 'added';
                    else if (was && !now) status = 'removed';
                    return { text: meta.text, status, principal: false, orgao: meta.orgao };
                });
                timeline.push({ dateTime: ev.timeText || '', user: ev.user || '', ruleInfo: ev.ruleInfo || null, localizadores });
                previousState = currentState;
            }
            return timeline.reverse();
        }

        function parseTimelineFromWideTable(tableElement) {
            const rows = tableElement.querySelectorAll('tbody tr');
            if (!rows || rows.length === 0) return [];
            const events = [];
            Array.from(rows).forEach((rowEl, idx) => {
                const rd = parseRow(rowEl);
                if (!rd) return;
                const evs = createEventsFromRowData(rd, idx);
                if (evs && evs.length) events.push(...evs);
            });
            return buildTimelineFromEvents(sortEvents(events));
        }

        function extractDataStandard(rows) {
            const data = [];
            rows.forEach((row) => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 3) return;
                const dateTimeCellHTML = cells[0].innerHTML;
                let dateTimeText = '';
                for (const node of cells[0].childNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                        dateTimeText = node.textContent.trim();
                        break;
                    }
                }
                if (!dateTimeText) dateTimeText = cells[0].textContent.trim();
                const user = cells[1].textContent.trim();
                const ruleInfo = extractRuleInfo(dateTimeCellHTML);
                if (ruleInfo && ruleInfo.text) dateTimeText = dateTimeText.replace(ruleInfo.text, '').trim();
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = cells[2].innerHTML;
                let normalizedHTML = '';
                const tokens = tempDiv.querySelectorAll('ins.infraLocalizador, del.infraLocalizador, span.infraLocalizador');
                tokens.forEach((el) => {
                    if (el.tagName === 'SPAN' && (el.closest('ins.infraLocalizador') || el.closest('del.infraLocalizador'))) return;
                    const text = el.textContent.trim();
                    if (!text) return;
                    const isPrincipal = el.classList.contains('infraLocalizadorPrincipal') || !!el.querySelector('.infraLocalizadorPrincipal');
                    const isInverted = el.classList.contains('infraLocalizadorInvertido');
                    const principalClass = isPrincipal ? 'infraLocalizadorPrincipal' : 'infraLocalizadorSecundario';
                    const isIncluded = (el.tagName === 'INS') || el.classList.contains('infraLocalizadorIncluido') || !!el.closest('ins');
                    const isExcluded = (el.tagName === 'DEL') || el.classList.contains('infraLocalizadorExcluido') || !!el.closest('del');
                    if (isIncluded && !isExcluded) {
                        normalizedHTML += `<ins class="${principalClass}">${text}</ins> `;
                    } else if (isExcluded && !isIncluded) {
                        normalizedHTML += `<del class="${principalClass}">${text}</del> `;
                    } else {
                        normalizedHTML += `<span class="${principalClass}${isInverted ? ' infraLocalizadorInvertido' : ''}">${text}</span> `;
                    }
                });
                data.push({ dateTime: dateTimeText, user, ruleInfo, localizadores: normalizedHTML.trim() });
            });
            return data;
        }

        function extractDataAlternative(rows) {
            const allEvents = [];
            rows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 8) return;
                const tmpLoc = document.createElement('div');
                tmpLoc.innerHTML = cells[1].innerHTML;
                const locText = tmpLoc.textContent.trim();
                if (!locText) return;
                const isPrincipal = !!tmpLoc.querySelector('.infraLocalizadorPrincipal');
                const dateIncText = cells[4].textContent.trim();
                if (dateIncText) allEvents.push({ type: 'add', text: locText, isPrincipal, userHTML: cells[3].innerHTML, dateTimeHTML: cells[4].innerHTML, sortKey: convertDateToSortable(dateIncText), originalIndex: index });
                const dateDelText = cells[7].textContent.trim();
                if (dateDelText) allEvents.push({ type: 'remove', text: locText, isPrincipal, userHTML: cells[6].innerHTML, dateTimeHTML: cells[7].innerHTML, sortKey: convertDateToSortable(dateDelText), originalIndex: index });
            });
            const grouped = new Map();
            for (const ev of allEvents) {
                const key = `${ev.sortKey}|${ev.userHTML}|${ev.dateTimeHTML}`;
                if (!grouped.has(key)) {
                    const tu = document.createElement('div'); tu.innerHTML = ev.userHTML;
                    const td = document.createElement('div'); td.innerHTML = ev.dateTimeHTML;
                    const ruleInfo = extractRuleInfo(ev.dateTimeHTML);
                    let cleanDate = td.textContent.trim();
                    if (ruleInfo) cleanDate = cleanDate.replace(ruleInfo.text, '').trim();
                    grouped.set(key, { user: tu.textContent.trim(), dateTime: cleanDate, ruleInfo, sortKey: ev.sortKey, originalIndex: ev.originalIndex, changes: [] });
                }
                grouped.get(key).changes.push({ type: ev.type, text: ev.text, isPrincipal: ev.isPrincipal });
            }
            const timelineEvents = Array.from(grouped.values());
            timelineEvents.sort((a, b) => { const t = a.sortKey.localeCompare(b.sortKey); return t !== 0 ? t : b.originalIndex - a.originalIndex; });
            const active = new Set(), principalByText = new Map(), result = [];
            for (const event of timelineEvents) {
                const before = new Set(active);
                const adds = new Set(event.changes.filter(c => c.type === 'add').map(c => c.text));
                const removals = new Set(event.changes.filter(c => c.type === 'remove').map(c => c.text));
                event.changes.forEach(c => { if (typeof c.isPrincipal === 'boolean') principalByText.set(c.text, c.isPrincipal); });
                adds.forEach(t => { if (!removals.has(t)) active.add(t); });
                removals.forEach(t => { if (!adds.has(t)) active.delete(t); });
                const involved = new Set([...before, ...active, ...adds, ...removals]);
                let html = '';
                involved.forEach(text => {
                    const was = before.has(text), isNow = active.has(text), touchedBoth = adds.has(text) && removals.has(text);
                    const cls = principalByText.get(text) ? 'infraLocalizadorPrincipal' : 'infraLocalizadorSecundario';
                    if (!was && isNow) html += `<ins class="${cls}">${text}</ins> `;
                    else if (was && !isNow) html += `<del class="${cls}">${text}</del> `;
                    else if (was && isNow) html += touchedBoth ? `<span class="${cls} infraLocalizadorInvertido">${text}</span> ` : `<span class="${cls}">${text}</span> `;
                    else if (!was && !isNow && removals.has(text)) html += `<del class="${cls}">${text}</del> `;
                });
                result.push({ dateTime: event.dateTime, user: event.user, ruleInfo: event.ruleInfo, localizadores: html.trim() });
            }
            return result.reverse();
        }

        function assignTimelineIds(data) {
            const activeTimelines = new Map();
            let nextTimelineId = 0;
            const processedData = JSON.parse(JSON.stringify(data));
            const isNewFormat = Array.isArray(processedData[0]?.localizadores);
            for (const item of processedData.slice().reverse()) {
                item.parsedLocalizadores = [];
                if (isNewFormat) {
                    for (const loc of item.localizadores) {
                        const normalizedText = (loc.text || '').replace(/\s+/g, ' ').trim();
                        const key = `${(loc.orgao || '').trim()}::${normalizedText}`;
                        if (!normalizedText) continue;
                        let timelineId;
                        if (loc.status === 'removed') {
                            timelineId = activeTimelines.has(key) ? activeTimelines.get(key) : `timeline-${nextTimelineId++}`;
                            activeTimelines.delete(key);
                        } else {
                            if (!activeTimelines.has(key)) { timelineId = `timeline-${nextTimelineId++}`; activeTimelines.set(key, timelineId); }
                            else timelineId = activeTimelines.get(key);
                        }
                        item.parsedLocalizadores.push({ text: normalizedText, status: loc.status, principal: !!loc.principal, timelineId });
                    }
                } else {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = item.localizadores;
                    for (const element of Array.from(tempDiv.querySelectorAll('span, ins, del'))) {
                        const normalizedText = element.textContent.trim().replace(/\s+/g, ' ').trim();
                        if (!normalizedText) continue;
                        const isRemoval = element.tagName === 'DEL';
                        let timelineId;
                        if (isRemoval) {
                            timelineId = activeTimelines.has(normalizedText) ? activeTimelines.get(normalizedText) : `timeline-${nextTimelineId++}`;
                            activeTimelines.delete(normalizedText);
                        } else {
                            if (!activeTimelines.has(normalizedText)) { timelineId = `timeline-${nextTimelineId++}`; activeTimelines.set(normalizedText, timelineId); }
                            else timelineId = activeTimelines.get(normalizedText);
                        }
                        item.parsedLocalizadores.push({ html: element.outerHTML, timelineId });
                    }
                }
            }
            return processedData;
        }

        async function enhanceLocalizadorHistory(originalTable) {
            const rows = originalTable.querySelectorAll('tbody tr');
            if (rows.length === 0) return;
            const firstHeader = originalTable.querySelector('th')?.textContent.trim();
            let data;
            if (firstHeader === 'Data' || firstHeader === 'Data/Hora') {
                data = extractDataStandard(rows);
            } else if (firstHeader === 'Órgão') {
                data = parseTimelineFromWideTable(originalTable);
            } else {
                console.log('[AjudanteEproc Histórico+] Layout de tabela desconhecido.');
                return;
            }
            const dataWithTimelines = assignTimelineIds(data);
            const enhancedHTML = `
                <div class="hl-enhanced-container">
                    <div class="hl-legend-section">
                        <div class="hl-legend-title">Legenda:</div>
                        <div class="hl-legend-grid">
                            <span class="hl-legend-item hl-principal">Localizador principal</span>
                            <span class="hl-legend-item hl-incluido">Incluído</span>
                            <span class="hl-legend-item hl-excluido">Excluído</span>
                            <span class="hl-legend-item hl-alterado">Alterado</span>
                        </div>
                    </div>
                    <div class="hl-timeline-container">
                        ${dataWithTimelines.map((item, index) => {
                            const userMatch = item.user.match(/\((.*?)\)\s*(.*)/);
                            const userId = userMatch ? userMatch[1] : '';
                            const userName = userMatch ? userMatch[2] : item.user;
                            const isSystemAutomation = userName.includes('AUTOMATIZAÇÃO') || userId.includes('SECAUTOLOC');
                            const localizadoresHTML = parseLocalizadores(item.parsedLocalizadores || [], index);
                            const ruleHTML = item.ruleInfo
                                ? `<div class="hl-rule-info"><span onmouseover="return infraTooltipMostrar(consultaDetalhesRegra('${item.ruleInfo.id}'), 'Detalhes da Regra', 600);" onmouseout="return infraTooltipOcultar();">${item.ruleInfo.text}</span></div>`
                                : '';
                            return `<div class="hl-timeline-entry ${isSystemAutomation ? 'hl-system-automation' : ''}" data-index="${index}">
                                        <div class="hl-timeline-left"><div class="hl-timestamp">${item.dateTime.replace(' ', '<br>')}</div></div>
                                        <div class="hl-timeline-middle"><div><div class="hl-user-name">${isSystemAutomation ? '<span class="hl-system-icon">⚙️</span>' : ''}${userName}</div><div class="hl-user-id">${userId}</div></div>${ruleHTML}</div>
                                        <div class="hl-timeline-right"><div class="hl-localizadores-list" data-entry-index="${index}">${localizadoresHTML}</div></div>
                                    </div>`;
                        }).join('')}
                    </div>
                </div>`;
            const tableContainer = originalTable.closest('.infraAreaTabela') || originalTable.parentElement;
            tableContainer.innerHTML = enhancedHTML;
            addChronologicalFlowListeners();
        }

        function parseLocalizadores(parsedLocalizadores, entryIndex) {
            const tempDiv = document.createElement('div');
            let result = '';
            parsedLocalizadores.forEach((loc, locIndex) => {
                let text = '';
                let classes = 'hl-loc-tag ';
                let isPrincipal = false;
                if (loc.html) {
                    tempDiv.innerHTML = loc.html;
                    const element = tempDiv.firstElementChild;
                    if (!element) return;
                    text = element.textContent.trim();
                    if (!text) return;
                    isPrincipal = element.classList.contains('infraLocalizadorPrincipal');
                    if (isPrincipal) classes += 'hl-principal ';
                    if (element.tagName === 'INS' || element.classList.contains('infraLocalizadorIncluido')) classes += 'hl-incluido';
                    else if (element.tagName === 'DEL' || element.classList.contains('infraLocalizadorExcluido')) classes += 'hl-excluido';
                    else if (element.classList.contains('infraLocalizadorInvertido')) classes += 'hl-invertido';
                } else {
                    text = (loc.text || '').trim();
                    if (!text) return;
                    isPrincipal = !!loc.principal;
                    if (isPrincipal) classes += 'hl-principal ';
                    if (loc.status === 'added') classes += 'hl-incluido';
                    else if (loc.status === 'removed') classes += 'hl-excluido';
                    else if (loc.status === 'inverted') classes += 'hl-invertido';
                }
                const titleText = isPrincipal ? `${text} (principal)` : text;
                result += `<span class="${classes.trim()}" title="${titleText}" data-timeline-id="${loc.timelineId}" data-entry="${entryIndex}" data-loc="${locIndex}">${text}</span>`;
            });
            return result;
        }

        function clearAllHighlights() {
            const container = document.querySelector('.hl-timeline-container');
            if (!container) return;
            container.classList.remove('hl-timeline-dimmed', 'hl-show-subway');
            container.querySelectorAll('.hl-loc-tag.hl-highlighted').forEach(el => el.classList.remove('hl-highlighted'));
            container.querySelectorAll('.hl-timeline-entry.hl-has-highlight').forEach(el => el.classList.remove('hl-has-highlight'));
            container.querySelectorAll('.hl-subway-map-svg, .hl-subway-station').forEach(el => el.remove());
        }

        function addChronologicalFlowListeners() {
            const container = document.querySelector('.hl-timeline-container');
            if (!container) return;
            container.addEventListener('mouseover', (event) => {
                if (event.target.classList.contains('hl-loc-tag')) {
                    showChronologicalFlow(event.target.getAttribute('data-timeline-id'));
                }
            });
            container.addEventListener('mouseout', (event) => {
                if (event.target.classList.contains('hl-loc-tag')) {
                    hideChronologicalFlow();
                }
            });
            container.addEventListener('click', (event) => {
                const clickedTag = event.target.closest('.hl-loc-tag');
                if (clickedTag) {
                    const timelineId = clickedTag.getAttribute('data-timeline-id');
                    if (timelineId && timelineId === selectedTimelineId) {
                        selectedTimelineId = null;
                        hideChronologicalFlow();
                    } else {
                        selectedTimelineId = timelineId;
                        showChronologicalFlow(selectedTimelineId);
                    }
                } else if (event.target === container || (event.target.closest('.hl-timeline-entry') && !clickedTag)) {
                    selectedTimelineId = null;
                    hideChronologicalFlow();
                }
            });
        }

        function showChronologicalFlow(timelineId) {
            clearAllHighlights();
            const container = document.querySelector('.hl-timeline-container');
            if (!container || !timelineId) return;
            container.classList.add('hl-timeline-dimmed');
            const matchingLocators = [];
            container.querySelectorAll(`[data-timeline-id="${timelineId}"]`).forEach(locator => {
                locator.classList.add('hl-highlighted');
                locator.closest('.hl-timeline-entry').classList.add('hl-has-highlight');
                matchingLocators.push({ element: locator, index: parseInt(locator.getAttribute('data-entry'), 10) });
            });
            matchingLocators.sort((a, b) => b.index - a.index);
            if (matchingLocators.length > 1) drawSubwayMap(matchingLocators);
        }

        function hideChronologicalFlow() {
            if (selectedTimelineId) {
                showChronologicalFlow(selectedTimelineId);
            } else {
                clearAllHighlights();
            }
        }

        function drawSubwayMap(matchingLocators) {
            const container = document.querySelector('.hl-timeline-container');
            if (!container) return;
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.classList.add('hl-subway-map-svg');
            svg.style.height = `${container.scrollHeight}px`;
            container.appendChild(svg);
            const containerRect = container.getBoundingClientRect();
            const positions = matchingLocators.map(loc => {
                const elRect = loc.element.getBoundingClientRect();
                return {
                    x: elRect.left + elRect.width / 2 - containerRect.left,
                    y: elRect.top + elRect.height / 2 - containerRect.top + container.scrollTop,
                };
            });
            positions.forEach(pos => {
                const station = document.createElement('div');
                station.className = 'hl-subway-station';
                station.style.left = `${pos.x - 5}px`;
                station.style.top = `${pos.y - 5}px`;
                container.appendChild(station);
            });
            let pathData = `M ${positions[0].x} ${positions[0].y}`;
            const baseCornerRadius = 12;
            for (let i = 0; i < positions.length - 1; i++) {
                const p1 = positions[i], p2 = positions[i + 1];
                const dx = p2.x - p1.x, dy = p2.y - p1.y;
                const absDx = Math.abs(dx), absDy = Math.abs(dy);
                const minDistForCurve = 20;
                if (absDx < 5) {
                    pathData += ` L ${p2.x} ${p2.y}`;
                } else if (absDy < 5) {
                    pathData += ` L ${p2.x} ${p2.y}`;
                } else if (absDx > minDistForCurve && absDy > minDistForCurve) {
                    const cornerRadius = Math.min(baseCornerRadius, absDx / 3, absDy / 3);
                    const midY = p1.y + dy / 2;
                    pathData += ` L ${p1.x} ${midY - Math.sign(dy) * cornerRadius}`;
                    pathData += ` Q ${p1.x} ${midY} ${p1.x + Math.sign(dx) * cornerRadius} ${midY}`;
                    pathData += ` L ${p2.x - Math.sign(dx) * cornerRadius} ${midY}`;
                    pathData += ` Q ${p2.x} ${midY} ${p2.x} ${midY + Math.sign(dy) * cornerRadius}`;
                    pathData += ` L ${p2.x} ${p2.y}`;
                } else {
                    pathData += ` Q ${p1.x + dx * 0.5} ${p1.y + dy * 0.2} ${p2.x} ${p2.y}`;
                }
            }
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathData);
            path.classList.add('hl-subway-line-path');
            svg.appendChild(path);
            setTimeout(() => container.classList.add('hl-show-subway'), 10);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    });
})();
