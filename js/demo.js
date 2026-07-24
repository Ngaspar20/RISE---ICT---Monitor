/* ══════════════════════════════════════════════════
   DEMO DATA — seeder for demonstration mode
══════════════════════════════════════════════════ */

function loadDemoData() {
  showConfirm(
    'Carregar Dados de Demonstração',
    'Isto irá substituir todos os dados actuais por dados fictícios para demonstração. Continuar?',
    _seedDemoData
  );
}

function clearDemoData() {
  showConfirm(
    'Apagar Todos os Dados',
    'Isto irá apagar todos os dados guardados (conselheiros, resultados, stock, entregas). A aplicação volta ao estado inicial. Continuar?',
    () => {
      ['conselheiros','resultados','stock','entregas','sync_queue','last_sync','role','provincia'].forEach(k => store.remove(k));
      showToast('Dados apagados. A reiniciar…', 'success');
      setTimeout(() => { resetRole(); }, 800);
    }
  );
}

function _seedDemoData() {
  /* ── Conselheiros ──────────────────────────────── */
  const conselheiros = [
    { id:'c-001', nome:'Maria Fernanda Cossa',    codigo:'MAN-001', unidade_sanitaria:'CS Chimoio',     distrito:'Chimoio',     provincia:'Manica',   ativo:true,  stock_inicial_determine:60, stock_inicial_unigold:15, data_registo:'2025-01-15T08:00:00Z', notas:'' },
    { id:'c-002', nome:'João Baptista Nhantumbo', codigo:'MAN-002', unidade_sanitaria:'CS Gondola',     distrito:'Gondola',     provincia:'Manica',   ativo:true,  stock_inicial_determine:50, stock_inicial_unigold:12, data_registo:'2025-02-10T08:00:00Z', notas:'' },
    { id:'c-003', nome:'Ana Lurdes Zimba',        codigo:'MAN-003', unidade_sanitaria:'CS Manica Sede', distrito:'Manica',      provincia:'Manica',   ativo:true,  stock_inicial_determine:70, stock_inicial_unigold:20, data_registo:'2025-03-01T08:00:00Z', notas:'Conselheira sénior' },
    { id:'c-004', nome:'Carlos Manuel Sitoe',     codigo:'MAN-004', unidade_sanitaria:'CS Sussundenga', distrito:'Sussundenga', provincia:'Manica',   ativo:false, stock_inicial_determine:0,  stock_inicial_unigold:0,  data_registo:'2025-01-20T08:00:00Z', notas:'Transferido' },
    { id:'c-005', nome:'Esperança Guambe',        codigo:'ZAM-001', unidade_sanitaria:'CS Nicoadala',   distrito:'Nicoadala',   provincia:'Zambézia', ativo:true,  stock_inicial_determine:50, stock_inicial_unigold:10, data_registo:'2025-04-05T08:00:00Z', notas:'' },
    { id:'c-006', nome:'Pedro Alfredo Machava',   codigo:'ZAM-002', unidade_sanitaria:'CS Mocuba',      distrito:'Mocuba',      provincia:'Zambézia', ativo:true,  stock_inicial_determine:55, stock_inicial_unigold:18, data_registo:'2025-04-12T08:00:00Z', notas:'' },
    { id:'c-007', nome:'Lurdes Celeste Muiambo',  codigo:'ZAM-003', unidade_sanitaria:'CS Milange',     distrito:'Milange',     provincia:'Zambézia', ativo:true,  stock_inicial_determine:40, stock_inicial_unigold:12, data_registo:'2025-05-01T08:00:00Z', notas:'' },
    { id:'c-008', nome:'António Fonseca Bila',    codigo:'ZAM-004', unidade_sanitaria:'CS Gurué',       distrito:'Gurué',       provincia:'Zambézia', ativo:true,  stock_inicial_determine:48, stock_inicial_unigold:15, data_registo:'2025-05-20T08:00:00Z', notas:'' },
  ];

  /* ── Week reference helper ─────────────────────── */
  function weekRef(daysAgo) {
    const d = new Date(); d.setDate(d.getDate() - daysAgo);
    d.setHours(0,0,0,0); d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const ys = new Date(d.getFullYear(), 0, 1);
    const wk = Math.ceil((((d - ys) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${String(wk).padStart(2,'0')}`;
  }
  const weeks = [0, 7, 14, 21, 28, 35, 42, 49].map(weekRef);

  /* ── Simple score calculator (mirrors computeReliability) ── */
  function calcScore(r, s) {
    const flags = [];
    if (r.determine_reactivos + r.determine_nao_reactivos !== r.total_testados)
      flags.push({ id:'C01', severity:'HIGH' });
    if (r.unigold_realizados > r.determine_reactivos)
      flags.push({ id:'C02', severity:'HIGH' });
    if (r.positivos_confirmados > r.unigold_reactivos)
      flags.push({ id:'C03', severity:'HIGH' });
    if (r.positivos_confirmados + r.negativos_finais + r.indeterminados !== r.total_testados)
      flags.push({ id:'C04', severity:'HIGH' });
    if (r.determine_reactivos > 0 && r.unigold_realizados < r.determine_reactivos * 0.95)
      flags.push({ id:'C05', severity:'MEDIUM' });
    if (r.total_testados > 0 && r.indeterminados / r.total_testados > 0.02)
      flags.push({ id:'C06', severity:'MEDIUM' });
    if (s.determine_abertura + s.determine_recebido - s.determine_consumido_reportado - s.determine_expirado_perdido !== s.determine_fecho)
      flags.push({ id:'S01', severity:'HIGH' });
    if (s.unigold_abertura + s.unigold_recebido - s.unigold_consumido_reportado - s.unigold_expirado_perdido !== s.unigold_fecho)
      flags.push({ id:'S02', severity:'HIGH' });
    if (r.total_testados > 0) {
      const dv = Math.abs(s.determine_consumido_reportado - r.total_testados) / r.total_testados;
      if (dv > 0.15) flags.push({ id:'S04', severity:'HIGH' });
      else if (dv > 0.05) flags.push({ id:'S03', severity:'MEDIUM' });
    }
    if (r.determine_reactivos > 0) {
      const uv = Math.abs(s.unigold_consumido_reportado - r.determine_reactivos) / r.determine_reactivos;
      if (uv > 0.15) flags.push({ id:'S06', severity:'HIGH' });
      else if (uv > 0.05) flags.push({ id:'S05', severity:'MEDIUM' });
    }
    const hasHigh = flags.some(f => f.severity === 'HIGH');
    const medCount = flags.filter(f => f.severity === 'MEDIUM').length;
    return {
      score: hasHigh ? 'RED' : medCount >= 1 ? 'YELLOW' : 'GREEN',
      flags: flags.map(f => f.id)
    };
  }

  /* ── Record builder ────────────────────────────── */
  function mkRecord(cId, week, opts = {}) {
    const {
      tested = 40, detReact = 4, detNR = null,
      uniReal = null, uniReact = null, uniNR = null,
      posConf = null, negFin = null, indet = 0,
      detAb = 50, detRec = 20, detConsumed = null, detFecho = null, detExp = 0,
      uniAb = 20, uniRec = 10, uniConsumed = null, uniFecho = null, uniExp = 0,
      servico = 'ATS Consulta', assinatura = '',
      detInjust = null, uniInjust = null,
    } = opts;

    const _detNR  = detNR     ?? (tested - detReact);
    const _uniReal= uniReal   ?? detReact;
    const _uniReact = uniReact?? detReact;
    const _uniNR  = uniNR     ?? (_uniReal - _uniReact);
    const _posConf= posConf   ?? _uniReact;
    const _negFin = negFin    ?? (tested - _posConf - indet);
    const _detCons= detConsumed ?? tested;
    const _detFecho = detFecho ?? (detAb + detRec - _detCons - detExp);
    const _uniCons= uniConsumed ?? _uniReal;
    const _uniFecho = uniFecho ?? (uniAb + uniRec - _uniCons - uniExp);
    // Injustificados: default 0 (clean records) unless explicitly set
    const _detInj = detInjust ?? 0;
    const _uniInj = uniInjust ?? 0;

    const rid = uuid(), sid = uuid();
    const r = {
      id: rid, conselheiro_id: cId,
      periodo_tipo: 'semanal', periodo_ref: week,
      data_entrada: new Date().toISOString(), supervisor_id: 'demo',
      total_testados: tested,
      determine_reactivos: detReact, determine_nao_reactivos: _detNR,
      unigold_realizados: _uniReal, unigold_reactivos: _uniReact, unigold_nao_reactivos: _uniNR,
      positivos_confirmados: _posConf, negativos_finais: _negFin, indeterminados: indet,
      notas_supervisor: '', sincronizado: false, data_sincronizacao: null,
      determine_consumido_reportado: _detCons,
      unigold_consumido_reportado:   _uniCons,
      determine_injustificados: _detInj,
      unigold_injustificados:   _uniInj,
      servico_depositario: servico,
      assinatura:          assinatura,
    };
    const s = {
      id: sid, conselheiro_id: cId,
      periodo_tipo: 'semanal', periodo_ref: week,
      data_entrada: new Date().toISOString(),
      determine_stock_abertura: detAb, determine_recebido: detRec,
      determine_consumido_reportado: _detCons, determine_fecho: _detFecho,
      determine_expirado_perdido: detExp,
      determine_lote: 'DET-2026-01', determine_validade: '2027-06-30',
      unigold_stock_abertura: uniAb, unigold_recebido: uniRec,
      unigold_consumido_reportado: _uniCons, unigold_fecho: _uniFecho,
      unigold_expirado_perdido: uniExp,
      unigold_lote: 'UNI-2026-01', unigold_validade: '2027-06-30',
      notas_stock: '', sincronizado: false, data_sincronizacao: null,
    };

    // score via stock object field names used in calcScore
    const sForScore = {
      determine_abertura: detAb, determine_recebido: detRec,
      determine_consumido_reportado: _detCons, determine_fecho: _detFecho,
      determine_expirado_perdido: detExp,
      unigold_abertura: uniAb, unigold_recebido: uniRec,
      unigold_consumido_reportado: _uniCons, unigold_fecho: _uniFecho,
      unigold_expirado_perdido: uniExp,
    };
    const { score, flags } = calcScore(r, sForScore);
    r.score_global = score;
    r.flags_consistencia = flags;
    s.flags_stock = flags.filter(f => f.startsWith('S'));
    return { r, s };
  }

  const resultados = [], stock = [];

  /* ── c1 — Maria Fernanda: GREEN ── */
  [
    { tested:42, detReact:5, uniReact:5, posConf:5, indet:0, detAb:60, detRec:0,  uniAb:15, uniRec:0,  servico:'ATS Consulta',   assinatura:'M. Cossa' },
    { tested:38, detReact:4, uniReact:4, posConf:4, indet:0, detAb:18, detRec:30, uniAb:11, uniRec:10, servico:'ATS Consulta',   assinatura:'M. Cossa' },
    { tested:45, detReact:6, uniReact:6, posConf:6, indet:0, detAb:30, detRec:20, uniAb:17, uniRec:5,  servico:'ATS Consulta',   assinatura:'M. Cossa' },
    { tested:40, detReact:5, uniReact:5, posConf:5, indet:0, detAb:5,  detRec:50, uniAb:16, uniRec:10, servico:'ATS Consulta',   assinatura:'M. Cossa' },
    { tested:37, detReact:4, uniReact:4, posConf:4, indet:0, detAb:15, detRec:30, uniAb:22, uniRec:0,  servico:'ATS Consulta',   assinatura:'M. Cossa' },
    { tested:41, detReact:5, uniReact:5, posConf:5, indet:0, detAb:8,  detRec:40, uniAb:18, uniRec:5,  servico:'ATS Consulta',   assinatura:'M. Cossa' },
    { tested:39, detReact:4, uniReact:4, posConf:4, indet:0, detAb:7,  detRec:40, uniAb:19, uniRec:5,  servico:'ATS Consulta',   assinatura:'M. Cossa' },
    { tested:43, detReact:5, uniReact:5, posConf:5, indet:0, detAb:8,  detRec:50, uniAb:20, uniRec:5,  servico:'ATS Consulta',   assinatura:'M. Cossa' },
  ].forEach((o, i) => { const { r, s } = mkRecord('c-001', weeks[i], o); resultados.push(r); stock.push(s); });

  /* ── c2 — João Baptista: stock variance YELLOW + some injustificados ── */
  [
    { tested:35, detReact:3, uniReact:3, posConf:3, indet:0, detAb:50, detRec:0,  detConsumed:41, detFecho:9,  uniAb:12, uniRec:0,  uniConsumed:3, uniFecho:9,  servico:'ATS Maternidade', assinatura:'J. Nhantumbo', detInjust:6, uniInjust:0 },
    { tested:30, detReact:2, uniReact:2, posConf:2, indet:0, detAb:9,  detRec:30, detConsumed:37, detFecho:2,  uniAb:7,  uniRec:5,  uniConsumed:2, uniFecho:10, servico:'ATS Maternidade', assinatura:'J. Nhantumbo', detInjust:7, uniInjust:0 },
    { tested:32, detReact:3, uniReact:3, posConf:3, indet:0, detAb:2,  detRec:40, detConsumed:38, detFecho:4,  uniAb:8,  uniRec:5,  uniConsumed:3, uniFecho:10, servico:'ATS Maternidade', assinatura:'J. Nhantumbo', detInjust:6, uniInjust:0 },
    { tested:28, detReact:2, uniReact:2, posConf:2, indet:0, detAb:4,  detRec:30, detConsumed:32, detFecho:2,  uniAb:8,  uniRec:5,  uniConsumed:2, uniFecho:11, servico:'ATS Maternidade', assinatura:'J. Nhantumbo', detInjust:4, uniInjust:0 },
    { tested:33, detReact:3, uniReact:3, posConf:3, indet:0, detAb:2,  detRec:35, detConsumed:39, detFecho:-2, uniAb:10, uniRec:5,  uniConsumed:3, uniFecho:12, servico:'ATS Maternidade', assinatura:'J. Nhantumbo', detInjust:6, uniInjust:0 },
    { tested:31, detReact:3, uniReact:3, posConf:3, indet:0, detAb:33, detRec:0,  detConsumed:36, detFecho:-3, uniAb:10, uniRec:0,  uniConsumed:3, uniFecho:7,  servico:'ATS Maternidade', assinatura:'J. Nhantumbo', detInjust:5, uniInjust:0 },
    { tested:29, detReact:2, uniReact:2, posConf:2, indet:0, detAb:33, detRec:0,  detConsumed:33, detFecho:0,  uniAb:6,  uniRec:0,  uniConsumed:2, uniFecho:4,  servico:'ATS Maternidade', assinatura:'J. Nhantumbo', detInjust:4, uniInjust:0 },
    { tested:34, detReact:3, uniReact:3, posConf:3, indet:0, detAb:35, detRec:5,  detConsumed:40, detFecho:0,  uniAb:3,  uniRec:5,  uniConsumed:3, uniFecho:5,  servico:'ATS Maternidade', assinatura:'J. Nhantumbo', detInjust:6, uniInjust:0 },
  ].forEach((o, i) => { const { r, s } = mkRecord('c-002', weeks[i], o); resultados.push(r); stock.push(s); });

  /* ── c3 — Ana Lurdes: excellent GREEN ── */
  [
    { tested:55, detReact:7, uniReact:7, posConf:7, indet:0, detAb:70, detRec:0,  uniAb:20, uniRec:0,  servico:'CS Manica Sede', assinatura:'A. Zimba' },
    { tested:50, detReact:6, uniReact:6, posConf:6, indet:0, detAb:15, detRec:50, uniAb:13, uniRec:10, servico:'CS Manica Sede', assinatura:'A. Zimba' },
    { tested:52, detReact:7, uniReact:7, posConf:7, indet:0, detAb:13, detRec:50, uniAb:17, uniRec:5,  servico:'CS Manica Sede', assinatura:'A. Zimba' },
    { tested:48, detReact:5, uniReact:5, posConf:5, indet:0, detAb:11, detRec:50, uniAb:15, uniRec:5,  servico:'CS Manica Sede', assinatura:'A. Zimba' },
    { tested:53, detReact:7, uniReact:7, posConf:7, indet:0, detAb:13, detRec:50, uniAb:15, uniRec:5,  servico:'CS Manica Sede', assinatura:'A. Zimba' },
    { tested:49, detReact:6, uniReact:6, posConf:6, indet:0, detAb:10, detRec:50, uniAb:13, uniRec:10, servico:'CS Manica Sede', assinatura:'A. Zimba' },
    { tested:51, detReact:6, uniReact:6, posConf:6, indet:0, detAb:11, detRec:50, uniAb:17, uniRec:0,  servico:'CS Manica Sede', assinatura:'A. Zimba' },
    { tested:54, detReact:7, uniReact:7, posConf:7, indet:0, detAb:10, detRec:55, uniAb:11, uniRec:10, servico:'CS Manica Sede', assinatura:'A. Zimba' },
  ].forEach((o, i) => { const { r, s } = mkRecord('c-003', weeks[i], o); resultados.push(r); stock.push(s); });

  /* ── c5 — Esperança: low yield + indeterminate + injustificados RED ── */
  [
    { tested:38, detReact:1, uniReal:1, uniReact:0, uniNR:1, posConf:0, indet:1, detAb:50, detRec:0,  detFecho:5,  uniAb:10, uniRec:0,  uniFecho:8,  servico:'CS Nicoadala', assinatura:'E. Guambe', detInjust:6, uniInjust:1 },
    { tested:35, detReact:0, uniReal:0, uniReact:0, uniNR:0, posConf:0, indet:0, detAb:5,  detRec:30, detFecho:0,  uniAb:9,  uniRec:5,  uniFecho:14, servico:'CS Nicoadala', assinatura:'E. Guambe', detInjust:0, uniInjust:0 },
    { tested:40, detReact:1, uniReal:1, uniReact:0, uniNR:1, posConf:0, indet:1, detAb:0,  detRec:45, detFecho:5,  uniAb:14, uniRec:0,  uniFecho:13, servico:'CS Nicoadala', assinatura:'E. Guambe', detInjust:5, uniInjust:1 },
    { tested:36, detReact:0, uniReal:0, uniReact:0, uniNR:0, posConf:0, indet:0, detAb:5,  detRec:35, detFecho:4,  uniAb:13, uniRec:0,  uniFecho:13, servico:'CS Nicoadala', assinatura:'E. Guambe', detInjust:0, uniInjust:0 },
    { tested:42, detReact:2, uniReal:2, uniReact:1, uniNR:1, posConf:1, indet:1, detAb:4,  detRec:45, detFecho:7,  uniAb:13, uniRec:0,  uniFecho:11, servico:'CS Nicoadala', assinatura:'E. Guambe', detInjust:7, uniInjust:1 },
    { tested:39, detReact:0, uniReal:0, uniReact:0, uniNR:0, posConf:0, indet:0, detAb:7,  detRec:35, detFecho:3,  uniAb:12, uniRec:0,  uniFecho:12, servico:'CS Nicoadala', assinatura:'E. Guambe', detInjust:0, uniInjust:0 },
    { tested:37, detReact:1, uniReal:1, uniReact:1, uniNR:0, posConf:1, indet:0, detAb:3,  detRec:40, detFecho:6,  uniAb:12, uniRec:0,  uniFecho:11, servico:'CS Nicoadala', assinatura:'E. Guambe', detInjust:3, uniInjust:0 },
    { tested:41, detReact:2, uniReal:2, uniReact:1, uniNR:1, posConf:1, indet:1, detAb:6,  detRec:42, detFecho:7,  uniAb:11, uniRec:0,  uniFecho:9,  servico:'CS Nicoadala', assinatura:'E. Guambe', detInjust:7, uniInjust:2 },
  ].forEach((o, i) => { const { r, s } = mkRecord('c-005', weeks[i], o); resultados.push(r); stock.push(s); });

  /* ── c6 — Pedro Alfredo: GREEN ── */
  [
    { tested:44, detReact:5, uniReact:5, posConf:5, indet:0, detAb:55, detRec:0,  uniAb:18, uniRec:0, servico:'CS Mocuba', assinatura:'P. Machava' },
    { tested:40, detReact:4, uniReact:4, posConf:4, indet:0, detAb:11, detRec:40, uniAb:13, uniRec:5, servico:'CS Mocuba', assinatura:'P. Machava' },
    { tested:46, detReact:5, uniReact:5, posConf:5, indet:0, detAb:11, detRec:40, uniAb:14, uniRec:5, servico:'CS Mocuba', assinatura:'P. Machava' },
    { tested:42, detReact:5, uniReact:5, posConf:5, indet:0, detAb:5,  detRec:45, uniAb:14, uniRec:5, servico:'CS Mocuba', assinatura:'P. Machava' },
    { tested:45, detReact:5, uniReact:5, posConf:5, indet:0, detAb:8,  detRec:45, uniAb:14, uniRec:5, servico:'CS Mocuba', assinatura:'P. Machava' },
    { tested:41, detReact:4, uniReact:4, posConf:4, indet:0, detAb:8,  detRec:45, uniAb:14, uniRec:5, servico:'CS Mocuba', assinatura:'P. Machava' },
    { tested:43, detReact:5, uniReact:5, posConf:5, indet:0, detAb:12, detRec:40, uniAb:15, uniRec:5, servico:'CS Mocuba', assinatura:'P. Machava' },
    { tested:47, detReact:6, uniReact:6, posConf:6, indet:0, detAb:9,  detRec:45, uniAb:15, uniRec:5, servico:'CS Mocuba', assinatura:'P. Machava' },
  ].forEach((o, i) => { const { r, s } = mkRecord('c-006', weeks[i], o); resultados.push(r); stock.push(s); });

  /* ── c7 — Lurdes Celeste: YELLOW ── */
  [
    { tested:30, detReact:2, uniReact:2, posConf:2, indet:0, detAb:40, detRec:0,  uniAb:12, uniRec:0, servico:'CS Milange', assinatura:'L. Muiambo' },
    { tested:28, detReact:1, uniReact:1, posConf:1, indet:0, detAb:10, detRec:25, uniAb:10, uniRec:0, servico:'CS Milange', assinatura:'L. Muiambo' },
    { tested:32, detReact:2, uniReact:2, posConf:2, indet:0, detAb:7,  detRec:30, uniAb:9,  uniRec:5, servico:'CS Milange', assinatura:'L. Muiambo' },
    { tested:27, detReact:1, uniReact:1, posConf:1, indet:0, detAb:5,  detRec:30, uniAb:12, uniRec:0, servico:'CS Milange', assinatura:'L. Muiambo' },
    { tested:31, detReact:2, uniReact:2, posConf:2, indet:0, detAb:8,  detRec:30, uniAb:11, uniRec:0, servico:'CS Milange', assinatura:'L. Muiambo' },
    { tested:29, detReact:1, uniReact:1, posConf:1, indet:0, detAb:7,  detRec:30, uniAb:9,  uniRec:0, servico:'CS Milange', assinatura:'L. Muiambo' },
    { tested:33, detReact:2, uniReact:2, posConf:2, indet:0, detAb:8,  detRec:30, uniAb:8,  uniRec:5, servico:'CS Milange', assinatura:'L. Muiambo' },
    { tested:26, detReact:1, uniReact:1, posConf:1, indet:0, detAb:5,  detRec:30, uniAb:11, uniRec:0, servico:'CS Milange', assinatura:'L. Muiambo' },
  ].forEach((o, i) => { const { r, s } = mkRecord('c-007', weeks[i], o); resultados.push(r); stock.push(s); });

  /* ── c8 — António Fonseca: GREEN ── */
  [
    { tested:36, detReact:4, uniReact:4, posConf:4, indet:0, detAb:48, detRec:0,  uniAb:15, uniRec:0, servico:'CS Gurué', assinatura:'A. Bila' },
    { tested:34, detReact:3, uniReact:3, posConf:3, indet:0, detAb:12, detRec:30, uniAb:11, uniRec:5, servico:'CS Gurué', assinatura:'A. Bila' },
    { tested:38, detReact:4, uniReact:4, posConf:4, indet:0, detAb:8,  detRec:35, uniAb:13, uniRec:5, servico:'CS Gurué', assinatura:'A. Bila' },
    { tested:35, detReact:4, uniReact:4, posConf:4, indet:0, detAb:5,  detRec:40, uniAb:14, uniRec:5, servico:'CS Gurué', assinatura:'A. Bila' },
    { tested:37, detReact:4, uniReact:4, posConf:4, indet:0, detAb:10, detRec:35, uniAb:15, uniRec:0, servico:'CS Gurué', assinatura:'A. Bila' },
    { tested:33, detReact:3, uniReact:3, posConf:3, indet:0, detAb:8,  detRec:35, uniAb:11, uniRec:5, servico:'CS Gurué', assinatura:'A. Bila' },
    { tested:36, detReact:4, uniReact:4, posConf:4, indet:0, detAb:10, detRec:35, uniAb:13, uniRec:5, servico:'CS Gurué', assinatura:'A. Bila' },
    { tested:39, detReact:4, uniReact:4, posConf:4, indet:0, detAb:9,  detRec:35, uniAb:14, uniRec:5, servico:'CS Gurué', assinatura:'A. Bila' },
  ].forEach((o, i) => { const { r, s } = mkRecord('c-008', weeks[i], o); resultados.push(r); stock.push(s); });

  /* ── Entregas de Kits (demo delivery events) ──── */
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0,10); };

  const entregas = [
    // Maria Fernanda (c-001, Manica) — two deliveries
    { id:uuid(), conselheiro_id:'c-001', data_entrega:daysAgo(32), determine_qty:80, unigold_qty:20,
      lote_determine:'DET-2026-01', validade_determine:'2027-06',
      lote_unigold:'UNI-2026-01', validade_unigold:'2027-06',
      notas:'', created_at:new Date().toISOString() },
    { id:uuid(), conselheiro_id:'c-001', data_entrega:daysAgo(5), determine_qty:100, unigold_qty:0,
      lote_determine:'DET-2026-02', validade_determine:'2027-09',
      notas:'Reposição urgente — stock em baixo', created_at:new Date().toISOString() },
    // Ana Lurdes (c-003, Manica) — large volume, senior counselor
    { id:uuid(), conselheiro_id:'c-003', data_entrega:daysAgo(28), determine_qty:100, unigold_qty:20,
      lote_determine:'DET-2026-01', validade_determine:'2027-06',
      lote_unigold:'UNI-2026-01', validade_unigold:'2027-06',
      notas:'', created_at:new Date().toISOString() },
    { id:uuid(), conselheiro_id:'c-003', data_entrega:daysAgo(4), determine_qty:100, unigold_qty:0,
      lote_determine:'DET-2026-02', validade_determine:'2027-09',
      notas:'', created_at:new Date().toISOString() },
    // Esperança (c-005, Zambézia) — small delivery, stock below threshold
    { id:uuid(), conselheiro_id:'c-005', data_entrega:daysAgo(12), determine_qty:25, unigold_qty:5,
      lote_determine:'DET-2026-01', validade_determine:'2027-06',
      notas:'Quantidade limitada disponível no armazém', created_at:new Date().toISOString() },
    // Pedro Alfredo (c-006, Zambézia)
    { id:uuid(), conselheiro_id:'c-006', data_entrega:daysAgo(20), determine_qty:80, unigold_qty:15,
      lote_determine:'DET-2026-01', validade_determine:'2027-06',
      lote_unigold:'UNI-2026-01', validade_unigold:'2027-06',
      notas:'', created_at:new Date().toISOString() },
    // Lurdes Celeste (c-007, Zambézia) — recent delivery
    { id:uuid(), conselheiro_id:'c-007', data_entrega:daysAgo(3), determine_qty:60, unigold_qty:10,
      lote_determine:'DET-2026-02', validade_determine:'2027-09',
      notas:'', created_at:new Date().toISOString() },
  ];

  /* ── Persist ───────────────────────────────────── */
  store.set('conselheiros', conselheiros);
  store.set('resultados',   resultados);
  store.set('stock',        stock);
  store.set('entregas',     entregas);
  store.set('sync_queue',   resultados.map(r => r.id));
  store.set('role',         currentRole || 'distrital');

  showToast('Dados de demonstração carregados com sucesso!', 'success');
  setTimeout(() => { navigate('dashboard'); updateSyncUI(); }, 400);
}
