/* ══════════════════════════════════════════════════
   HISTÓRICO — Browse & manage all result records
══════════════════════════════════════════════════ */

function renderHistorico() {
  const content = document.getElementById('content');
  const conselheiros = getConselheiros();
  const allR         = store.get('resultados') || [];
  const allS         = store.get('stock')      || [];

  // Filter to current province
  const cIds  = new Set(conselheiros.map(c => c.id));
  const recs  = allR.filter(r => cIds.has(r.conselheiro_id))
    .sort((a, b) => b.periodo_ref.localeCompare(a.periodo_ref) || b.created_at?.localeCompare(a.created_at || '') || 0);

  const uniquePeriods  = [...new Set(recs.map(r => r.periodo_ref))].sort().reverse();
  const uniqueDistritos = [...new Set(conselheiros.map(c => c.distrito).filter(Boolean))].sort();

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Histórico de Registos</h2>
        <p>${recs.length} registo(s) em ${currentProvincia}</p>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <input id="hist-search" type="text" placeholder="Pesquisar por conselheiro…"
          style="flex:1;min-width:160px;padding:8px 12px;border:1px solid #CBD5E0;border-radius:7px;font-size:13px;font-family:inherit"
          oninput="filterHistorico()" />
        <select id="hist-periodo" onchange="filterHistorico()"
          style="padding:8px 12px;border:1px solid #CBD5E0;border-radius:7px;font-size:13px;font-family:inherit;background:#fff">
          <option value="">Todos os períodos</option>
          ${uniquePeriods.map(p => `<option value="${p}">${periodLabel(p)}</option>`).join('')}
        </select>
        <select id="hist-distrito" onchange="filterHistorico()"
          style="padding:8px 12px;border:1px solid #CBD5E0;border-radius:7px;font-size:13px;font-family:inherit;background:#fff">
          <option value="">Todos os distritos</option>
          ${uniqueDistritos.map(d => `<option>${escHtml(d)}</option>`).join('')}
        </select>
        <select id="hist-score" onchange="filterHistorico()"
          style="padding:8px 12px;border:1px solid #CBD5E0;border-radius:7px;font-size:13px;font-family:inherit;background:#fff">
          <option value="">Todos os scores</option>
          <option>RED</option><option>YELLOW</option><option>GREEN</option>
        </select>
      </div>
    </div>

    <div class="card" id="hist-table-wrap">
      ${renderHistoricoTable(recs, conselheiros, allS)}
    </div>
  `;
}

function renderHistoricoTable(recs, conselheiros, allS) {
  if (!recs.length) return emptyStateHTML('📋', 'Sem registos', 'Não existem registos para os filtros seleccionados.');

  const cMap = Object.fromEntries(conselheiros.map(c => [c.id, c]));

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Período</th><th>Conselheiro</th><th>Distrito</th><th>Testados</th>
            <th>Positivos</th><th>Yield%</th><th>Aderência%</th><th>Score</th><th>Acções</th>
          </tr>
        </thead>
        <tbody>
          ${recs.map(r => {
            const c  = cMap[r.conselheiro_id] || {};
            const s  = allS.find(x => x.conselheiro_id === r.conselheiro_id && x.periodo_ref === r.periodo_ref) || {};
            const sc = computeReliability(r, s);
            const yp = sc.indicators.yieldPct;
            const ap = sc.indicators.adherPct;
            return `<tr>
              <td style="font-weight:600;font-size:12px;white-space:nowrap">${periodLabel(r.periodo_ref)}</td>
              <td>
                <a href="#" onclick="openFicha('${r.conselheiro_id}')"
                  style="font-weight:600;color:var(--rise-navy);text-decoration:none;font-size:13px">
                  ${escHtml(c.nome || '—')}
                </a>
              </td>
              <td style="font-size:12px;color:var(--rise-muted)">${escHtml(c.distrito || '—')}</td>
              <td>${r.total_testados}</td>
              <td>${r.positivos_confirmados}</td>
              <td style="color:${yp!==null&&yp>=5?'var(--status-green)':'var(--status-red)'};font-weight:600">
                ${yp !== null ? yp + '%' : '—'}
              </td>
              <td style="color:${ap===null||ap>=95?'var(--status-green)':'var(--status-yellow)'}">
                ${ap !== null ? ap + '%' : 'N/A'}
              </td>
              <td><span class="badge ${scoreBadge(sc.score_global)}" style="font-size:11px">${sc.score_global}</span></td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-secondary btn-sm" onclick="openRegistarFor('${r.conselheiro_id}')">Editar</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteRegisto('${r.id}')">✕</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div style="font-size:11px;color:var(--rise-muted);text-align:right;margin-top:8px">${recs.length} registo(s)</div>
    </div>
  `;
}

function filterHistorico() {
  const q       = (document.getElementById('hist-search')?.value  || '').toLowerCase();
  const periodo = document.getElementById('hist-periodo')?.value   || '';
  const dist    = document.getElementById('hist-distrito')?.value  || '';
  const scoreF  = document.getElementById('hist-score')?.value     || '';

  const conselheiros = getConselheiros();
  const cIds         = new Set(conselheiros.map(c => c.id));
  const allR         = store.get('resultados') || [];
  const allS         = store.get('stock')      || [];
  const cMap         = Object.fromEntries(conselheiros.map(c => [c.id, c]));

  let recs = allR.filter(r => cIds.has(r.conselheiro_id))
    .sort((a, b) => b.periodo_ref.localeCompare(a.periodo_ref));

  if (q)       recs = recs.filter(r => (cMap[r.conselheiro_id]?.nome || '').toLowerCase().includes(q));
  if (periodo) recs = recs.filter(r => r.periodo_ref === periodo);
  if (dist)    recs = recs.filter(r => (cMap[r.conselheiro_id]?.distrito || '') === dist);
  if (scoreF)  recs = recs.filter(r => {
    const s  = allS.find(x => x.conselheiro_id === r.conselheiro_id && x.periodo_ref === r.periodo_ref) || {};
    return computeReliability(r, s).score_global === scoreF;
  });

  const wrap = document.getElementById('hist-table-wrap');
  if (wrap) wrap.innerHTML = renderHistoricoTable(recs, conselheiros, allS);
}

function deleteRegisto(id) {
  const allR = store.get('resultados') || [];
  const rec  = allR.find(r => r.id === id);
  if (!rec) return;
  const c    = getConselheiros().find(x => x.id === rec.conselheiro_id);
  showConfirm(
    'Eliminar Registo',
    `Eliminar o registo de <strong>${periodLabel(rec.periodo_ref)}</strong> para <strong>${escHtml(c?.nome || '—')}</strong>?`,
    () => {
      store.set('resultados', allR.filter(r => r.id !== id));
      // Also remove the associated stock record
      store.set('stock', (store.get('stock') || []).filter(s =>
        !(s.conselheiro_id === rec.conselheiro_id && s.periodo_ref === rec.periodo_ref)));
      showToast('Registo eliminado.', 'success');
      updateTopbarContext();
      renderHistorico();
    }
  );
}
