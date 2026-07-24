/* ══════════════════════════════════════════════════
   ENTREGAS DE KITS — Kit delivery event management
   Decouples discrete delivery events from period-level
   reports, enabling automatic carry-forward of stock.
══════════════════════════════════════════════════ */

/* ── Data access helpers ────────────────────────── */
function getEntregas() {
  const all  = store.get('entregas') || [];
  const cIds = new Set(getConselheiros().map(c => c.id));
  return all.filter(e => cIds.has(e.conselheiro_id));
}

function saveEntregas(updated) {
  const all  = store.get('entregas') || [];
  const cIds = new Set(getConselheiros().map(c => c.id));
  const others = all.filter(e => !cIds.has(e.conselheiro_id));
  store.set('entregas', [...others, ...updated]);
}

/* ── Main render ────────────────────────────────── */
function renderEntregas() {
  const content      = document.getElementById('content');
  const conselheiros = getConselheiros().filter(c => c.ativo);
  const entregas     = getEntregas().sort((a, b) => b.data_entrega.localeCompare(a.data_entrega));

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Entregas de Kits — ${currentProvincia}</h2>
        <p>Registo de entregas de kits Determine e Unigold por conselheiro</p>
      </div>
      <button class="btn btn-primary" onclick="openEntregaModal()">+ Nova Entrega</button>
    </div>

    <!-- Como Funciona (collapsible) -->
    <div class="card" style="margin-bottom:16px;border-left:3px solid var(--rise-teal)">
      <div class="collapsible-header" id="help-toggle"
        onclick="toggleSection('help-body','help-toggle')" style="padding-bottom:2px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:16px">ℹ️</span>
          <span style="font-weight:700;font-size:13px;color:var(--rise-navy)">
            Como Funciona — Gestão de Entregas de Kits
          </span>
        </div>
        <span id="help-toggle-icon" style="color:var(--rise-muted);font-size:16px">▶</span>
      </div>
      <div id="help-body" style="display:none;margin-top:16px">
        ${_renderHelpText()}
      </div>
    </div>

    <!-- Stock summary per counselor -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-title" style="margin-bottom:12px">📊 Stock Estimado por Conselheiro</div>
      ${_renderStockSummary(conselheiros)}
    </div>

    <!-- Filters -->
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <select id="filter-ent-conselheiro" onchange="filterEntregas()"
          style="flex:1;min-width:200px;padding:8px 12px;border:1px solid #CBD5E0;border-radius:7px;font-size:13px;font-family:inherit;background:#fff">
          <option value="">Todos os conselheiros</option>
          ${conselheiros.map(c => `<option value="${c.id}">${escHtml(c.nome)} — ${escHtml(c.distrito||'')}</option>`).join('')}
        </select>
        <input id="filter-ent-mes" type="month" onchange="filterEntregas()"
          style="padding:8px 12px;border:1px solid #CBD5E0;border-radius:7px;font-size:13px;font-family:inherit"
          title="Filtrar por mês" />
        <button class="btn btn-secondary btn-sm" onclick="clearEntregaFilters()">✕ Limpar</button>
      </div>
    </div>

    <!-- Delivery history table -->
    <div class="card" id="entregas-table-wrap">
      ${_renderEntregasTable(entregas, conselheiros)}
    </div>
  `;
}

/* ── Portuguese explanation (Como Funciona) ─────── */
function _renderHelpText() {
  return `
    <div style="line-height:1.7;color:var(--rise-text)">

      <h4 style="color:var(--rise-navy);margin:0 0 10px;font-size:14px">Porquê separar as entregas dos relatórios de período?</h4>
      <p style="font-size:13px;margin:0 0 14px;color:var(--rise-muted)">
        Quando um conselheiro recebe uma caixa de kits Determine ou Unigold, essa entrega acontece numa
        data específica — que raramente coincide com o início de uma semana ou mês de reporte.
        O sistema anterior pedia ao supervisor que se lembrasse de quanto stock havia no início de cada
        período, o que era uma fonte frequente de erros e inconsistências nos dados de stock.
      </p>

      <h4 style="color:var(--rise-navy);margin:0 0 12px;font-size:14px">Como funciona o novo sistema</h4>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:20px">
        ${[
          ['1', 'Registar a Entrega no dia', 'Quando os kits chegam ao conselheiro, o supervisor abre esta página e regista a entrega: data, conselheiro e quantidade. É rápido — não requer o preenchimento do relatório completo.', 'var(--rise-teal)'],
          ['2', 'Abertura pré-preenchida automaticamente', 'No final do período, ao abrir o formulário do conselheiro em "Registar Resultados", o campo "Stock de Abertura" já vem preenchido com o fecho do período anterior.', '#7C3AED'],
          ['3', 'Recebido calculado a partir das entregas', 'O campo "Recebido" é calculado automaticamente somando todas as entregas registadas neste ecrã para aquele conselheiro e período.', '#D97706'],
          ['4', 'Verificar e guardar', 'O supervisor verifica os valores pré-preenchidos, introduz os dados de consumo e confirma o fecho de stock. O sistema assinala automaticamente qualquer divergência.', '#166534'],
        ].map(([num, title, desc, color]) => `
          <div style="background:var(--rise-light);border-radius:8px;padding:14px">
            <div style="width:26px;height:26px;border-radius:50%;background:${color};color:#fff;
                        font-size:12px;font-weight:800;display:flex;align-items:center;
                        justify-content:center;margin-bottom:10px">${num}</div>
            <div style="font-weight:700;font-size:13px;color:var(--rise-navy);margin-bottom:4px">${title}</div>
            <div style="font-size:12px;color:var(--rise-muted)">${desc}</div>
          </div>`).join('')}
      </div>

      <h4 style="color:var(--rise-navy);margin:0 0 10px;font-size:14px">E se o conselheiro já tem kits quando começa a usar o sistema?</h4>
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:14px;margin-bottom:20px">
        <p style="font-size:13px;margin:0 0 10px;color:var(--rise-muted)">
          Ao registar um novo conselheiro em <strong style="color:var(--rise-navy)">Conselheiros → + Novo Conselheiro</strong>,
          existe uma secção <strong style="color:var(--rise-navy)">"Stock Inicial de Arranque"</strong> onde se introduz:
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div style="background:var(--rise-light);border-radius:6px;padding:10px;font-size:12px">
            <div style="font-weight:700;color:var(--rise-navy);margin-bottom:4px">📦 Quantidade</div>
            <div style="color:var(--rise-muted)">Número de kits Determine e Unigold fisicamente em mão no momento do arranque.</div>
          </div>
          <div style="background:var(--rise-light);border-radius:6px;padding:10px;font-size:12px">
            <div style="font-weight:700;color:var(--rise-navy);margin-bottom:4px">🏷️ Lote e Validade</div>
            <div style="color:var(--rise-muted)">Número de lote e data de validade dos kits existentes, para rastreabilidade.</div>
          </div>
        </div>
        <p style="font-size:12px;margin:0;color:var(--rise-muted)">
          Estes valores são usados como <strong>abertura do primeiro período</strong> desse conselheiro.
          O Stock Inicial só é utilizado <strong>uma vez</strong> — depois disso, o sistema transporta automaticamente
          o fecho de cada período para a abertura do seguinte.
        </p>
      </div>

      <h4 style="color:var(--rise-navy);margin:0 0 8px;font-size:14px">Alertas de Stock Baixo</h4>
      <p style="font-size:13px;margin:0 0 10px;color:var(--rise-muted)">
        A tabela acima mostra o stock estimado actual de cada conselheiro: fecho do último período
        registado, mais as entregas que chegaram desde então. Quando o stock estimado cai abaixo de
        <strong>${CONFIG.STOCK_ALERT_UNITS} kits</strong>, aparece um alerta para que o supervisor
        possa solicitar reposição antes de o conselheiro ficar sem testes.
      </p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div style="padding:10px 12px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;font-size:12px">
          <strong style="color:#166534">🟢 Normal</strong><br>
          <span style="color:var(--rise-muted)">Stock estimado ≥ ${CONFIG.STOCK_ALERT_UNITS} kits</span>
        </div>
        <div style="padding:10px 12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;font-size:12px">
          <strong style="color:#92400E">🟡 Stock Baixo</strong><br>
          <span style="color:var(--rise-muted)">Entre 10 e ${CONFIG.STOCK_ALERT_UNITS} kits</span>
        </div>
        <div style="padding:10px 12px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;font-size:12px">
          <strong style="color:#991B1B">🔴 Crítico</strong><br>
          <span style="color:var(--rise-muted)">Menos de 10 kits em stock</span>
        </div>
        <div style="padding:10px 12px;background:#F1F5F9;border:1px solid #CBD5E0;border-radius:8px;font-size:12px">
          <strong style="color:var(--rise-muted)">⚪ Sem Dados</strong><br>
          <span style="color:var(--rise-muted)">Sem registo de stock nem stock inicial</span>
        </div>
      </div>

      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:12px;font-size:12px;color:#92400E">
        <strong>Nota:</strong> O stock de abertura é transportado automaticamente apenas quando existe um
        registo do período anterior. Se o conselheiro não submeteu dados num período, o sistema usa o
        stock inicial definido no seu registo, ou zero se não estiver configurado. Defina sempre o
        stock inicial ao registar um novo conselheiro.
      </div>
    </div>
  `;
}

/* ── Stock summary table ─────────────────────────── */
function _renderStockSummary(conselheiros) {
  if (!conselheiros.length) {
    return emptyStateHTML('📦', 'Sem conselheiros activos',
      'Adicione conselheiros para ver o resumo de stock.');
  }

  const allStock    = store.get('stock')    || [];
  const allEntregas = getEntregas();

  const rows = conselheiros.map(c => {
    const cStocks = allStock
      .filter(s => s.conselheiro_id === c.id)
      .sort((a, b) => b.periodo_ref.localeCompare(a.periodo_ref));
    const lastStock = cStocks[0];

    let detCurrent = 0, uniCurrent = 0, sourceLabel = '—', hasData = false;

    if (lastStock) {
      const range = getPeriodDateRange(lastStock.periodo_ref);
      const laterEntregas = allEntregas.filter(e =>
        e.conselheiro_id === c.id &&
        new Date(e.data_entrega + 'T12:00:00') > (range ? range.end : new Date(0))
      );
      detCurrent  = (lastStock.determine_fecho || 0) + laterEntregas.reduce((s, e) => s + (e.determine_qty || 0), 0);
      uniCurrent  = (lastStock.unigold_fecho   || 0) + laterEntregas.reduce((s, e) => s + (e.unigold_qty   || 0), 0);
      sourceLabel = `Fecho de ${periodLabel(lastStock.periodo_ref)}` +
        (laterEntregas.length ? ` + ${laterEntregas.length} entrega(s) recente(s)` : '');
      hasData = true;
    } else if (c.stock_inicial_determine > 0 || c.stock_inicial_unigold > 0) {
      detCurrent  = c.stock_inicial_determine || 0;
      uniCurrent  = c.stock_inicial_unigold   || 0;
      sourceLabel = 'Stock inicial';
      hasData = true;
    }

    const lowDet = hasData && detCurrent < CONFIG.STOCK_ALERT_UNITS;
    const lowUni = hasData && uniCurrent < CONFIG.STOCK_ALERT_UNITS;
    const status = !hasData ? 'NONE'
      : (detCurrent < 10 || uniCurrent < 10)   ? 'RED'
      : (lowDet || lowUni)                       ? 'YELLOW'
      :                                            'GREEN';

    return { c, detCurrent, uniCurrent, sourceLabel, status, hasData };
  });

  const alertRows = rows.filter(r => r.status === 'RED' || r.status === 'YELLOW');

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Conselheiro</th><th>Distrito</th>
            <th style="text-align:center">Determine Est.</th>
            <th style="text-align:center">Unigold Est.</th>
            <th>Base de Cálculo</th>
            <th style="text-align:center">Estado</th>
            <th>Acções</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(({ c, detCurrent, uniCurrent, sourceLabel, status, hasData }) => {
            const detColor = hasData && detCurrent < CONFIG.STOCK_ALERT_UNITS ? 'var(--status-red)' : 'var(--status-green)';
            const uniColor = hasData && uniCurrent < CONFIG.STOCK_ALERT_UNITS ? 'var(--status-red)' : 'var(--status-green)';
            const badge = status === 'RED'    ? `<span class="badge badge-red" style="font-size:10px">Crítico</span>`
                        : status === 'YELLOW' ? `<span class="badge badge-yellow" style="font-size:10px">Baixo</span>`
                        : status === 'GREEN'  ? `<span class="badge badge-green" style="font-size:10px">Normal</span>`
                        :                       `<span class="badge badge-gray" style="font-size:10px">—</span>`;
            return `<tr>
              <td style="font-weight:600;color:var(--rise-navy)">${escHtml(c.nome)}</td>
              <td style="font-size:12px;color:var(--rise-muted)">${escHtml(c.distrito || '—')}</td>
              <td style="text-align:center;font-weight:700;color:${detColor}">${hasData ? detCurrent : '—'}</td>
              <td style="text-align:center;font-weight:700;color:${uniColor}">${hasData ? uniCurrent : '—'}</td>
              <td style="font-size:11px;color:var(--rise-muted)">${escHtml(sourceLabel)}</td>
              <td style="text-align:center">${badge}</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="openEntregaModal(null,'${c.id}')">+ Entrega</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ${alertRows.length > 0 ? `
    <div style="margin-top:10px;padding:9px 12px;background:#FFFBEB;border-radius:6px;
                font-size:12px;color:#92400E;display:flex;align-items:center;gap:6px">
      ⚠️ <span><strong>${alertRows.length} conselheiro(s)</strong> com stock estimado abaixo de
      ${CONFIG.STOCK_ALERT_UNITS} kits. Solicite reposição atempadamente.</span>
    </div>` : ''}
  `;
}

/* ── Delivery history table ──────────────────────── */
function _renderEntregasTable(entregas, conselheiros) {
  if (!entregas.length) {
    return emptyStateHTML('📦', 'Sem entregas registadas',
      'Registe a primeira entrega de kits usando o botão acima.',
      `<div class="mt-3"><button class="btn btn-primary" onclick="openEntregaModal()">+ Nova Entrega</button></div>`);
  }

  const cMap = Object.fromEntries(conselheiros.map(c => [c.id, c]));
  const allC = store.get('conselheiros') || [];
  const allCMap = Object.fromEntries(allC.map(c => [c.id, c]));

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th><th>Conselheiro</th><th>Distrito</th>
            <th style="text-align:center">Determine</th>
            <th style="text-align:center">Unigold</th>
            <th>Lote / Validade</th><th>Notas</th><th>Acções</th>
          </tr>
        </thead>
        <tbody>
          ${entregas.map(e => {
            const c = cMap[e.conselheiro_id] || allCMap[e.conselheiro_id] || {};
            const loteInfo = [
              e.lote_determine   ? `Det: ${e.lote_determine}${e.validade_determine ? ` val.${e.validade_determine}` : ''}` : '',
              e.lote_unigold     ? `Uni: ${e.lote_unigold}${e.validade_unigold     ? ` val.${e.validade_unigold}`     : ''}` : '',
            ].filter(Boolean).join(' · ');
            return `<tr>
              <td style="font-weight:600;font-size:12px;white-space:nowrap">
                ${formatDate(e.data_entrega + 'T12:00:00')}
              </td>
              <td style="font-weight:600;color:var(--rise-navy)">${escHtml(c.nome || '—')}</td>
              <td style="font-size:12px;color:var(--rise-muted)">${escHtml(c.distrito || '—')}</td>
              <td style="text-align:center;font-weight:700;color:var(--rise-navy)">
                ${e.determine_qty > 0 ? e.determine_qty : '—'}
              </td>
              <td style="text-align:center;font-weight:700;color:#1B6B5A">
                ${e.unigold_qty > 0 ? e.unigold_qty : '—'}
              </td>
              <td style="font-size:11px;color:var(--rise-muted)">
                ${escHtml(loteInfo || '—')}
              </td>
              <td style="font-size:12px;color:var(--rise-muted);max-width:120px;
                         overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                title="${escHtml(e.notas || '')}">
                ${escHtml(e.notas || '—')}
              </td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-secondary btn-sm" onclick="openEntregaModal('${e.id}')">Editar</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteEntrega('${e.id}')">✕</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div style="font-size:11px;color:var(--rise-muted);text-align:right;margin-top:8px">
        ${entregas.length} entrega(s) registada(s)
      </div>
    </div>
  `;
}

/* ── Filters ────────────────────────────────────── */
function filterEntregas() {
  const cId   = document.getElementById('filter-ent-conselheiro')?.value || '';
  const month = document.getElementById('filter-ent-mes')?.value         || '';

  let list = getEntregas().sort((a, b) => b.data_entrega.localeCompare(a.data_entrega));
  if (cId)   list = list.filter(e => e.conselheiro_id === cId);
  if (month) list = list.filter(e => e.data_entrega.startsWith(month));

  const wrap = document.getElementById('entregas-table-wrap');
  if (wrap) wrap.innerHTML = _renderEntregasTable(list, getConselheiros());
}

function clearEntregaFilters() {
  const s = document.getElementById('filter-ent-conselheiro');
  const d = document.getElementById('filter-ent-mes');
  if (s) s.value = '';
  if (d) d.value = '';
  filterEntregas();
}

/* ── Modal — create / edit ──────────────────────── */
function openEntregaModal(id, preselectedCId) {
  const conselheiros = getConselheiros().filter(c => c.ativo);
  const existing     = id ? (getEntregas().find(e => e.id === id) || null) : null;
  const today        = new Date().toISOString().slice(0, 10);
  const preCId       = preselectedCId || existing?.conselheiro_id || '';

  showModal(`
    <div class="modal-header">
      <h3>${existing ? 'Editar Entrega de Kits' : 'Nova Entrega de Kits'}</h3>
      <button class="close-btn" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" style="display:grid;gap:14px">

      <div class="form-group">
        <label>Conselheiro *</label>
        <select id="ent-conselheiro" class="form-control">
          <option value="">— Seleccione o conselheiro —</option>
          ${conselheiros.map(c => `
            <option value="${c.id}" ${preCId === c.id ? 'selected' : ''}>
              ${escHtml(c.nome)} — ${escHtml(c.distrito || c.unidade_sanitaria || '')}
            </option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label>Data de Entrega *</label>
        <input id="ent-data" type="date" class="form-control"
          value="${existing?.data_entrega || today}" />
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label>Determine — Quantidade</label>
          <input id="ent-det-qty" type="number" min="0" class="form-control"
            value="${existing?.determine_qty || 0}" />
        </div>
        <div class="form-group">
          <label>Unigold — Quantidade</label>
          <input id="ent-uni-qty" type="number" min="0" class="form-control"
            value="${existing?.unigold_qty || 0}" />
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label style="font-size:11px">Lote Determine <span style="color:var(--rise-muted)">(opcional)</span></label>
          <input id="ent-det-lote" type="text" class="form-control"
            placeholder="ex: DET-2026-01" value="${escHtml(existing?.lote_determine || '')}" />
        </div>
        <div class="form-group">
          <label style="font-size:11px">Validade Determine</label>
          <input id="ent-det-val" type="month" class="form-control"
            value="${existing?.validade_determine || ''}" />
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label style="font-size:11px">Lote Unigold <span style="color:var(--rise-muted)">(opcional)</span></label>
          <input id="ent-uni-lote" type="text" class="form-control"
            placeholder="ex: UNI-2026-01" value="${escHtml(existing?.lote_unigold || '')}" />
        </div>
        <div class="form-group">
          <label style="font-size:11px">Validade Unigold</label>
          <input id="ent-uni-val" type="month" class="form-control"
            value="${existing?.validade_unigold || ''}" />
        </div>
      </div>

      <div class="form-group">
        <label>Notas <span style="color:var(--rise-muted);font-size:11px">(opcional)</span></label>
        <textarea id="ent-notas" class="form-control" rows="2"
          placeholder="Observações sobre esta entrega…">${escHtml(existing?.notas || '')}</textarea>
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveEntrega('${id || ''}')">
        ${existing ? '💾 Guardar Alterações' : '📦 Registar Entrega'}
      </button>
    </div>
  `);
}

/* ── Save / Delete ───────────────────────────────── */
function saveEntrega(editId) {
  const cId    = document.getElementById('ent-conselheiro')?.value;
  const data   = document.getElementById('ent-data')?.value;
  const detQty = parseInt(document.getElementById('ent-det-qty')?.value)  || 0;
  const uniQty = parseInt(document.getElementById('ent-uni-qty')?.value)  || 0;
  const detLote= document.getElementById('ent-det-lote')?.value.trim()    || '';
  const detVal = document.getElementById('ent-det-val')?.value             || '';
  const uniLote= document.getElementById('ent-uni-lote')?.value.trim()    || '';
  const uniVal = document.getElementById('ent-uni-val')?.value             || '';
  const notas  = document.getElementById('ent-notas')?.value.trim()        || '';

  if (!cId)  { showToast('Seleccione um conselheiro.', 'error'); return; }
  if (!data) { showToast('Data de entrega obrigatória.', 'error'); return; }
  if (detQty <= 0 && uniQty <= 0) {
    showToast('Introduza pelo menos uma quantidade (Determine ou Unigold).', 'error'); return;
  }

  const all = getEntregas();
  const now = new Date().toISOString();

  if (editId) {
    const idx = all.findIndex(e => e.id === editId);
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        conselheiro_id: cId, data_entrega: data,
        determine_qty: detQty, unigold_qty: uniQty,
        lote_determine: detLote, validade_determine: detVal,
        lote_unigold:   uniLote, validade_unigold:   uniVal,
        notas, updated_at: now
      };
    }
  } else {
    const rec = {
      id: uuid(), conselheiro_id: cId, data_entrega: data,
      determine_qty: detQty, unigold_qty: uniQty,
      lote_determine: detLote, validade_determine: detVal,
      lote_unigold:   uniLote, validade_unigold:   uniVal,
      notas, created_at: now
    };
    all.push(rec);
    const q = store.get('sync_queue') || [];
    q.push(rec.id);
    store.set('sync_queue', q);
  }

  saveEntregas(all);
  closeModal();
  showToast(editId ? 'Entrega actualizada.' : 'Entrega registada com sucesso.', 'success');
  updateTopbarContext();
  renderEntregas();
  if (typeof _trySyncNow === 'function') _trySyncNow();
}

function deleteEntrega(id) {
  const e = getEntregas().find(x => x.id === id);
  if (!e) return;
  const c = (store.get('conselheiros') || []).find(x => x.id === e.conselheiro_id);
  showConfirm(
    'Eliminar Entrega',
    `Eliminar a entrega de <strong>${formatDate(e.data_entrega + 'T12:00:00')}</strong> para
     <strong>${escHtml(c?.nome || '—')}</strong>? Esta acção não pode ser revertida.`,
    () => {
      const updated = getEntregas().filter(x => x.id !== id);
      saveEntregas(updated);
      showToast('Entrega eliminada.', 'success');
      renderEntregas();
    }
  );
}
