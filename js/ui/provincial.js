/* ══════════════════════════════════════════════════
   PROVINCIAL — Province-wide overview, scorecard, relatorio
   Provincial role: read-only aggregated views across all districts
══════════════════════════════════════════════════ */

/* ── Provincial period state (separate from distrital) ── */
let provPeriod     = null;   // null = current
let provPeriodTipo = 'semanal';

function provActivePeriod()     { return provPeriod || (provPeriodTipo === 'mensal' ? currentMonthRef() : currentWeekRef()); }
function provIsCurrentPeriod()  { return !provPeriod || provPeriod === (provPeriodTipo === 'mensal' ? currentMonthRef() : currentWeekRef()); }
function provPeriodShift(delta) {
  const p = provActivePeriod();
  provPeriod = provPeriodTipo === 'semanal' ? shiftWeek(p, delta) : shiftMonth(p, delta);
  renderDashboardProvincial();
}
function provPeriodReset()       { provPeriod = null; renderDashboardProvincial(); }
function provSetPeriodTipo(tipo) { provPeriodTipo = tipo; provPeriod = null; renderDashboardProvincial(); }

/* ── Scorecard period state ─────────────────────── */
let scPeriod     = null;
let scPeriodTipo = 'semanal';

function scActivePeriod()    { return scPeriod || (scPeriodTipo === 'mensal' ? currentMonthRef() : currentWeekRef()); }
function scIsCurrentPeriod() { return !scPeriod || scPeriod === (scPeriodTipo === 'mensal' ? currentMonthRef() : currentWeekRef()); }
function scPeriodShift(d)    { const p = scActivePeriod(); scPeriod = scPeriodTipo === 'semanal' ? shiftWeek(p,d) : shiftMonth(p,d); renderScorecard(); }
function scPeriodReset()     { scPeriod = null; renderScorecard(); }
function scSetPeriodTipo(t)  { scPeriodTipo = t; scPeriod = null; renderScorecard(); }

/* ── Relatorio period state ─────────────────────── */
let relPeriodTipo = 'semanal';
function relSetPeriodTipo(t) { relPeriodTipo = t; renderRelatorio(); }

/* ── Province filter helper ─────────────────────── */
function setProvincialFilter(val) {
  provincialFilter = val;
  renderDashboardProvincial();
}

/* ── Role helpers ───────────────────────────────── */
function _isNacional() { return currentRole === 'nacional'; }

/* ────────────────────────────────────────────────
   DASHBOARD PROVINCIAL
──────────────────────────────────────────────── */
function renderDashboardProvincial() {
  const content     = document.getElementById('content');
  const allC        = store.get('conselheiros') || [];
  const allR        = store.get('resultados')   || [];
  const allS        = store.get('stock')        || [];
  const period      = provActivePeriod();
  const isCurrent   = provIsCurrentPeriod();
  const provinces   = CONFIG.PROVINCES;

  // Filtered set
  const filteredC = provincialFilter === 'Ambas' ? allC
    : allC.filter(c => c.provincia === provincialFilter);
  const cIds = new Set(filteredC.map(c => c.id));
  const recs = allR.filter(r => cIds.has(r.conselheiro_id) && r.periodo_ref === period);

  const scored = recs.map(r => {
    const s  = allS.find(x => x.conselheiro_id === r.conselheiro_id && x.periodo_ref === r.periodo_ref) || {};
    const c  = filteredC.find(x => x.id === r.conselheiro_id) || {};
    return { r, s, c, sc: computeReliability(r, s) };
  });

  const totTestados = recs.reduce((s, r) => s + r.total_testados, 0);
  const totPos      = recs.reduce((s, r) => s + r.positivos_confirmados, 0);
  const yieldGlobal = totTestados > 0 ? (totPos / totTestados * 100).toFixed(1) + '%' : '—';
  const redCount    = scored.filter(x => x.sc.score_global === 'RED').length;
  const greenCount  = scored.filter(x => x.sc.score_global === 'GREEN').length;
  const yellowCount = scored.filter(x => x.sc.score_global === 'YELLOW').length;

  // Per-province summary for "Ambas" view
  const provSummary = provinces.map(prov => {
    const pC   = allC.filter(c => c.provincia === prov);
    const pIds = new Set(pC.map(c => c.id));
    const pR   = allR.filter(r => pIds.has(r.conselheiro_id) && r.periodo_ref === period);
    const pT   = pR.reduce((s,r) => s+r.total_testados, 0);
    const pP   = pR.reduce((s,r) => s+r.positivos_confirmados, 0);
    const pSc  = pR.map(r => {
      const s = allS.find(x => x.conselheiro_id === r.conselheiro_id && x.periodo_ref === r.periodo_ref) || {};
      return computeReliability(r, s).score_global;
    });
    return { prov, total: pC.length, withData: pR.length, testados: pT, pos: pP,
      yield: pT > 0 ? (pP/pT*100).toFixed(1)+'%' : '—',
      red: pSc.filter(s=>s==='RED').length, green: pSc.filter(s=>s==='GREEN').length };
  });

  // Nacional role always defaults to Ambas on first render
  if (_isNacional() && provincialFilter !== 'Manica' && provincialFilter !== 'Zambézia') {
    provincialFilter = 'Ambas';
  }

  const dashTitle = _isNacional() ? 'Dashboard Nacional' : 'Dashboard Provincial';
  const dashSub   = _isNacional()
    ? 'Visão nacional agregada — Manica e Zambézia (RISE PEPFAR/USAID)'
    : 'Visão agregada de Manica e Zambézia';

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h2>${dashTitle}</h2>
        <p>${dashSub}</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${_isNacional() ? `
        <div style="padding:6px 12px;background:rgba(27,58,107,.07);border:1px solid rgba(27,58,107,.15);
                    border-radius:8px;font-size:12px;color:var(--rise-navy)">
          🌍 <strong>Acesso Nacional</strong> · Leitura
        </div>` : ''}
        <button onclick="pullFromServer()"
          style="display:flex;align-items:center;gap:6px;padding:7px 14px;border:1px solid #CBD5E0;
                 border-radius:8px;background:#fff;font-size:12px;font-weight:600;cursor:pointer;
                 color:var(--rise-navy);font-family:inherit"
          title="Carregar dados actualizados do servidor">
          📥 Actualizar
        </button>
        <button onclick="openSyncDrawer()"
          style="display:flex;align-items:center;gap:6px;padding:7px 14px;border:1px solid #CBD5E0;
                 border-radius:8px;background:#fff;font-size:12px;font-weight:600;cursor:pointer;
                 color:var(--rise-muted);font-family:inherit"
          title="Configurações de sincronização">
          ⚙️
        </button>
      </div>
    </div>

    <!-- Province + Period filters -->
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:20px">
      <div class="toggle-group">
        ${(_isNacional() ? ['Ambas', ...provinces] : ['Ambas', ...provinces]).map(p =>
          `<button class="${provincialFilter===p?'active':''}" onclick="setProvincialFilter('${p}')">${p}</button>`).join('')}
      </div>
      <div class="toggle-group">
        <button class="${provPeriodTipo==='semanal'?'active':''}" onclick="provSetPeriodTipo('semanal')">Semanal</button>
        <button class="${provPeriodTipo==='mensal'?'active':''}"  onclick="provSetPeriodTipo('mensal')">Mensal</button>
      </div>
      <div style="display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:5px 10px">
        <button class="btn btn-secondary btn-sm" onclick="provPeriodShift(-1)" style="padding:3px 10px">←</button>
        <span style="font-weight:600;font-size:13px;color:var(--rise-navy);min-width:150px;text-align:center">${periodLabel(period)}</span>
        <button class="btn btn-secondary btn-sm" onclick="provPeriodShift(+1)" ${isCurrent?'disabled':''} style="padding:3px 10px">→</button>
      </div>
      ${!isCurrent ? `<button class="btn btn-secondary btn-sm" onclick="provPeriodReset()">↺ Actual</button>` : ''}
    </div>

    <!-- KPI cards -->
    <div class="kpi-grid" style="margin-bottom:20px">
      <div class="kpi-card">
        <div class="kpi-label">Conselheiros</div>
        <div class="kpi-value">${filteredC.filter(c=>c.ativo).length}</div>
        <div class="kpi-sub">${recs.length} com dados</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Testados</div>
        <div class="kpi-value">${totTestados || '—'}</div>
        <div class="kpi-sub">${periodLabel(period)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Yield Global</div>
        <div class="kpi-value" style="color:${totTestados>0&&(totPos/totTestados)>=0.05?'var(--status-green)':'var(--status-red)'}">${yieldGlobal}</div>
        <div class="kpi-sub">Meta PEPFAR ≥ 5%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">🟢 GREEN</div>
        <div class="kpi-value" style="color:var(--status-green)">${greenCount}</div>
        <div class="kpi-sub">Conselheiros sem alertas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">🟡 YELLOW</div>
        <div class="kpi-value" style="color:var(--status-yellow)">${yellowCount}</div>
        <div class="kpi-sub">Requerem atenção</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">🔴 RED</div>
        <div class="kpi-value" style="color:var(--status-red)">${redCount}</div>
        <div class="kpi-sub">Alertas críticos</div>
      </div>
    </div>

    ${(provincialFilter === 'Ambas' || _isNacional()) ? `
    <!-- Province comparison table — always shown for nacional role -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-title" style="margin-bottom:12px">📊 Comparação por Província${_isNacional() ? ' — Visão Nacional' : ''}</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Província</th><th>Conselheiros</th><th>Com Dados</th><th>Testados</th><th>Positivos</th><th>Yield%</th><th>🔴 RED</th><th>🟢 GREEN</th></tr></thead>
          <tbody>
            ${provSummary.map(p => `<tr>
              <td style="font-weight:700;color:var(--rise-navy)">${p.prov}</td>
              <td>${p.total}</td>
              <td>${p.withData}</td>
              <td>${p.testados || '—'}</td>
              <td>${p.pos || '—'}</td>
              <td style="font-weight:600;color:${p.yield!=='—'&&parseFloat(p.yield)>=5?'var(--status-green)':'var(--status-red)'}">${p.yield}</td>
              <td style="color:var(--status-red);font-weight:600">${p.red}</td>
              <td style="color:var(--status-green);font-weight:600">${p.green}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <!-- Counselor table -->
    <div class="card">
      <div class="card-title" style="margin-bottom:12px">Conselheiros — ${periodLabel(period)}</div>
      ${scored.length === 0
        ? `<div style="text-align:center;padding:24px;color:var(--rise-muted);font-size:13px">Sem dados para o período seleccionado.</div>`
        : `<div class="table-wrap">
          <table>
            <thead>
              <tr><th>Conselheiro</th><th>Província</th><th>Distrito</th><th>Testados</th><th>Positivos</th><th>Yield%</th><th>Score</th></tr>
            </thead>
            <tbody>
              ${scored.sort((a,b)=>{const o={RED:0,YELLOW:1,GREEN:2};return (o[a.sc.score_global]||3)-(o[b.sc.score_global]||3);}).map(({r,sc,c}) => {
                const yp = sc.indicators.yieldPct;
                return `<tr>
                  <td style="font-weight:600;font-size:12px">${escHtml(c.nome||'—')}</td>
                  <td style="font-size:12px;color:var(--rise-muted)">${escHtml(c.provincia||'—')}</td>
                  <td style="font-size:12px;color:var(--rise-muted)">${escHtml(c.distrito||'—')}</td>
                  <td>${r.total_testados}</td>
                  <td>${r.positivos_confirmados}</td>
                  <td style="font-weight:600;color:${yp!==null&&yp>=5?'var(--status-green)':'var(--status-red)'}">${yp!==null?yp+'%':'—'}</td>
                  <td><span class="badge ${scoreBadge(sc.score_global)}">${sc.score_global}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
    </div>
  `;
}

/* ────────────────────────────────────────────────
   SCORECARD
──────────────────────────────────────────────── */
function renderScorecard() {
  const content = document.getElementById('content');
  const period  = scActivePeriod();
  const allC    = store.get('conselheiros') || [];
  const allR    = store.get('resultados')   || [];
  const allS    = store.get('stock')        || [];
  const cIds    = new Set(allC.map(c => c.id));
  const recs    = allR.filter(r => cIds.has(r.conselheiro_id) && r.periodo_ref === period);

  const scored = recs.map(r => {
    const s  = allS.find(x => x.conselheiro_id === r.conselheiro_id && x.periodo_ref === r.periodo_ref) || {};
    const c  = allC.find(x => x.id === r.conselheiro_id) || {};
    return { r, s, c, sc: computeReliability(r, s) };
  }).sort((a,b) => {
    const o = {RED:0,YELLOW:1,GREEN:2};
    return (o[a.sc.score_global]||3)-(o[b.sc.score_global]||3);
  });

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h2>${_isNacional() ? 'Scorecard Nacional' : 'Scorecard Conselheiros'}</h2>
        <p>${_isNacional() ? 'Classificação nacional de fiabilidade — todas as províncias' : 'Classificação de fiabilidade por período'}</p>
      </div>
      <button class="btn btn-secondary" onclick="exportScorecardCSV()">⬇️ Exportar CSV</button>
    </div>

    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:20px">
      <div class="toggle-group">
        <button class="${scPeriodTipo==='semanal'?'active':''}" onclick="scSetPeriodTipo('semanal')">Semanal</button>
        <button class="${scPeriodTipo==='mensal'?'active':''}"  onclick="scSetPeriodTipo('mensal')">Mensal</button>
      </div>
      <div style="display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:5px 10px">
        <button class="btn btn-secondary btn-sm" onclick="scPeriodShift(-1)" style="padding:3px 10px">←</button>
        <span style="font-weight:600;font-size:13px;color:var(--rise-navy);min-width:150px;text-align:center">${periodLabel(period)}</span>
        <button class="btn btn-secondary btn-sm" onclick="scPeriodShift(+1)" ${scIsCurrentPeriod()?'disabled':''} style="padding:3px 10px">→</button>
      </div>
      ${!scIsCurrentPeriod() ? `<button class="btn btn-secondary btn-sm" onclick="scPeriodReset()">↺ Actual</button>` : ''}
      <span style="font-size:12px;color:var(--rise-muted)">${scored.length} conselheiro(s) com dados</span>
    </div>

    ${scored.length === 0
      ? emptyStateHTML('📊', 'Sem dados', `Sem registos para ${periodLabel(period)}.`)
      : `<div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Conselheiro</th><th>Província</th><th>Distrito</th><th>US</th>
                <th>Testados</th><th>Positivos</th><th>Yield%</th><th>Aderência%</th>
                <th>Consistência</th><th>Stock</th><th>Score Global</th>
              </tr>
            </thead>
            <tbody>
              ${scored.map(({r, sc, c}) => {
                const yp = sc.indicators.yieldPct;
                const ap = sc.indicators.adherPct;
                return `<tr>
                  <td style="font-weight:600;font-size:12px">${escHtml(c.nome||'—')}</td>
                  <td style="font-size:12px">${escHtml(c.provincia||'—')}</td>
                  <td style="font-size:12px;color:var(--rise-muted)">${escHtml(c.distrito||'—')}</td>
                  <td style="font-size:11px;color:var(--rise-muted)">${escHtml(c.unidade_sanitaria||'—')}</td>
                  <td>${r.total_testados}</td>
                  <td>${r.positivos_confirmados}</td>
                  <td style="font-weight:600;color:${yp!==null&&yp>=5?'var(--status-green)':'var(--status-red)'}">${yp!==null?yp+'%':'—'}</td>
                  <td style="color:${ap===null||ap>=95?'var(--status-green)':'var(--status-yellow)'}">${ap!==null?ap+'%':'N/A'}</td>
                  <td><span class="badge ${scoreBadge(sc.score_consistencia)}" style="font-size:10px">${sc.score_consistencia}</span></td>
                  <td><span class="badge ${scoreBadge(sc.score_stock)}" style="font-size:10px">${sc.score_stock}</span></td>
                  <td><span class="badge ${scoreBadge(sc.score_global)}">${sc.score_global}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`}
  `;
}

function exportScorecardCSV() {
  const period = scActivePeriod();
  const allC   = store.get('conselheiros') || [];
  const allR   = store.get('resultados')   || [];
  const allS   = store.get('stock')        || [];
  const cIds   = new Set(allC.map(c => c.id));
  const recs   = allR.filter(r => cIds.has(r.conselheiro_id) && r.periodo_ref === period);

  const headers = ['nome','provincia','distrito','unidade_sanitaria','periodo_ref',
    'total_testados','positivos_confirmados','yield_pct','aderencia_pct','indet_pct',
    'score_consistencia','score_aderencia','score_stock','score_yield','score_global',
    'flags'];

  const rows = recs.map(r => {
    const c  = allC.find(x => x.id === r.conselheiro_id) || {};
    const s  = allS.find(x => x.conselheiro_id === r.conselheiro_id && x.periodo_ref === r.periodo_ref) || {};
    const sc = computeReliability(r, s);
    return headers.map(h => {
      const v = {
        nome: c.nome, provincia: c.provincia, distrito: c.distrito,
        unidade_sanitaria: c.unidade_sanitaria,
        periodo_ref: r.periodo_ref,
        yield_pct:          sc.indicators.yieldPct,
        aderencia_pct:      sc.indicators.adherPct,
        indet_pct:          sc.indicators.indetPct,
        score_consistencia: sc.score_consistencia,
        score_aderencia:    sc.score_aderencia,
        score_stock:        sc.score_stock,
        score_yield:        sc.score_yield,
        score_global:       sc.score_global,
        flags: [...sc.consistFlags, ...sc.stockFlags].map(f=>f.id).join(';'),
      }[h] ?? r[h] ?? '';
      return JSON.stringify(v);
    }).join(',');
  });

  downloadFile([headers.join(','), ...rows].join('\n'),
    `RISE_ICT_Scorecard_${period}.csv`, 'text/csv');
  showToast('Scorecard exportado.', 'success');
}

/* ────────────────────────────────────────────────
   RELATÓRIO POR PERÍODO
──────────────────────────────────────────────── */
function renderRelatorio() {
  const content    = document.getElementById('content');
  const allC       = store.get('conselheiros') || [];
  const allR       = store.get('resultados')   || [];
  const allS       = store.get('stock')        || [];

  // Build last 8 periods
  const trendPeriods = buildTrendPeriods(8, relPeriodTipo);

  const periodData = trendPeriods.map(period => {
    const cIds = new Set(allC.map(c => c.id));
    const recs = allR.filter(r => cIds.has(r.conselheiro_id) && r.periodo_ref === period);
    const scored = recs.map(r => {
      const s = allS.find(x => x.conselheiro_id === r.conselheiro_id && x.periodo_ref === r.periodo_ref) || {};
      return computeReliability(r, s);
    });
    const tot = recs.reduce((s,r) => s+r.total_testados, 0);
    const pos = recs.reduce((s,r) => s+r.positivos_confirmados, 0);
    return {
      period,
      n: recs.length,
      testados: tot,
      pos,
      yield: tot > 0 ? (pos/tot*100).toFixed(1) : null,
      red:   scored.filter(s => s.score_global === 'RED').length,
      yellow:scored.filter(s => s.score_global === 'YELLOW').length,
      green: scored.filter(s => s.score_global === 'GREEN').length,
    };
  });

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h2>${_isNacional() ? 'Relatório Nacional por Período' : 'Relatório por Período'}</h2>
        <p>${_isNacional() ? 'Tendência nacional multi-período — Manica &amp; Zambézia' : 'Tendência multi-período de qualidade e cobertura'}</p>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:20px">
      <div class="toggle-group">
        <button class="${relPeriodTipo==='semanal'?'active':''}" onclick="relSetPeriodTipo('semanal')">Semanal</button>
        <button class="${relPeriodTipo==='mensal'?'active':''}"  onclick="relSetPeriodTipo('mensal')">Mensal</button>
      </div>
    </div>

    <!-- Trend chart -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-title" style="margin-bottom:12px">📈 Yield% — Últimos 8 Períodos</div>
      <canvas id="prov-chart" style="max-height:220px"></canvas>
    </div>

    <!-- Trend table -->
    <div class="card">
      <div class="card-title" style="margin-bottom:12px">Dados por Período</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Período</th><th>Conselheiros</th><th>Testados</th><th>Positivos</th><th>Yield%</th><th>🟢 GREEN</th><th>🟡 YELLOW</th><th>🔴 RED</th></tr>
          </thead>
          <tbody>
            ${periodData.map(d => `<tr>
              <td style="font-weight:600;font-size:12px">${periodLabel(d.period)}</td>
              <td>${d.n}</td>
              <td>${d.testados || '—'}</td>
              <td>${d.pos || '—'}</td>
              <td style="font-weight:600;color:${d.yield!==null&&parseFloat(d.yield)>=5?'var(--status-green)':'var(--status-red)'}">${d.yield !== null ? d.yield+'%' : '—'}</td>
              <td style="color:var(--status-green);font-weight:600">${d.green}</td>
              <td style="color:var(--status-yellow);font-weight:600">${d.yellow}</td>
              <td style="color:var(--status-red);font-weight:600">${d.red}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Draw chart
  if (typeof Chart !== 'undefined') {
    const ctx = document.getElementById('prov-chart');
    if (!ctx) return;
    const labels  = periodData.map(d => d.period).reverse();
    const yieldVs = periodData.map(d => d.yield !== null ? parseFloat(d.yield) : null).reverse();
    const redVs   = periodData.map(d => d.red).reverse();

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { type: 'line', label: 'Yield%', data: yieldVs, borderColor: '#00A693', backgroundColor: 'transparent',
            tension: 0.3, yAxisID: 'yYield', pointRadius: 4, spanGaps: true },
          { type: 'bar',  label: 'RED',    data: redVs,   backgroundColor: 'rgba(239,68,68,.3)',
            borderColor: '#EF4444', borderWidth: 1, yAxisID: 'yCount' },
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true, position: 'top' } },
        scales: {
          yYield: { type: 'linear', position: 'left', beginAtZero: true, ticks: { callback: v => v + '%' }, grid: { color: '#F1F5F9' } },
          yCount: { type: 'linear', position: 'right', beginAtZero: true, grid: { display: false }, ticks: { stepSize: 1 } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}
