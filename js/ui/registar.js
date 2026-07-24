/* ══════════════════════════════════════════════════
   REGISTAR — Mapa de Consumo de Testes Rápidos (VIH)
   Mirrors the official MoH paper form:
     Determine  → Consumo / Positivos / Injustificados
     Unigold    → Consumo / Positivos / Injustificados
   Plus full algorithm breakdown for the scoring engine.
══════════════════════════════════════════════════ */

let _stockAutoFilledFor = null; // tracks which cId+period was auto-populated

function renderRegistar(conselheiroId) {
  _registarEditId     = null;
  _stockAutoFilledFor = null;
  const conselheiros = getConselheiros().filter(c => c.ativo);
  const period       = activePeriod();

  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Mapa de Consumo de Testes Rápidos — VIH</h2>
        <p>Determine &amp; Unigold · Consumo / Positivos / Injustificados</p>
      </div>
    </div>

    ${conselheiros.length === 0
      ? emptyStateHTML('👤', 'Sem conselheiros activos',
          'Adicione conselheiros antes de registar resultados.',
          `<div class="mt-3"><button class="btn btn-primary" onclick="navigate('conselheiros')">+ Adicionar Conselheiros</button></div>`)
      : `

    <!-- ── Header: Conselheiro + Período + Serviço ── -->
    <div class="card" style="margin-bottom:16px">
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:14px;align-items:end;flex-wrap:wrap">

        <div class="form-group" style="margin:0">
          <label>Conselheiro / Utilizador *</label>
          <select id="reg-conselheiro" class="form-control" onchange="onFormChange()">
            <option value="">— Seleccione o conselheiro —</option>
            ${conselheiros.map(c =>
              `<option value="${c.id}" ${conselheiroId===c.id?'selected':''}>
                ${escHtml(c.nome)} — ${escHtml(c.unidade_sanitaria||c.distrito||'')}
              </option>`).join('')}
          </select>
        </div>

        <div class="form-group" style="margin:0">
          <label>Tipo de Período</label>
          <div class="toggle-group" style="width:100%">
            <button style="flex:1" class="${dashboardPeriodTipo==='semanal'?'active':''}" onclick="setPeriodoTipo('semanal')">Semanal</button>
            <button style="flex:1" class="${dashboardPeriodTipo==='mensal'?'active':''}"  onclick="setPeriodoTipo('mensal')">Mensal</button>
          </div>
        </div>

        <div class="form-group" style="margin:0">
          <label>Período de Referência</label>
          <div id="periodo-display"
            style="padding:8px 12px;background:var(--rise-light);border-radius:7px;font-weight:700;
                   font-size:13px;color:var(--rise-navy);text-align:center;border:1px solid #E2E8F0">
            ${periodLabel(period)}
          </div>
        </div>

      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">
        <div class="form-group" style="margin:0">
          <label>Depósito / Serviço Utilizador</label>
          <input id="reg-servico" type="text" class="form-control"
            placeholder="ex: ATS Consulta, Maternidade, CS Chimoio…" />
        </div>
        <div class="form-group" style="margin:0">
          <label>Assinatura (nome do responsável)</label>
          <input id="reg-assinatura" type="text" class="form-control"
            placeholder="Nome do supervisor / conselheiro" />
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════
         MAPA DE CONSUMO  (official form table layout)
    ══════════════════════════════════════════════ -->
    <div class="card" style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:var(--rise-muted);text-transform:uppercase;
                  letter-spacing:.06em;margin-bottom:14px">
        📋 Mapa de Consumo de Testes Rápidos — VIH
      </div>

      <div class="table-wrap">
        <table style="border:1px solid #CBD5E0">
          <thead>
            <!-- Row 1: test type groups -->
            <tr>
              <th style="background:var(--rise-navy);color:#fff;border:1px solid rgba(255,255,255,.2);
                         width:140px;font-size:11px">Teste / Campo</th>
              <th colspan="3" style="background:var(--rise-navy);color:#fff;text-align:center;
                                     border:1px solid rgba(255,255,255,.2);font-size:12px;letter-spacing:.04em">
                🔬 DETERMINE TESTE
              </th>
              <th colspan="3" style="background:#1B6B5A;color:#fff;text-align:center;
                                     border:1px solid rgba(255,255,255,.2);font-size:12px;letter-spacing:.04em">
                🧪 UNIGOLD TESTES
              </th>
            </tr>
            <!-- Row 2: column sub-headers -->
            <tr style="background:#F7FAFC">
              <th style="border:1px solid #E2E8F0;font-size:10px;color:var(--rise-muted)">Campo</th>
              <th style="border:1px solid #E2E8F0;text-align:center;font-size:10px;color:var(--rise-navy)">Consumo</th>
              <th style="border:1px solid #E2E8F0;text-align:center;font-size:10px;color:var(--rise-navy)">Positivos</th>
              <th style="border:1px solid #E2E8F0;text-align:center;font-size:10px;color:var(--status-red)">Injustificados</th>
              <th style="border:1px solid #E2E8F0;text-align:center;font-size:10px;color:var(--rise-navy)">Consumo</th>
              <th style="border:1px solid #E2E8F0;text-align:center;font-size:10px;color:var(--rise-navy)">Positivos</th>
              <th style="border:1px solid #E2E8F0;text-align:center;font-size:10px;color:var(--status-red)">Injustificados</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid #E2E8F0;font-size:11px;font-weight:600;color:var(--rise-muted);
                         background:#FAFAFA;padding:6px 10px">Nº de testes</td>
              <!-- Determine -->
              <td style="border:1px solid #E2E8F0;padding:6px">
                <input id="reg-det-cons" type="number" min="0" value="0"
                  style="width:80px;text-align:center;padding:5px 6px;border:1px solid #CBD5E0;
                         border-radius:5px;font-size:13px;font-weight:600;font-family:inherit"
                  oninput="onFormChange();autoCalcInjust()" />
              </td>
              <td style="border:1px solid #E2E8F0;padding:6px">
                <input id="reg-det-r" type="number" min="0" value="0"
                  style="width:80px;text-align:center;padding:5px 6px;border:1px solid #CBD5E0;
                         border-radius:5px;font-size:13px;font-family:inherit"
                  oninput="onFormChange();autoCalcInjust()" />
              </td>
              <td style="border:1px solid #E2E8F0;padding:6px;background:#FEF9F9">
                <div style="position:relative">
                  <input id="reg-det-injust" type="number" min="0" value="0"
                    style="width:80px;text-align:center;padding:5px 6px;
                           border:1px solid #FECACA;border-radius:5px;
                           font-size:13px;font-weight:600;color:var(--status-red);
                           background:#FEF9F9;font-family:inherit"
                    oninput="onFormChange()" />
                  <span id="det-injust-auto"
                    style="display:none;position:absolute;right:-20px;top:6px;font-size:10px;color:var(--status-yellow)" title="Auto-calculado">⟳</span>
                </div>
              </td>
              <!-- Unigold -->
              <td style="border:1px solid #E2E8F0;padding:6px">
                <input id="reg-uni-cons" type="number" min="0" value="0"
                  style="width:80px;text-align:center;padding:5px 6px;border:1px solid #CBD5E0;
                         border-radius:5px;font-size:13px;font-weight:600;font-family:inherit"
                  oninput="onFormChange();autoCalcInjust()" />
              </td>
              <td style="border:1px solid #E2E8F0;padding:6px">
                <input id="reg-uni-r" type="number" min="0" value="0"
                  style="width:80px;text-align:center;padding:5px 6px;border:1px solid #CBD5E0;
                         border-radius:5px;font-size:13px;font-family:inherit"
                  oninput="onFormChange();autoCalcInjust()" />
              </td>
              <td style="border:1px solid #E2E8F0;padding:6px;background:#FEF9F9">
                <input id="reg-uni-injust" type="number" min="0" value="0"
                  style="width:80px;text-align:center;padding:5px 6px;
                         border:1px solid #FECACA;border-radius:5px;
                         font-size:13px;font-weight:600;color:var(--status-red);
                         background:#FEF9F9;font-family:inherit"
                  oninput="onFormChange()" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Auto-calc toggle -->
      <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--rise-muted);cursor:pointer">
          <input type="checkbox" id="reg-auto-injust" checked onchange="autoCalcInjust()"
            style="width:14px;height:14px" />
          Calcular Injustificados automaticamente
          <span title="Determine Injustificados = Consumo − Total Testados&#10;Unigold Injustificados = Consumo − Unigold Realizados"
            style="cursor:help;color:var(--rise-teal)">ⓘ</span>
        </label>
        <span style="font-size:11px;color:var(--rise-muted)">
          (Det: Consumo − Total testados &nbsp;·&nbsp; Uni: Consumo − Unigold realizados)
        </span>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════
         DETALHE DO ALGORITMO HIV (collapsible)
    ══════════════════════════════════════════════ -->
    <div class="card" style="margin-bottom:16px">
      <div class="collapsible-header" id="alg-toggle"
        onclick="toggleSection('alg-body','alg-toggle')"
        style="padding-bottom:2px">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:16px">📊</span>
          <div>
            <div style="font-weight:700;font-size:13px;color:var(--rise-navy)">
              Detalhe do Algoritmo HIV
            </div>
            <div style="font-size:11px;color:var(--rise-muted)">
              Campos necessários para o cálculo de fiabilidade (C01–C07)
            </div>
          </div>
        </div>
        <span id="alg-toggle-icon" style="color:var(--rise-muted);font-size:16px">▼</span>
      </div>

      <div id="alg-body" style="margin-top:16px">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px">
          ${[
            ['reg-total',    'Total Testados *',          'total_testados',           'Todos os indivíduos testados no período'],
            ['reg-det-r',    'Determine Reactivos',       'determine_reactivos',       'Já capturado no Mapa acima'],
            ['reg-det-nr',   'Determine Não Reactivos',   'determine_nao_reactivos',   'Det. negativos → HIV negativo final'],
            ['reg-uni-real', 'Unigold Realizados',        'unigold_realizados',        'Nº de testes Unigold efectivamente feitos'],
            ['reg-uni-r',    'Unigold Reactivos',         'unigold_reactivos',         'Já capturado no Mapa acima'],
            ['reg-uni-nr',   'Unigold Não Reactivos',     'unigold_nao_reactivos',     'Unigold negativos → Indeterminado'],
            ['reg-pos',      'Positivos Confirmados',     'positivos_confirmados',     'HIV+ final confirmado'],
            ['reg-neg',      'Negativos Finais',          'negativos_finais',          'HIV− final'],
            ['reg-indet',    'Indeterminados',            'indeterminados',            'Resultado inconclusivo'],
          ].map(([id, label, , hint]) => `
            <div class="form-group" style="margin:0">
              <label style="font-size:11px" title="${hint}">${label}
                ${id==='reg-det-r'||id==='reg-uni-r' ? `<span style="color:var(--rise-teal);font-size:10px"> ← do Mapa</span>` : ''}
              </label>
              <input id="${id}" type="number" class="form-control" min="0" value="0"
                oninput="onFormChange()" style="font-size:13px" />
            </div>`).join('')}
        </div>
        <div style="margin-top:10px;padding:8px 12px;background:#F0FDF4;border-radius:6px;
                    font-size:11px;color:#166534;border:1px solid #BBF7D0">
          💡 <strong>Atenção:</strong> Os campos "Determine Reactivos" e "Unigold Reactivos" são partilhados com o Mapa acima —
          basta preencher uma vez.
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════
         RECONCILIAÇÃO DE STOCK (collapsible)
    ══════════════════════════════════════════════ -->
    <div class="card" style="margin-bottom:16px">
      <div class="collapsible-header" id="stock-toggle"
        onclick="toggleSection('stock-body','stock-toggle')">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:16px">📦</span>
          <div>
            <div style="font-weight:700;font-size:13px;color:var(--rise-navy)">
              Reconciliação de Stock
            </div>
            <div style="font-size:11px;color:var(--rise-muted)">
              Abertura · Recebido · Consumido · Expirado · Fecho (S01–S08)
            </div>
          </div>
        </div>
        <span id="stock-toggle-icon" style="color:var(--rise-muted);font-size:16px">▼</span>
      </div>

      <div id="stock-body" style="margin-top:16px">
        <div id="stock-info-banners" style="margin-bottom:4px"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
          <!-- Determine stock -->
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--rise-navy);text-transform:uppercase;
                        letter-spacing:.05em;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid var(--rise-navy)">
              Determine
            </div>
            ${[
              ['reg-det-ab',  'Stock Abertura'],
              ['reg-det-rec', 'Recebido'],
              ['reg-det-exp', 'Expirado / Perdido'],
              ['reg-det-fech','Stock Fecho'],
            ].map(([id, label]) => `
              <div class="form-group" style="margin:0 0 10px">
                <label style="font-size:11px">${label}</label>
                <input id="${id}" type="number" class="form-control" min="0" value="0"
                  oninput="onFormChange()" style="font-size:13px" />
              </div>`).join('')}
            <div style="padding:8px 10px;background:var(--rise-light);border-radius:6px;font-size:11px;color:var(--rise-muted)">
              <strong>Consumido:</strong> lido do Mapa acima
              (<span id="det-cons-echo" style="font-weight:700;color:var(--rise-navy)">0</span> kits)
            </div>
          </div>
          <!-- Unigold stock -->
          <div>
            <div style="font-size:11px;font-weight:700;color:#1B6B5A;text-transform:uppercase;
                        letter-spacing:.05em;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #1B6B5A">
              Unigold
            </div>
            ${[
              ['reg-uni-ab',  'Stock Abertura'],
              ['reg-uni-rec', 'Recebido'],
              ['reg-uni-exp', 'Expirado / Perdido'],
              ['reg-uni-fech','Stock Fecho'],
            ].map(([id, label]) => `
              <div class="form-group" style="margin:0 0 10px">
                <label style="font-size:11px">${label}</label>
                <input id="${id}" type="number" class="form-control" min="0" value="0"
                  oninput="onFormChange()" style="font-size:13px" />
              </div>`).join('')}
            <div style="padding:8px 10px;background:var(--rise-light);border-radius:6px;font-size:11px;color:var(--rise-muted)">
              <strong>Consumido:</strong> lido do Mapa acima
              (<span id="uni-cons-echo" style="font-weight:700;color:#1B6B5A">0</span> kits)
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Validation panel -->
    <div id="reg-validation" style="margin-bottom:16px"></div>

    <!-- Indicators live preview -->
    <div id="reg-indicators"
      style="display:none;background:var(--rise-light);border-radius:10px;padding:14px;margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;color:var(--rise-muted);text-transform:uppercase;
                  letter-spacing:.06em;margin-bottom:10px">
        Pré-visualização de Indicadores
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px"
        id="reg-indicators-body"></div>
    </div>

    <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px">
      <button class="btn btn-secondary" onclick="navigate('dashboard')">Cancelar</button>
      <button id="reg-save-btn" class="btn btn-primary" onclick="saveRegisto()" disabled>
        💾 Guardar Registo
      </button>
    </div>
    `}
  `;

  if (conselheiroId) onFormChange();
}

/* ── Collapsible section toggle ─────────────────── */
function toggleSection(bodyId, toggleId) {
  const body = document.getElementById(bodyId);
  const icon = document.getElementById(toggleId + '-icon');
  if (!body) return;
  const collapsed = body.style.display === 'none';
  body.style.display = collapsed ? '' : 'none';
  if (icon) icon.textContent = collapsed ? '▼' : '▶';
}

/* ── Auto-calculate Injustificados ─────────────── */
function autoCalcInjust() {
  const auto = document.getElementById('reg-auto-injust')?.checked;
  if (!auto) return;

  const detCons  = n('reg-det-cons');
  const total    = n('reg-total');
  const uniCons  = n('reg-uni-cons');
  const uniReal  = n('reg-uni-real');

  // Det Injustificados = max(0, Consumo − Total Testados)
  const detInj = Math.max(0, detCons - total);
  const elDI = document.getElementById('reg-det-injust');
  if (elDI) elDI.value = detInj;

  // Uni Injustificados = max(0, Consumo − Unigold Realizados)
  const uniInj = Math.max(0, uniCons - uniReal);
  const elUI = document.getElementById('reg-uni-injust');
  if (elUI) elUI.value = uniInj;
}

/* ── Period type switching ──────────────────────── */
function setPeriodoTipo(tipo) {
  dashboardPeriodTipo = tipo;
  dashboardPeriod = null;
  const el = document.getElementById('periodo-display');
  if (el) el.textContent = periodLabel(activePeriod());
  onFormChange();
}

/* ── Live form change handler ───────────────────── */
function onFormChange() {
  const cId = document.getElementById('reg-conselheiro')?.value;
  if (!cId) {
    const btn = document.getElementById('reg-save-btn');
    if (btn) btn.disabled = true;
    return;
  }

  // Sync echo labels in stock section
  const detConsEl = document.getElementById('det-cons-echo');
  const uniConsEl = document.getElementById('uni-cons-echo');
  if (detConsEl) detConsEl.textContent = n('reg-det-cons');
  if (uniConsEl) uniConsEl.textContent = n('reg-uni-cons');

  // Keep Determine Reactivos (reg-det-r) and Unigold Reactivos (reg-uni-r)
  // in sync between the Mapa table and the Algorithm section —
  // the table inputs have the same IDs as the algorithm section inputs, so they share values.

  // Load existing record for this counselor+period if not already loaded
  const period   = activePeriod();
  const existing = (store.get('resultados') || []).find(r => r.conselheiro_id === cId && r.periodo_ref === period);
  const existingS= (store.get('stock')      || []).find(s => s.conselheiro_id === cId && s.periodo_ref === period);

  if (existing && _registarEditId !== existing.id) {
    _registarEditId = existing.id;

    // Results fields
    const rMap = {
      'reg-total':    'total_testados',
      'reg-det-r':    'determine_reactivos',
      'reg-det-nr':   'determine_nao_reactivos',
      'reg-uni-real': 'unigold_realizados',
      'reg-uni-r':    'unigold_reactivos',
      'reg-uni-nr':   'unigold_nao_reactivos',
      'reg-pos':      'positivos_confirmados',
      'reg-neg':      'negativos_finais',
      'reg-indet':    'indeterminados',
      'reg-det-cons': 'determine_consumido_reportado',
      'reg-uni-cons': 'unigold_consumido_reportado',
      'reg-det-injust':'determine_injustificados',
      'reg-uni-injust':'unigold_injustificados',
      'reg-servico':   'servico_depositario',
      'reg-assinatura':'assinatura',
    };
    Object.entries(rMap).forEach(([id, field]) => {
      const el = document.getElementById(id);
      if (el) el.value = existing[field] ?? (el.type === 'number' ? 0 : '');
    });
  }

  if (existingS && _registarEditId) {
    const sMap = {
      'reg-det-ab':  'determine_stock_abertura',
      'reg-det-rec': 'determine_recebido',
      'reg-det-exp': 'determine_expirado_perdido',
      'reg-det-fech':'determine_fecho',
      'reg-uni-ab':  'unigold_stock_abertura',
      'reg-uni-rec': 'unigold_recebido',
      'reg-uni-exp': 'unigold_expirado_perdido',
      'reg-uni-fech':'unigold_fecho',
    };
    Object.entries(sMap).forEach(([id, field]) => {
      const el = document.getElementById(id);
      if (el) el.value = existingS[field] ?? 0;
    });
    _stockAutoFilledFor = null; // editing existing — no auto-populate needed
  }

  // Auto-populate opening stock + received for new (unsaved) periods
  if (!existing && cId) {
    const stateKey = cId + '|' + period;
    if (_stockAutoFilledFor !== stateKey) {
      _stockAutoFilledFor = stateKey;
      _autoPopulateStock(cId, period);
    }
  }

  runValidation();
}

/* ── Auto-populate stock from delivery history ──── */
function _autoPopulateStock(cId, period) {
  const allStock     = store.get('stock')        || [];
  const allEntregas  = store.get('entregas')     || [];
  const conselheiros = store.get('conselheiros') || [];
  const tipo         = dashboardPeriodTipo;
  const prev         = prevPeriodRef(period, tipo);

  // Opening stock: carry forward from previous period's closing stock
  const prevStock  = prev && allStock.find(s => s.conselheiro_id === cId && s.periodo_ref === prev);
  let detAb = 0, uniAb = 0, hasCarry = false, carryFrom = null;

  if (prevStock) {
    detAb    = prevStock.determine_fecho || 0;
    uniAb    = prevStock.unigold_fecho   || 0;
    hasCarry = true;
    carryFrom= prev;
  } else {
    // Fall back to counselor's initial stock setting
    const c  = conselheiros.find(x => x.id === cId);
    detAb    = c?.stock_inicial_determine || 0;
    uniAb    = c?.stock_inicial_unigold   || 0;
  }

  // Received: sum deliveries that fall inside this period's date range
  const periodEntregas = allEntregas.filter(e =>
    e.conselheiro_id === cId && dateInPeriod(e.data_entrega, period)
  );
  const detRec = periodEntregas.reduce((s, e) => s + (e.determine_qty || 0), 0);
  const uniRec = periodEntregas.reduce((s, e) => s + (e.unigold_qty   || 0), 0);

  // Push values into form fields
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('reg-det-ab',  detAb);
  set('reg-uni-ab',  uniAb);
  set('reg-det-rec', detRec);
  set('reg-uni-rec', uniRec);

  _updateStockInfoBanners(hasCarry, carryFrom, periodEntregas);
}

function _updateStockInfoBanners(hasCarry, carryFrom, periodEntregas) {
  const wrap = document.getElementById('stock-info-banners');
  if (!wrap) return;

  const parts = [];

  if (hasCarry) {
    parts.push(`<div style="padding:8px 12px;border-radius:6px;font-size:11px;margin-bottom:6px;
                            background:#EFF6FF;color:#1E40AF;display:flex;align-items:center;gap:6px">
      ℹ️ Stock de Abertura transportado automaticamente de
      <strong>${escHtml(periodLabel(carryFrom))}</strong>. Edite se os valores não corresponderem.
    </div>`);
  } else {
    parts.push(`<div style="padding:8px 12px;border-radius:6px;font-size:11px;margin-bottom:6px;
                            background:#FFFBEB;color:#92400E;display:flex;align-items:center;gap:6px">
      ⚠️ Sem registo do período anterior — a usar stock inicial do conselheiro. Corrija se necessário.
    </div>`);
  }

  if (periodEntregas.length > 0) {
    parts.push(`<div style="padding:8px 12px;border-radius:6px;font-size:11px;margin-bottom:6px;
                            background:#F0FDF4;color:#166534;display:flex;align-items:center;gap:6px">
      📦 Campo "Recebido" calculado a partir de <strong>${periodEntregas.length} entrega(s)</strong>
      registada(s) neste período.
      <a href="#" onclick="navigate('entregas');return false"
        style="color:#166534;margin-left:4px;font-weight:600;text-decoration:underline">
        Ver entregas →
      </a>
    </div>`);
  } else {
    parts.push(`<div style="padding:8px 12px;border-radius:6px;font-size:11px;margin-bottom:6px;
                            background:#F1F5F9;color:var(--rise-muted);display:flex;align-items:center;gap:6px">
      📦 Sem entregas registadas neste período.
      <a href="#" onclick="navigate('entregas');return false"
        style="color:var(--rise-teal);margin-left:4px;font-weight:600;text-decoration:underline">
        Registar entrega →
      </a>
    </div>`);
  }

  wrap.innerHTML = parts.join('');
}

/* ── Validation & live indicators ──────────────── */
function runValidation() {
  const r   = _readFormRecord();
  const s   = _readFormStock();
  const sc  = computeReliability(r, s);

  const validationDiv = document.getElementById('reg-validation');
  const indicDiv      = document.getElementById('reg-indicators');
  const indicBody     = document.getElementById('reg-indicators-body');
  const saveBtn       = document.getElementById('reg-save-btn');

  const hasData = (r.total_testados || 0) > 0 || (r.determine_consumido_reportado || 0) > 0;
  if (saveBtn) saveBtn.disabled = !document.getElementById('reg-conselheiro')?.value;

  // Injustificados flags (I01, I02)
  const injustFlags = [];
  const detInj  = r.determine_injustificados || 0;
  const uniInj  = r.unigold_injustificados   || 0;
  const detCons = r.determine_consumido_reportado || 0;
  const uniCons = r.unigold_consumido_reportado   || 0;
  if (detInj > 0 && detCons > 0) {
    const pct = (detInj / detCons * 100).toFixed(1);
    if (detInj / detCons > 0.15)
      injustFlags.push({ id:'I01', label:`Determine Injustificados ${pct}% do consumo (> 15%)`, severity:'HIGH' });
    else if (detInj / detCons > 0.05)
      injustFlags.push({ id:'I01', label:`Determine Injustificados ${pct}% do consumo (> 5%)`, severity:'MEDIUM' });
  }
  if (uniInj > 0 && uniCons > 0) {
    const pct = (uniInj / uniCons * 100).toFixed(1);
    if (uniInj / uniCons > 0.15)
      injustFlags.push({ id:'I02', label:`Unigold Injustificados ${pct}% do consumo (> 15%)`, severity:'HIGH' });
    else if (uniInj / uniCons > 0.05)
      injustFlags.push({ id:'I02', label:`Unigold Injustificados ${pct}% do consumo (> 5%)`, severity:'MEDIUM' });
  }

  const allFlags   = [...sc.consistFlags, ...sc.stockFlags, ...injustFlags];
  const critFlags  = allFlags.filter(f => f.severity === 'HIGH');

  if (validationDiv) {
    validationDiv.innerHTML = allFlags.length > 0 ? `
      <div style="border:1px solid ${critFlags.length>0?'var(--status-red)':'var(--status-yellow)'};
                  border-radius:8px;padding:12px">
        <div style="font-weight:600;font-size:12px;margin-bottom:8px;
                    color:${critFlags.length>0?'var(--status-red)':'#92400E'}">
          ${critFlags.length > 0 ? '⚠️ Verificar inconsistências antes de guardar' : '💡 Avisos — pode guardar mas reveja os dados'}
        </div>
        ${allFlags.map(f => `
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:5px;font-size:12px">
            <span style="color:${f.severity==='HIGH'?'var(--status-red)':'var(--status-yellow)'};
                         font-size:14px;margin-top:1px">
              ${f.severity==='HIGH'?'●':'◐'}
            </span>
            <code style="font-size:11px;background:#F1F5F9;padding:1px 5px;border-radius:4px;
                         flex-shrink:0">${f.id}</code>
            <span>${f.label}</span>
          </div>`).join('')}
      </div>` : hasData ? `
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px;
                  font-size:12px;color:#166534;display:flex;align-items:center;gap:8px">
        <span>✅</span><span>Dados consistentes — sem flags de qualidade.</span>
      </div>` : '';
  }

  if (indicDiv && indicBody && hasData) {
    indicDiv.style.display = '';
    const ind = sc.indicators;
    indicBody.innerHTML = [
      indicator('Yield%',
        ind.yieldPct !== null ? ind.yieldPct+'%' : '—',
        ind.yieldPct !== null && ind.yieldPct >= 5, 'Meta ≥ 5%'),
      indicator('Aderência%',
        ind.adherPct !== null ? ind.adherPct+'%' : 'N/A',
        ind.adherPct === null || ind.adherPct >= 95, 'Meta ≥ 95%'),
      indicator('Indeter.%',
        ind.indetPct !== null ? ind.indetPct+'%' : '—',
        ind.indetPct === null || ind.indetPct <= 2, 'Meta ≤ 2%'),
      indicator('Inj. Det.',
        detCons > 0 ? detInj + ' kits' : '—',
        detInj === 0, detInj === 0 ? 'OK' : `${(detInj/detCons*100).toFixed(0)}% cons.`),
      indicator('Inj. Uni.',
        uniCons > 0 ? uniInj + ' kits' : '—',
        uniInj === 0, uniInj === 0 ? 'OK' : `${(uniInj/uniCons*100).toFixed(0)}% cons.`),
      indicator('Score', sc.score_global, null, null, sc.score_global),
    ].join('');
  } else if (indicDiv && !hasData) {
    indicDiv.style.display = 'none';
  }
}

/* ── Indicator card helper ──────────────────────── */
function indicator(label, value, isOk, hint, scoreOverride) {
  let color = isOk === null ? 'var(--rise-navy)'
            : isOk          ? 'var(--status-green)'
            :                 'var(--status-red)';
  if (scoreOverride) {
    color = scoreOverride === 'GREEN' ? 'var(--status-green)'
          : scoreOverride === 'RED'   ? 'var(--status-red)'
          :                             'var(--status-yellow)';
  }
  return `
    <div style="background:#fff;border-radius:8px;padding:10px;border:1px solid #E2E8F0;text-align:center">
      <div style="font-size:10px;color:var(--rise-muted);font-weight:600;
                  text-transform:uppercase;margin-bottom:4px">${label}</div>
      <div style="font-size:17px;font-weight:800;color:${color}">${value}</div>
      ${hint ? `<div style="font-size:10px;color:var(--rise-muted);margin-top:2px">${hint}</div>` : ''}
    </div>`;
}

/* ── Read form values ───────────────────────────── */
function _readFormRecord() {
  return {
    // Mapa de Consumo fields
    determine_consumido_reportado: n('reg-det-cons'),
    unigold_consumido_reportado:   n('reg-uni-cons'),
    determine_injustificados:      n('reg-det-injust'),
    unigold_injustificados:        n('reg-uni-injust'),
    // Algorithm detail fields
    total_testados:                n('reg-total'),
    determine_reactivos:           n('reg-det-r'),
    determine_nao_reactivos:       n('reg-det-nr'),
    unigold_realizados:            n('reg-uni-real'),
    unigold_reactivos:             n('reg-uni-r'),
    unigold_nao_reactivos:         n('reg-uni-nr'),
    positivos_confirmados:         n('reg-pos'),
    negativos_finais:              n('reg-neg'),
    indeterminados:                n('reg-indet'),
    // Header fields
    servico_depositario: document.getElementById('reg-servico')?.value.trim()    || '',
    assinatura:          document.getElementById('reg-assinatura')?.value.trim() || '',
  };
}

function _readFormStock() {
  return {
    determine_stock_abertura:      n('reg-det-ab'),
    determine_recebido:            n('reg-det-rec'),
    determine_consumido_reportado: n('reg-det-cons'),   // read from Mapa table
    determine_expirado_perdido:    n('reg-det-exp'),
    determine_fecho:               n('reg-det-fech'),
    unigold_stock_abertura:        n('reg-uni-ab'),
    unigold_recebido:              n('reg-uni-rec'),
    unigold_consumido_reportado:   n('reg-uni-cons'),   // read from Mapa table
    unigold_expirado_perdido:      n('reg-uni-exp'),
    unigold_fecho:                 n('reg-uni-fech'),
  };
}

/* ── Save ───────────────────────────────────────── */
function saveRegisto() {
  const cId = document.getElementById('reg-conselheiro')?.value;
  if (!cId) { showToast('Seleccione um conselheiro.', 'error'); return; }

  const period = activePeriod();
  const now    = new Date().toISOString();
  const r      = _readFormRecord();
  const s      = _readFormStock();

  const allR = store.get('resultados') || [];
  const allS = store.get('stock')      || [];
  const q    = store.get('sync_queue') || [];

  if (_registarEditId) {
    const idx = allR.findIndex(x => x.id === _registarEditId);
    if (idx >= 0) allR[idx] = { ...allR[idx], ...r, periodo_ref: period, updated_at: now };

    const sIdx = allS.findIndex(x => x.conselheiro_id === cId && x.periodo_ref === period);
    if (sIdx >= 0) {
      allS[sIdx] = { ...allS[sIdx], ...s, periodo_ref: period, updated_at: now };
    } else {
      allS.push({ id: uuid(), conselheiro_id: cId, periodo_ref: period,
        periodo_tipo: dashboardPeriodTipo, ...s, created_at: now });
    }
  } else {
    const resultId = uuid();
    const stockId  = uuid();
    allR.push({ id: resultId, conselheiro_id: cId, periodo_ref: period,
      periodo_tipo: dashboardPeriodTipo, ...r, created_at: now });
    allS.push({ id: stockId, conselheiro_id: cId, periodo_ref: period,
      periodo_tipo: dashboardPeriodTipo, ...s, created_at: now });
    q.push(resultId, stockId);
  }

  store.set('resultados', allR);
  store.set('stock', allS);
  store.set('sync_queue', q);

  showToast('Registo guardado com sucesso.', 'success');
  updateTopbarContext();
  navigate('dashboard');

  // Attempt immediate sync in background — silent if offline or URL not set
  _trySyncNow();
}

/* ── Background sync attempt (non-blocking) ──────── */
function _trySyncNow() {
  const url   = store.get('config')?.apps_script_url || (typeof CONFIG !== 'undefined' && CONFIG.APPS_SCRIPT_URL) || '';
  const queue = store.get('sync_queue') || [];
  if (!url || !queue.length || !navigator.onLine) return;

  // Fire-and-forget: reuse the main sync logic without touching the UI
  const allResultados   = store.get('resultados')   || [];
  const allStock        = store.get('stock')         || [];
  const allConselheiros = store.get('conselheiros')  || [];
  const allEntregas     = store.get('entregas')      || [];

  const pendR = allResultados.filter(r => queue.includes(r.id));
  const pendS = allStock.filter(s => queue.includes(s.id));
  const pendC = allConselheiros.filter(c => queue.includes(c.id));
  const pendE = allEntregas.filter(e => queue.includes(e.id));

  const postBatch = (action, records) => {
    if (!records.length) return Promise.resolve();
    return fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ action, records, provincia: currentProvincia, role: currentRole })
    });
  };

  postBatch('sync_conselheiros', pendC)
    .then(() => postBatch('sync_resultados', pendR))
    .then(() => postBatch('sync_stock', pendS))
    .then(() => postBatch('sync_entregas', pendE))
    .then(() => {
      store.set('sync_queue', []);
      store.set('last_sync', new Date().toISOString());
      updateSyncUI();
    })
    .catch(() => { /* silent fail — auto-sync timer will retry */ });
}

/* ── Open for a specific counselor ─────────────── */
function openRegistarFor(conselheiroId) {
  currentScreen = 'registar';
  renderRegistar(conselheiroId);
  document.getElementById('topbar-title').textContent = 'Registar Resultados';
  document.querySelectorAll('#sidebar-nav a').forEach(a =>
    a.classList.toggle('active', a.dataset.screen === 'registar'));
  document.querySelectorAll('#mobile-tabs-inner a').forEach(a =>
    a.classList.toggle('active', a.dataset.screen === 'registar'));
}
