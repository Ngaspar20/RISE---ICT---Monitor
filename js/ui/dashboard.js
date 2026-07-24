/* ══════════════════════════════════════════════════
   DASHBOARD — District & Provincial entry point
══════════════════════════════════════════════════ */

function renderDashboard() {
  if (currentRole === 'provincial' || currentRole === 'nacional') { renderDashboardProvincial(); return; }

  const conselheiros  = getConselheiros();
  const allResultados = store.get('resultados') || [];
  const allStock      = store.get('stock')      || [];
  const queue         = store.get('sync_queue') || [];

  const period          = activePeriod();
  const isCurrentPeriod = isActivePeriodCurrent();
  const cIds            = new Set(conselheiros.map(c => c.id));
  const periodoAtual    = allResultados.filter(r => cIds.has(r.conselheiro_id) && r.periodo_ref === period);

  const scored = periodoAtual.map(r => {
    const s = allStock.find(x => x.conselheiro_id === r.conselheiro_id && x.periodo_ref === r.periodo_ref) || {};
    return { r, score: computeReliability(r, s) };
  });

  const ativos       = conselheiros.filter(c => c.ativo).length;
  const totalTestados= periodoAtual.reduce((s, r) => s + r.total_testados, 0);
  const totalPos     = periodoAtual.reduce((s, r) => s + r.positivos_confirmados, 0);
  const det          = periodoAtual.reduce((s, r) => s + (r.determine_consumido_reportado || 0), 0);
  const uni          = periodoAtual.reduce((s, r) => s + (r.unigold_consumido_reportado   || 0), 0);
  const yieldPct     = totalTestados > 0 ? (totalPos / totalTestados * 100).toFixed(1) + '%' : '—';
  const redCount     = scored.filter(x => x.score.score_global === 'RED').length;
  const yellowCount  = scored.filter(x => x.score.score_global === 'YELLOW').length;

  const content = document.getElementById('content');
  content.innerHTML = `
    ${redCount > 0 ? `
    <div class="alert alert-red" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <span>⚠️ <strong>${redCount} conselheiro(s) com alertas críticos</strong> — ${periodLabel(period)}</span>
      <a href="#" onclick="navigate('historico')" style="color:inherit;font-size:12px">Ver histórico →</a>
    </div>` : ''}

    <div class="page-header">
      <div>
        <h2>Dashboard Distrital — ${currentProvincia}</h2>
        <p>${new Date().toLocaleDateString('pt', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}</p>
      </div>
      <button class="btn btn-primary" onclick="navigate('registar')">✏️ Novo Registo</button>
    </div>

    <!-- Period navigation -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap">
      <div class="toggle-group">
        <button class="${dashboardPeriodTipo==='semanal'?'active':''}" onclick="dashSetPeriodTipo('semanal')">Semanal</button>
        <button class="${dashboardPeriodTipo==='mensal'?'active':''}"  onclick="dashSetPeriodTipo('mensal')">Mensal</button>
      </div>
      <div style="display:flex;align-items:center;gap:6px;background:var(--rise-white);border:1px solid #E2E8F0;border-radius:8px;padding:5px 10px">
        <button class="btn btn-secondary btn-sm" onclick="dashPeriodShift(-1)" style="padding:3px 10px">←</button>
        <span style="font-weight:600;font-size:13px;color:var(--rise-navy);min-width:150px;text-align:center">${periodLabel(period)}</span>
        <button class="btn btn-secondary btn-sm" onclick="dashPeriodShift(+1)" ${isCurrentPeriod?'disabled':''} style="padding:3px 10px">→</button>
      </div>
      ${!isCurrentPeriod ? `<button class="btn btn-secondary btn-sm" onclick="dashPeriodReset()">↺ Actual</button>` : ''}
      <span style="font-size:12px;color:var(--rise-muted);margin-left:4px">${periodoAtual.length} registo(s)</span>
    </div>

    <!-- KPI cards -->
    <div class="kpi-grid" style="margin-bottom:24px">
      <div class="kpi-card">
        <div class="kpi-label">Conselheiros Activos</div>
        <div class="kpi-value">${ativos}</div>
        <div class="kpi-sub">${periodoAtual.length} com dados este período</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Testados</div>
        <div class="kpi-value">${totalTestados || '—'}</div>
        <div class="kpi-sub">${periodLabel(period)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Taxa Positividade</div>
        <div class="kpi-value" style="color:${totalTestados>0&&(totalPos/totalTestados)>=0.05?'var(--status-green)':'var(--status-red)'}">${yieldPct}</div>
        <div class="kpi-sub">Meta PEPFAR ≥ 5%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Determine Consumidos</div>
        <div class="kpi-value">${det || '—'}</div>
        <div class="kpi-sub">Kits reportados</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Unigold Consumidos</div>
        <div class="kpi-value">${uni || '—'}</div>
        <div class="kpi-sub">Kits reportados</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Pendentes Sync</div>
        <div class="kpi-value" style="color:${queue.length>0?'var(--status-yellow)':'var(--status-green)'}">${queue.length}</div>
        <div class="kpi-sub">${queue.length > 0 ? 'A aguardar ligação' : 'Tudo sincronizado'}</div>
      </div>
    </div>

    ${(() => {
      const allFlags = scored.flatMap(({ r, score }) => {
        const c = conselheiros.find(x => x.id === r.conselheiro_id) || {};
        return [...score.consistFlags, ...score.stockFlags].map(f => ({ ...f, conselheiro: c.nome || '—', us: c.unidade_sanitaria || '' }));
      });
      const redFlags  = allFlags.filter(f => f.severity === 'HIGH');
      const warnFlags = allFlags.filter(f => f.severity === 'MEDIUM');
      if (allFlags.length === 0) return '';
      return `
      <div class="card" style="margin-bottom:20px;border-left:3px solid ${redFlags.length>0?'var(--status-red)':'var(--status-yellow)'}">
        <div class="collapsible-header" onclick="alertPanelOpen=!alertPanelOpen;document.getElementById('alert-body').classList.toggle('collapsed',!alertPanelOpen)">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:16px">${redFlags.length>0?'🔴':'🟡'}</span>
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--rise-navy)">Alertas Activos — ${periodLabel(period)}</div>
              <div style="font-size:11px;color:var(--rise-muted)">${redFlags.length} crítico(s) · ${warnFlags.length} aviso(s)</div>
            </div>
          </div>
          <span style="color:var(--rise-muted);font-size:18px">${alertPanelOpen?'▲':'▼'}</span>
        </div>
        <div class="collapsible-body ${alertPanelOpen?'':'collapsed'}" id="alert-body" style="max-height:400px;margin-top:12px">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Flag</th><th>Conselheiro</th><th>US</th><th>Descrição</th><th>Severidade</th></tr></thead>
              <tbody>
                ${allFlags.map(f=>`<tr>
                  <td><code style="font-size:11px;background:#F1F5F9;padding:2px 6px;border-radius:4px">${f.id}</code></td>
                  <td style="font-weight:600;font-size:12px">${escHtml(f.conselheiro)}</td>
                  <td style="font-size:11px;color:var(--rise-muted)">${escHtml(f.us)}</td>
                  <td style="font-size:12px">${f.label}</td>
                  <td><span class="badge ${f.severity==='HIGH'?'badge-red':f.severity==='MEDIUM'?'badge-yellow':'badge-gray'}" style="font-size:10px">${f.severity}</span></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
    })()}

    ${conselheiros.length === 0 ? `
    <div class="card">
      <div class="empty-state">
        <div class="icon">🚀</div>
        <h3>Comece por adicionar conselheiros</h3>
        <p>Registe os conselheiros leigos do seu distrito para poder introduzir resultados.</p>
        <div class="mt-3"><button class="btn btn-primary" onclick="navigate('conselheiros')">+ Adicionar Conselheiros</button></div>
      </div>
    </div>` : `
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="card-title">Conselheiros — ${periodLabel(period)}</div>
        <div style="display:flex;gap:8px;font-size:12px">
          ${redCount    > 0 ? `<span class="badge badge-red">🔴 ${redCount} RED</span>`       : ''}
          ${yellowCount > 0 ? `<span class="badge badge-yellow">🟡 ${yellowCount} YELLOW</span>` : ''}
          ${redCount+yellowCount === 0 && periodoAtual.length > 0 ? `<span class="badge badge-green">🟢 Tudo OK</span>` : ''}
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Conselheiro</th><th>US</th><th>Testados</th><th>Positivos</th>
              <th>Yield%</th><th>Aderência</th><th>Var. Det.</th><th>Score</th><th>Acções</th>
            </tr>
          </thead>
          <tbody>
            ${conselheiros.filter(c=>c.ativo).map(c => {
              const entry  = scored.find(x => x.r.conselheiro_id === c.id);
              const reg    = entry?.r;
              const sc     = entry?.score;
              const tested = reg?.total_testados ?? '—';
              const pos    = reg?.positivos_confirmados ?? '—';
              const yld    = reg && reg.total_testados > 0 ? (reg.positivos_confirmados/reg.total_testados*100).toFixed(1)+'%' : '—';
              const adher  = sc ? (sc.indicators.adherPct !== null ? sc.indicators.adherPct+'%' : 'N/A') : '—';
              const detVar = sc ? (sc.indicators.detVarPct !== null ? (sc.indicators.detVarPct>0?'+':'')+sc.indicators.detVarPct+'%' : '—') : '—';
              const detVarColor = sc && sc.indicators.detVarPct !== null
                ? (Math.abs(sc.indicators.detVarPct) > 15 ? 'var(--status-red)'
                   : Math.abs(sc.indicators.detVarPct) > 5  ? 'var(--status-yellow)'
                   : 'var(--status-green)') : 'var(--rise-muted)';
              const score = sc?.score_global || 'SEM DADOS';
              return `<tr>
                <td><a href="#" onclick="openFicha('${c.id}')" style="font-weight:600;color:var(--rise-navy);text-decoration:none">${escHtml(c.nome)}</a></td>
                <td style="font-size:12px;color:var(--rise-muted)">${escHtml(c.unidade_sanitaria)}</td>
                <td>${tested}</td>
                <td>${pos}</td>
                <td style="color:${yld!=='—'&&parseFloat(yld)>=5?'var(--status-green)':'var(--status-red)'};font-weight:${yld!=='—'?600:400}">${yld}</td>
                <td style="color:${adher!=='—'&&adher!=='N/A'&&parseFloat(adher)>=95?'var(--status-green)':'var(--status-yellow)'}">${adher}</td>
                <td style="color:${detVarColor};font-weight:600">${detVar}</td>
                <td><span class="badge ${scoreBadge(score)}">${score}</span></td>
                <td>
                  <div class="flex gap-2">
                    <button class="btn btn-secondary btn-sm" onclick="openFicha('${c.id}')">Ficha</button>
                    <button class="btn btn-primary btn-sm" onclick="openRegistarFor('${c.id}')">Registar</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`}
  `;
}

function dashPeriodShift(delta) {
  const period = activePeriod();
  dashboardPeriod = dashboardPeriodTipo === 'semanal' ? shiftWeek(period, delta) : shiftMonth(period, delta);
  renderDashboard();
}
function dashPeriodReset() { dashboardPeriod = null; renderDashboard(); }
function dashSetPeriodTipo(tipo) { dashboardPeriodTipo = tipo; dashboardPeriod = null; renderDashboard(); }
