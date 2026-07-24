/* ══════════════════════════════════════════════════
   EXPORTAR / IMPORTAR — CSV export, report print, CSV import
══════════════════════════════════════════════════ */

/* ── Main render ────────────────────────────────── */
function renderExportar() {
  const content = document.getElementById('content');
  const conselheiros = getConselheiros();
  const allR  = store.get('resultados') || [];
  const allS  = store.get('stock')      || [];
  const cIds  = new Set(conselheiros.map(c => c.id));
  const recs  = allR.filter(r => cIds.has(r.conselheiro_id));

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Exportar / Importar</h2>
        <p>${conselheiros.length} conselheiros · ${recs.length} registos disponíveis</p>
      </div>
    </div>

    <!-- Export section -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-title" style="margin-bottom:16px">📤 Exportar Dados</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">
        <div style="border:1px solid #E2E8F0;border-radius:10px;padding:16px">
          <div style="font-size:24px;margin-bottom:8px">👥</div>
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">Conselheiros</div>
          <div style="font-size:12px;color:var(--rise-muted);margin-bottom:12px">${conselheiros.length} registos · CSV</div>
          <button class="btn btn-secondary" style="width:100%" onclick="exportConselheirosCSV()">⬇️ Exportar</button>
        </div>
        <div style="border:1px solid #E2E8F0;border-radius:10px;padding:16px">
          <div style="font-size:24px;margin-bottom:8px">📊</div>
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">Resultados de Testes</div>
          <div style="font-size:12px;color:var(--rise-muted);margin-bottom:12px">${recs.length} registos · CSV</div>
          <button class="btn btn-secondary" style="width:100%" onclick="exportResultadosCSV()">⬇️ Exportar</button>
        </div>
        <div style="border:1px solid #E2E8F0;border-radius:10px;padding:16px">
          <div style="font-size:24px;margin-bottom:8px">📦</div>
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">Dataset Completo</div>
          <div style="font-size:12px;color:var(--rise-muted);margin-bottom:12px">Resultados + Stock · CSV</div>
          <button class="btn btn-secondary" style="width:100%" onclick="exportFullCSV()">⬇️ Exportar Tudo</button>
        </div>
      </div>
    </div>

    <!-- Report section -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-title" style="margin-bottom:16px">📄 Relatório de Supervisão</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">
        <div style="border:1px solid #E2E8F0;border-radius:10px;padding:16px">
          <div style="font-size:24px;margin-bottom:8px">🖨️</div>
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">Relatório Completo</div>
          <div style="font-size:12px;color:var(--rise-muted);margin-bottom:12px">Todas as fichas + indicadores</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary" style="flex:1;font-size:12px" onclick="previewReport()">👁️ Pré-visualizar</button>
            <button class="btn btn-primary" style="flex:1;font-size:12px" onclick="printReport()">🖨️ Imprimir</button>
          </div>
        </div>
        <div style="border:1px solid #E2E8F0;border-radius:10px;padding:16px">
          <div style="font-size:24px;margin-bottom:8px">📋</div>
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">Sumário Executivo</div>
          <div style="font-size:12px;color:var(--rise-muted);margin-bottom:12px">1 página · KPIs + alertas</div>
          <button class="btn btn-primary" style="width:100%;font-size:12px" onclick="printExecutiveSummary()">🖨️ Imprimir Sumário</button>
        </div>
      </div>
    </div>

    <!-- Import section -->
    <div class="card">
      <div class="card-title" style="margin-bottom:16px">📥 Importar Dados (CSV)</div>
      <div style="background:#FFFBEB;border:1px solid #FEF3C7;border-radius:8px;padding:12px;margin-bottom:14px;font-size:12px;color:#92400E">
        ⚠️ A importação faz merge dos dados existentes. Registos com IDs duplicados serão ignorados. Faça uma exportação de backup primeiro.
      </div>
      <div style="border:2px dashed #CBD5E0;border-radius:10px;padding:28px;text-align:center;margin-bottom:14px"
        ondragover="event.preventDefault()" ondrop="event.preventDefault();handleImport(event.dataTransfer.files[0])">
        <div style="font-size:32px;margin-bottom:8px">📂</div>
        <div style="font-weight:600;margin-bottom:6px">Arraste um ficheiro CSV aqui</div>
        <div style="font-size:12px;color:var(--rise-muted);margin-bottom:14px">ou</div>
        <input id="import-file-input" type="file" accept=".csv" style="display:none" onchange="handleImport(this.files[0])">
        <button class="btn btn-secondary" onclick="document.getElementById('import-file-input').click()">Seleccionar Ficheiro</button>
      </div>
      <div id="import-preview-wrap"></div>
    </div>
  `;
}

/* ════════════════════════════════════════════════
   EXPORT FUNCTIONS
════════════════════════════════════════════════ */
function exportConselheirosCSV() {
  const list = getConselheiros();
  if (!list.length) { showToast('Sem conselheiros para exportar.', 'error'); return; }
  const headers = ['id','nome','distrito','unidade_sanitaria','nivel_formacao','telefone','responsavel_clinico','ativo','provincia','created_at'];
  const rows    = list.map(c => headers.map(h => JSON.stringify(c[h] ?? '')).join(','));
  downloadFile([headers.join(','), ...rows].join('\n'), `RISE_ICT_Conselheiros_${currentProvincia}_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
  showToast('Conselheiros exportados.', 'success');
}

function exportResultadosCSV() {
  const conselheiros = getConselheiros();
  const cIds  = new Set(conselheiros.map(c => c.id));
  const cMap  = Object.fromEntries(conselheiros.map(c => [c.id, c]));
  const allR  = (store.get('resultados') || []).filter(r => cIds.has(r.conselheiro_id));
  const allS  = store.get('stock') || [];
  if (!allR.length) { showToast('Sem resultados para exportar.', 'error'); return; }

  const headers = [
    'id','conselheiro_id','conselheiro_nome','distrito','unidade_sanitaria','provincia',
    'periodo_ref','periodo_tipo',
    'total_testados','determine_reactivos','determine_nao_reactivos',
    'unigold_realizados','unigold_reactivos','unigold_nao_reactivos',
    'positivos_confirmados','negativos_finais','indeterminados',
    'determine_consumido_reportado','unigold_consumido_reportado',
    'score_global','yield_pct','aderencia_pct','indet_pct','det_var_pct','uni_var_pct',
    'created_at'
  ];
  const rows = allR.map(r => {
    const c  = cMap[r.conselheiro_id] || {};
    const s  = allS.find(x => x.conselheiro_id === r.conselheiro_id && x.periodo_ref === r.periodo_ref) || {};
    const sc = computeReliability(r, s);
    return headers.map(h => {
      const v = {
        conselheiro_nome: c.nome, distrito: c.distrito, unidade_sanitaria: c.unidade_sanitaria,
        provincia: c.provincia,
        score_global:   sc.score_global,
        yield_pct:      sc.indicators.yieldPct,
        aderencia_pct:  sc.indicators.adherPct,
        indet_pct:      sc.indicators.indetPct,
        det_var_pct:    sc.indicators.detVarPct,
        uni_var_pct:    sc.indicators.uniVarPct,
      }[h] ?? r[h] ?? '';
      return JSON.stringify(v);
    }).join(',');
  });
  downloadFile([headers.join(','), ...rows].join('\n'),
    `RISE_ICT_Resultados_${currentProvincia}_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
  showToast('Resultados exportados.', 'success');
}

function exportFullCSV() {
  exportConselheirosCSV();
  setTimeout(exportResultadosCSV, 400);
}

/* ════════════════════════════════════════════════
   REPORT FUNCTIONS
════════════════════════════════════════════════ */
function buildReportHTML(summaryOnly) {
  const conselheiros = getConselheiros();
  const allR  = store.get('resultados') || [];
  const allS  = store.get('stock')      || [];
  const period = activePeriod();
  const cIds  = new Set(conselheiros.map(c => c.id));

  const recs = allR.filter(r => cIds.has(r.conselheiro_id) && r.periodo_ref === period);
  const scored = recs.map(r => {
    const s  = allS.find(x => x.conselheiro_id === r.conselheiro_id && x.periodo_ref === r.periodo_ref) || {};
    const sc = computeReliability(r, s);
    const c  = conselheiros.find(x => x.id === r.conselheiro_id) || {};
    return { r, s, sc, c };
  });

  const totalTestados = recs.reduce((sum, r) => sum + r.total_testados, 0);
  const totalPos      = recs.reduce((sum, r) => sum + r.positivos_confirmados, 0);
  const yieldGlobal   = totalTestados > 0 ? (totalPos / totalTestados * 100).toFixed(1) : '—';
  const redCount      = scored.filter(x => x.sc.score_global === 'RED').length;
  const greenCount    = scored.filter(x => x.sc.score_global === 'GREEN').length;

  const now = new Date().toLocaleDateString('pt', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>RISE ICT Monitor — Relatório ${periodLabel(period)}</title>
<style>
  body { font-family: Inter, Arial, sans-serif; font-size: 12px; color: #1a202c; margin: 0; padding: 20px; }
  h1 { color: #1B3A6B; font-size: 20px; margin: 0 0 4px; }
  h2 { color: #1B3A6B; font-size: 15px; margin: 16px 0 8px; border-bottom: 2px solid #1B3A6B; padding-bottom: 4px; }
  h3 { font-size: 13px; margin: 12px 0 4px; color: #1B3A6B; }
  .header { background: #1B3A6B; color: #fff; padding: 16px 20px; margin: -20px -20px 20px; display: flex; align-items: center; justify-content: space-between; }
  .header h1 { color: #fff; }
  .header p { color: rgba(255,255,255,.7); font-size: 11px; margin: 2px 0 0; }
  .kpi-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .kpi { flex: 1; min-width: 100px; background: #F7FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; text-align: center; }
  .kpi-val { font-size: 22px; font-weight: 800; color: #1B3A6B; }
  .kpi-lbl { font-size: 10px; color: #718096; text-transform: uppercase; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
  th { background: #1B3A6B; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
  td { padding: 5px 8px; border-bottom: 1px solid #E2E8F0; }
  tr:nth-child(even) { background: #F7FAFC; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; }
  .green { background: #dcfce7; color: #166534; }
  .yellow { background: #fef9c3; color: #92400E; }
  .red { background: #fee2e2; color: #991B1B; }
  .flag-row { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 3px; }
  @media print { body { padding: 0; } .header { margin: 0 0 16px; } @page { margin: 1cm; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>RISE ICT Monitor</h1>
    <p>Relatório de Supervisão — ${escHtml(currentProvincia)} · ${periodLabel(period)}</p>
  </div>
  <div style="text-align:right;font-size:11px;color:rgba(255,255,255,.7)">${now}</div>
</div>

<h2>Sumário Executivo</h2>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-val">${conselheiros.filter(c=>c.ativo).length}</div><div class="kpi-lbl">Conselheiros Activos</div></div>
  <div class="kpi"><div class="kpi-val">${recs.length}</div><div class="kpi-lbl">Com Dados</div></div>
  <div class="kpi"><div class="kpi-val">${totalTestados}</div><div class="kpi-lbl">Total Testados</div></div>
  <div class="kpi"><div class="kpi-val">${totalPos}</div><div class="kpi-lbl">Positivos Confirmados</div></div>
  <div class="kpi"><div class="kpi-val">${yieldGlobal}%</div><div class="kpi-lbl">Yield Global</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#166534">${greenCount}</div><div class="kpi-lbl">GREEN</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#991B1B">${redCount}</div><div class="kpi-lbl">RED</div></div>
</div>

${!summaryOnly ? `
<h2>Resultados por Conselheiro</h2>
<table>
  <thead>
    <tr>
      <th>Conselheiro</th><th>US</th><th>Testados</th><th>Positivos</th>
      <th>Yield%</th><th>Aderência%</th><th>Var.Det.</th><th>Score</th><th>Flags</th>
    </tr>
  </thead>
  <tbody>
    ${scored.sort((a,b)=>{
      const order = {RED:0,YELLOW:1,GREEN:2};
      return (order[a.sc.score_global]||3)-(order[b.sc.score_global]||3);
    }).map(({r, sc, c}) => {
      const yp = sc.indicators.yieldPct;
      const ap = sc.indicators.adherPct;
      const dv = sc.indicators.detVarPct;
      const flags = [...sc.consistFlags, ...sc.stockFlags];
      return `<tr>
        <td style="font-weight:600">${escHtml(c.nome||'—')}</td>
        <td>${escHtml(c.unidade_sanitaria||'—')}</td>
        <td>${r.total_testados}</td>
        <td>${r.positivos_confirmados}</td>
        <td style="font-weight:600">${yp!==null?yp+'%':'—'}</td>
        <td>${ap!==null?ap+'%':'N/A'}</td>
        <td>${dv!==null?(dv>0?'+':'')+dv+'%':'—'}</td>
        <td><span class="badge ${sc.score_global.toLowerCase()}">${sc.score_global}</span></td>
        <td style="font-size:10px">
          ${flags.length ? flags.map(f=>`<div class="flag-row"><b>${f.id}</b> ${f.label}</div>`).join('') : '✅ OK'}
        </td>
      </tr>`;
    }).join('')}
  </tbody>
</table>
` : ''}

<div style="margin-top:24px;font-size:10px;color:#718096;text-align:center;border-top:1px solid #E2E8F0;padding-top:10px">
  RISE ICT Monitor v${CONFIG.APP_VERSION} · PEPFAR/USAID RISE · ${now}
</div>
</body>
</html>`;
}

function previewReport() {
  const html = buildReportHTML(false);
  const win  = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

function printReport() {
  const html = buildReportHTML(false);
  const win  = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

function printExecutiveSummary() {
  const html = buildReportHTML(true);
  const win  = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

/* ════════════════════════════════════════════════
   IMPORT FUNCTIONS
════════════════════════════════════════════════ */
const IMPORT_SCHEMAS = {
  conselheiros: ['id','nome','distrito','unidade_sanitaria','provincia'],
  resultados:   ['id','conselheiro_id','periodo_ref','total_testados','positivos_confirmados'],
};

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1).map(line => {
    const vals = [];
    let cur = ''; let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { vals.push(cur); cur = ''; }
      else cur += ch;
    }
    vals.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || '').replace(/^"|"$/g, '').trim()]));
  });
  return { headers, rows };
}

function detectImportType(headers) {
  const hSet = new Set(headers);
  if (hSet.has('nome') && hSet.has('distrito')) return 'conselheiros';
  if (hSet.has('conselheiro_id') && hSet.has('total_testados')) return 'resultados';
  return null;
}

function validateImportRows(rows, type) {
  const required = IMPORT_SCHEMAS[type] || [];
  const errs = [];
  rows.forEach((row, i) => {
    required.forEach(field => {
      if (!row[field]) errs.push(`Linha ${i + 2}: campo '${field}' em falta`);
    });
  });
  return errs;
}

function handleImport(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const { headers, rows } = parseCSV(e.target.result);
    const type = detectImportType(headers);
    if (!type) {
      showToast('Formato CSV não reconhecido. Verifique os cabeçalhos.', 'error');
      return;
    }
    const errs = validateImportRows(rows, type);
    showImportPreview(type, rows, errs);
  };
  reader.readAsText(file);
}

function showImportPreview(type, rows, errs) {
  const wrap = document.getElementById('import-preview-wrap');
  if (!wrap) return;
  const label = type === 'conselheiros' ? 'Conselheiros' : 'Resultados de Testes';

  wrap.innerHTML = `
    <div style="border:1px solid #E2E8F0;border-radius:10px;padding:16px;margin-top:4px">
      <div style="font-weight:700;margin-bottom:8px">📋 Pré-visualização: ${label}</div>
      <div style="font-size:12px;color:var(--rise-muted);margin-bottom:8px">${rows.length} linhas detectadas</div>
      ${errs.length ? `
        <div style="background:#FEF2F2;border:1px solid #FEE2E2;border-radius:6px;padding:10px;margin-bottom:10px;font-size:11px;color:#991B1B">
          <strong>${errs.length} erro(s):</strong><br>${errs.slice(0,5).join('<br>')}${errs.length > 5 ? `<br>… e mais ${errs.length - 5}` : ''}
        </div>` : `
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;padding:10px;margin-bottom:10px;font-size:12px;color:#166534">
          ✅ Dados válidos — ${rows.length} linhas prontas para importar
        </div>`}
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="document.getElementById('import-preview-wrap').innerHTML=''">Cancelar</button>
        ${!errs.length ? `<button class="btn btn-primary" onclick="confirmImport('${type}', ${JSON.stringify(rows).replace(/</g,'&lt;').replace(/"/g,'&quot;')})">⬆️ Importar ${rows.length} Registos</button>` : ''}
      </div>
    </div>
  `;
}

function confirmImport(type, rows) {
  if (type === 'conselheiros') {
    const existing = store.get('conselheiros') || [];
    const existIds = new Set(existing.map(c => c.id));
    const newOnes  = rows.filter(r => r.id && !existIds.has(r.id)).map(r => ({
      ...r, ativo: r.ativo !== 'false', created_at: r.created_at || new Date().toISOString()
    }));
    store.set('conselheiros', [...existing, ...newOnes]);
    showToast(`${newOnes.length} conselheiro(s) importado(s) (${rows.length - newOnes.length} ignorado(s)).`, 'success');
  } else if (type === 'resultados') {
    const existing = store.get('resultados') || [];
    const existIds = new Set(existing.map(r => r.id));
    const newOnes  = rows.filter(r => r.id && !existIds.has(r.id)).map(r => ({
      ...r,
      total_testados:          parseInt(r.total_testados)          || 0,
      positivos_confirmados:   parseInt(r.positivos_confirmados)   || 0,
      negativos_finais:        parseInt(r.negativos_finais)        || 0,
      determine_reactivos:     parseInt(r.determine_reactivos)     || 0,
      determine_nao_reactivos: parseInt(r.determine_nao_reactivos) || 0,
      unigold_realizados:      parseInt(r.unigold_realizados)      || 0,
      unigold_reactivos:       parseInt(r.unigold_reactivos)       || 0,
      unigold_nao_reactivos:   parseInt(r.unigold_nao_reactivos)   || 0,
      indeterminados:          parseInt(r.indeterminados)          || 0,
    }));
    store.set('resultados', [...existing, ...newOnes]);
    showToast(`${newOnes.length} resultado(s) importado(s).`, 'success');
  }
  renderExportar();
  updateTopbarContext();
}
