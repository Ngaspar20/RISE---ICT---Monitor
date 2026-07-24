/* ══════════════════════════════════════════════════
   FICHA DE FIABILIDADE — per-counselor reliability profile
══════════════════════════════════════════════════ */

/* ── Open ficha for specific counselor ─────────── */
function openFicha(conselheiroId) {
  fichaConselheiro = conselheiroId;
  currentScreen    = 'ficha';
  document.getElementById('topbar-title').textContent = 'Ficha de Fiabilidade';
  document.querySelectorAll('#sidebar-nav a').forEach(a =>
    a.classList.toggle('active', a.dataset.screen === 'ficha'));
  document.querySelectorAll('#mobile-tabs-inner a').forEach(a =>
    a.classList.toggle('active', a.dataset.screen === 'ficha'));
  renderFicha();
}

/* ── Render ficha ───────────────────────────────── */
function renderFicha() {
  const content = document.getElementById('content');
  const conselheiros = getConselheiros();

  if (!fichaConselheiro && conselheiros.length > 0) {
    fichaConselheiro = conselheiros[0].id;
  }

  if (!fichaConselheiro) {
    content.innerHTML = emptyStateHTML('📈', 'Sem conselheiros',
      'Adicione conselheiros para visualizar a ficha de fiabilidade.',
      `<div class="mt-3"><button class="btn btn-primary" onclick="navigate('conselheiros')">+ Adicionar Conselheiros</button></div>`);
    return;
  }

  const c = conselheiros.find(x => x.id === fichaConselheiro);
  if (!c) {
    content.innerHTML = emptyStateHTML('🔍', 'Conselheiro não encontrado',
      'O conselheiro seleccionado não existe ou foi eliminado.');
    return;
  }

  const allR = store.get('resultados') || [];
  const allS = store.get('stock')      || [];
  const period = activePeriod();

  const cRecords = allR.filter(r => r.conselheiro_id === c.id).sort((a, b) => b.periodo_ref.localeCompare(a.periodo_ref));
  const latest   = cRecords.find(r => r.periodo_ref === period) || cRecords[0] || null;
  const latestS  = latest && allS.find(s => s.conselheiro_id === c.id && s.periodo_ref === latest.periodo_ref) || {};
  const score    = latest ? computeReliability(latest, latestS) : null;

  // Build trend data (last 8 periods)
  const trendPeriods = buildTrendPeriods(8, dashboardPeriodTipo);
  const trendData    = trendPeriods.map(p => {
    const r = cRecords.find(x => x.periodo_ref === p);
    const s = r && allS.find(x => x.conselheiro_id === c.id && x.periodo_ref === p);
    return { period: p, r, score: r ? computeReliability(r, s || {}) : null };
  });

  const globalBadgeClass = score ? scoreBadge(score.score_global) : 'badge-gray';
  const globalScore      = score?.score_global || 'SEM DADOS';

  content.innerHTML = `
    <!-- Counselor selector row -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <select onchange="openFicha(this.value)"
        style="flex:1;max-width:340px;padding:8px 12px;border:1px solid #CBD5E0;border-radius:7px;font-size:13px;font-family:inherit;color:var(--rise-navy);font-weight:600">
        ${conselheiros.map(x => `<option value="${x.id}" ${x.id===fichaConselheiro?'selected':''}>${escHtml(x.nome)} — ${escHtml(x.unidade_sanitaria||x.distrito||'')}</option>`).join('')}
      </select>
      <button class="btn btn-primary btn-sm" onclick="openRegistarFor('${c.id}')">✏️ Registar</button>
    </div>

    <!-- Header card -->
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="width:54px;height:54px;border-radius:50%;background:var(--rise-navy);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">👤</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:18px;font-weight:800;color:var(--rise-navy)">${escHtml(c.nome)}</div>
          <div style="font-size:13px;color:var(--rise-muted)">${escHtml(c.distrito || '')} · ${escHtml(c.unidade_sanitaria || '')} · ${escHtml(c.provincia || '')}</div>
          ${c.telefone ? `<div style="font-size:12px;color:var(--rise-muted)">📞 ${escHtml(c.telefone)}</div>` : ''}
        </div>
        <div style="text-align:center">
          <div style="font-size:11px;color:var(--rise-muted);font-weight:600;text-transform:uppercase;margin-bottom:4px">Score Global</div>
          <span class="badge ${globalBadgeClass}" style="font-size:15px;padding:6px 14px">${globalScore}</span>
          ${latest ? `<div style="font-size:11px;color:var(--rise-muted);margin-top:4px">${periodLabel(latest.periodo_ref)}</div>` : ''}
        </div>
      </div>
    </div>

    ${!latest ? `
    <div class="card">
      ${emptyStateHTML('📊', 'Sem registos ainda', 'Não existem dados para este conselheiro.',
        `<div class="mt-3"><button class="btn btn-primary" onclick="openRegistarFor('${c.id}')">✏️ Registar Dados</button></div>`)}
    </div>` : `

    <!-- Dimension score pills -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
      ${dimCard('Consistência',  score.score_consistencia, 'C01–C07')}
      ${dimCard('Aderência',     score.score_aderencia,    '≥95%')}
      ${dimCard('Stock',         score.score_stock,        'S01–S08')}
      ${dimCard('Yield',         score.score_yield,        '≥5%')}
    </div>

    <!-- KPI mini grid -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:16px">
      ${kpiMini('Total Testados',   latest.total_testados,          null)}
      ${kpiMini('Positivos',         latest.positivos_confirmados,   null)}
      ${kpiMini('Yield%',            score.indicators.yieldPct !== null ? score.indicators.yieldPct+'%' : '—',
        score.score_yield === 'GREEN')}
      ${kpiMini('Aderência%',        score.indicators.adherPct !== null ? score.indicators.adherPct+'%' : 'N/A',
        score.score_aderencia === 'GREEN')}
      ${kpiMini('Indeter.%',         score.indicators.indetPct !== null ? score.indicators.indetPct+'%' : '—',
        score.score_stock !== 'RED')}
      ${kpiMini('Var. Determine',    score.indicators.detVarPct !== null ? (score.indicators.detVarPct>0?'+':'')+score.indicators.detVarPct+'%' : '—',
        score.indicators.detVarPct === null || Math.abs(score.indicators.detVarPct) <= 5)}
    </div>

    <!-- Flags breakdown -->
    ${score.consistFlags.length + score.stockFlags.length > 0 ? `
    <div class="card" style="margin-bottom:16px;border-left:3px solid ${score.score_global==='RED'?'var(--status-red)':'var(--status-yellow)'}">
      <div class="card-title" style="margin-bottom:10px">🔍 Flags Detectadas — ${periodLabel(latest.periodo_ref)}</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Código</th><th>Descrição</th><th>Dimensão</th><th>Severidade</th></tr></thead>
          <tbody>
            ${[...score.consistFlags.map(f=>({...f,dim:'Consistência'})), ...score.stockFlags.map(f=>({...f,dim:'Stock'}))].map(f=>`
            <tr>
              <td><code style="font-size:11px;background:#F1F5F9;padding:2px 6px;border-radius:4px">${f.id}</code></td>
              <td style="font-size:12px">${f.label}</td>
              <td style="font-size:12px;color:var(--rise-muted)">${f.dim}</td>
              <td><span class="badge ${f.severity==='HIGH'?'badge-red':f.severity==='MEDIUM'?'badge-yellow':'badge-gray'}" style="font-size:10px">${f.severity}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <!-- Trend table -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-title" style="margin-bottom:12px">📈 Evolução Temporal</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Período</th><th>Testados</th><th>Positivos</th><th>Yield%</th>
              <th>Aderência%</th><th>Var.Det.%</th><th>Score</th>
            </tr>
          </thead>
          <tbody>
            ${trendData.map(({ period: p, r: tr, score: sc }) => tr ? `
            <tr>
              <td style="font-weight:600;font-size:12px">${periodLabel(p)}</td>
              <td>${tr.total_testados}</td>
              <td>${tr.positivos_confirmados}</td>
              <td style="color:${sc.indicators.yieldPct!==null&&sc.indicators.yieldPct>=5?'var(--status-green)':'var(--status-red)'};font-weight:600">
                ${sc.indicators.yieldPct !== null ? sc.indicators.yieldPct+'%' : '—'}
              </td>
              <td style="color:${sc.indicators.adherPct===null||sc.indicators.adherPct>=95?'var(--status-green)':'var(--status-yellow)'}">
                ${sc.indicators.adherPct !== null ? sc.indicators.adherPct+'%' : 'N/A'}
              </td>
              <td style="color:${sc.indicators.detVarPct!==null&&Math.abs(sc.indicators.detVarPct)>5?'var(--status-red)':'var(--status-green)'}">
                ${sc.indicators.detVarPct !== null ? (sc.indicators.detVarPct>0?'+':'')+sc.indicators.detVarPct+'%' : '—'}
              </td>
              <td><span class="badge ${scoreBadge(sc.score_global)}" style="font-size:11px">${sc.score_global}</span></td>
            </tr>` : `
            <tr style="opacity:.45">
              <td style="font-size:12px">${periodLabel(p)}</td>
              <td colspan="6" style="color:var(--rise-muted);font-size:12px">Sem dados</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Chart placeholder (Chart.js injected) -->
    <div class="card">
      <div class="card-title" style="margin-bottom:12px">📊 Gráfico de Tendência — Yield%</div>
      <canvas id="ficha-chart" style="max-height:200px"></canvas>
    </div>
    `}
  `;

  // Draw chart if Chart.js is available and we have data
  if (latest && typeof Chart !== 'undefined') {
    const ctx = document.getElementById('ficha-chart');
    if (!ctx) return;
    const labels  = trendData.map(d => d.period).reverse();
    const yieldVs = trendData.map(d => d.score?.indicators.yieldPct ?? null).reverse();
    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Yield%',
          data: yieldVs,
          borderColor: '#00A693',
          backgroundColor: 'rgba(0,166,147,.1)',
          tension: 0.3,
          fill: true,
          spanGaps: true,
          pointRadius: 4,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: Math.max(20, ...yieldVs.filter(v=>v!==null)) + 5,
            grid: { color: '#F1F5F9' },
            ticks: { callback: v => v + '%' } },
          x: { grid: { display: false } }
        },
        annotation: { annotations: [{
          type: 'line', yMin: 5, yMax: 5,
          borderColor: '#F59E0B', borderDash: [5, 5], borderWidth: 1.5,
          label: { display: true, content: 'Meta 5%', position: 'end', color: '#F59E0B', font: { size: 10 } }
        }]}
      }
    });
  }
}

/* ── Dimension card helper ──────────────────────── */
function dimCard(label, score, subtitle) {
  const cls  = score === 'GREEN' ? '#dcfce7' : score === 'RED' ? '#fee2e2' : '#fef9c3';
  const txt  = score === 'GREEN' ? '#166534' : score === 'RED' ? '#991B1B' : '#92400E';
  const icon = score === 'GREEN' ? '🟢' : score === 'RED' ? '🔴' : '🟡';
  return `<div style="background:${cls};border-radius:10px;padding:12px;text-align:center">
    <div style="font-size:18px;margin-bottom:4px">${icon}</div>
    <div style="font-size:11px;font-weight:700;color:${txt};text-transform:uppercase">${label}</div>
    <div style="font-size:10px;color:${txt};opacity:.7;margin-top:2px">${subtitle}</div>
  </div>`;
}

/* ── KPI mini card helper ───────────────────────── */
function kpiMini(label, value, isOk) {
  const color = isOk === null ? 'var(--rise-navy)'
    : isOk ? 'var(--status-green)' : 'var(--status-red)';
  return `<div class="kpi-card" style="text-align:center;padding:12px">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value" style="color:${color};font-size:20px">${value ?? '—'}</div>
  </div>`;
}
