/* ══════════════════════════════════════════════════
   RELIABILITY SCORING ENGINE
   Implements Section 10 of the RISE ICT Monitor spec.

   computeReliability(resultado, stock) → ScoreResult

   ScoreResult = {
     score_global        : 'GREEN' | 'YELLOW' | 'RED'
     score_consistencia  : 'GREEN' | 'YELLOW' | 'RED'
     score_aderencia     : 'GREEN' | 'YELLOW' | 'RED'
     score_stock         : 'GREEN' | 'YELLOW' | 'RED'
     score_yield         : 'GREEN' | 'YELLOW' | 'RED'
     consistFlags        : Flag[]
     stockFlags          : Flag[]
     indicators          : { yieldPct, adherPct, indetPct, detVarPct, uniVarPct }
     checks              : { c01…c09 }
   }

   C08: Determine Injustificados > 5% → MEDIUM; > 15% → HIGH
   C09: Unigold Injustificados   > 5% → MEDIUM; > 15% → HIGH

   Flag = { id: string, label: string, severity: 'HIGH' | 'MEDIUM' | 'LOW' }
══════════════════════════════════════════════════ */

function computeReliability(r, s) {
  s = s || {};

  /* ── Unpack resultado fields ── */
  const total   = r.total_testados           || 0;
  const detR    = r.determine_reactivos      || 0;
  const detNR   = r.determine_nao_reactivos  || 0;
  const uniReal = r.unigold_realizados       || 0;
  const uniR    = r.unigold_reactivos        || 0;
  const uniNR   = r.unigold_nao_reactivos    || 0;
  const pos     = r.positivos_confirmados    || 0;
  const neg     = r.negativos_finais         || 0;
  const indet   = r.indeterminados           || 0;
  const detInj  = r.determine_injustificados || 0;
  const uniInj  = r.unigold_injustificados   || 0;

  /* ── Unpack stock fields ── */
  const detAb   = s.determine_stock_abertura      || 0;
  const detRec  = s.determine_recebido            || 0;
  const detCons = s.determine_consumido_reportado || r.determine_consumido_reportado || 0;
  const detFech = s.determine_fecho               || 0;
  const detExp  = s.determine_expirado_perdido    || 0;
  const uniAb   = s.unigold_stock_abertura        || 0;
  const uniRec  = s.unigold_recebido              || 0;
  const uniCons = s.unigold_consumido_reportado   || r.unigold_consumido_reportado || 0;
  const uniFech = s.unigold_fecho                 || 0;
  const uniExp  = s.unigold_expirado_perdido      || 0;

  /* ════════════════════════════════════════════════
     DIMENSION 1 — Consistência Interna (C01–C07)
  ════════════════════════════════════════════════ */
  const c01 = (detR + detNR === total);
  const c02 = (uniReal <= detR);
  const c03 = (pos <= uniR);
  const c04 = (pos + neg + indet === total);
  const c05 = (detR === 0) || (uniReal >= detR * CONFIG.PEPFAR_ADHERENCE_MIN);
  const c06 = (total === 0) || (indet / total <= CONFIG.PEPFAR_INDET_MAX);
  const c07 = (total === 0) || (pos / total >= CONFIG.PEPFAR_YIELD_TARGET);

  // C08: Determine Injustificados (from Mapa de Consumo)
  const detConsSrc = s.determine_consumido_reportado || r.determine_consumido_reportado || 0;
  const detInjPct  = detConsSrc > 0 ? detInj / detConsSrc : 0;
  const c08 = detInj === 0 || detInjPct <= 0.05;

  // C09: Unigold Injustificados (from Mapa de Consumo)
  const uniConsSrc = s.unigold_consumido_reportado || r.unigold_consumido_reportado || 0;
  const uniInjPct  = uniConsSrc > 0 ? uniInj / uniConsSrc : 0;
  const c09 = uniInj === 0 || uniInjPct <= 0.05;

  const consistFlags = [];
  if (!c01) consistFlags.push({ id:'C01', label:'Det. reactivos + não reactivos ≠ total', severity:'HIGH' });
  if (!c02) consistFlags.push({ id:'C02', label:'Unigold realizados > Det. reactivos', severity:'HIGH' });
  if (!c03) consistFlags.push({ id:'C03', label:'Positivos > Unigold reactivos', severity:'HIGH' });
  if (!c04) consistFlags.push({ id:'C04', label:'Positivos + negativos + indet ≠ total', severity:'HIGH' });
  if (!c05) consistFlags.push({ id:'C05', label:`Aderência algoritmo ${detR > 0 ? (uniReal/detR*100).toFixed(1) : 0}% < 95%`, severity:'MEDIUM' });
  if (!c06) consistFlags.push({ id:'C06', label:`Taxa indeterminados ${total > 0 ? (indet/total*100).toFixed(1) : 0}% > 2%`, severity:'MEDIUM' });
  if (!c07) consistFlags.push({ id:'C07', label:`Yield ${total > 0 ? (pos/total*100).toFixed(1) : 0}% < meta 5%`, severity:'LOW' });
  if (!c08) {
    const pct = (detInjPct * 100).toFixed(1);
    consistFlags.push({ id:'C08',
      label: `Det. injustificados ${pct}% do consumo (> ${detInjPct > 0.15 ? '15' : '5'}%)`,
      severity: detInjPct > 0.15 ? 'HIGH' : 'MEDIUM' });
  }
  if (!c09) {
    const pct = (uniInjPct * 100).toFixed(1);
    consistFlags.push({ id:'C09',
      label: `Uni. injustificados ${pct}% do consumo (> ${uniInjPct > 0.15 ? '15' : '5'}%)`,
      severity: uniInjPct > 0.15 ? 'HIGH' : 'MEDIUM' });
  }

  const hasHighC = consistFlags.some(f => f.severity === 'HIGH');
  const medC     = consistFlags.filter(f => f.severity === 'MEDIUM').length;
  const score_consistencia = hasHighC ? 'RED' : medC >= 1 ? 'YELLOW' : 'GREEN';

  /* ════════════════════════════════════════════════
     DIMENSION 2 — Aderência ao Algoritmo
  ════════════════════════════════════════════════ */
  const adher = detR > 0 ? uniReal / detR : 1;
  const score_aderencia = adher < 0.80 ? 'RED'
    : adher < CONFIG.PEPFAR_ADHERENCE_MIN ? 'YELLOW'
    : 'GREEN';

  /* ════════════════════════════════════════════════
     DIMENSION 3 — Reconciliação de Stock (S01–S08)
  ════════════════════════════════════════════════ */
  const stockFlags = [];

  if (detAb + detRec - detCons - detExp !== detFech)
    stockFlags.push({ id:'S01', label:'Balanço Determine não fecha', severity:'HIGH' });
  if (uniAb + uniRec - uniCons - uniExp !== uniFech)
    stockFlags.push({ id:'S02', label:'Balanço Unigold não fecha', severity:'HIGH' });
  if (detFech < 0)
    stockFlags.push({ id:'S07', label:'Stock Determine negativo', severity:'HIGH' });
  if (uniFech < 0)
    stockFlags.push({ id:'S08', label:'Stock Unigold negativo', severity:'HIGH' });

  const dv = total > 0 ? Math.abs(detCons - total) / total : 0;
  const uv = detR  > 0 ? Math.abs(uniCons - detR)  / detR  : 0;

  if (dv > CONFIG.STOCK_VARIANCE_RED)
    stockFlags.push({ id:'S04', label:`Variância Det. ${(dv*100).toFixed(1)}% > 15%`, severity:'HIGH' });
  else if (dv > CONFIG.STOCK_VARIANCE_GREEN)
    stockFlags.push({ id:'S03', label:`Variância Det. ${(dv*100).toFixed(1)}% > 5%`, severity:'MEDIUM' });

  if (uv > CONFIG.STOCK_VARIANCE_RED)
    stockFlags.push({ id:'S06', label:`Variância Uni. ${(uv*100).toFixed(1)}% > 15%`, severity:'HIGH' });
  else if (uv > CONFIG.STOCK_VARIANCE_GREEN)
    stockFlags.push({ id:'S05', label:`Variância Uni. ${(uv*100).toFixed(1)}% > 5%`, severity:'MEDIUM' });

  const hasHighS = stockFlags.some(f => f.severity === 'HIGH');
  const medS     = stockFlags.filter(f => f.severity === 'MEDIUM').length;
  const score_stock = hasHighS ? 'RED' : medS >= 1 ? 'YELLOW' : 'GREEN';

  /* ════════════════════════════════════════════════
     DIMENSION 4 — Plausibilidade do Yield
  ════════════════════════════════════════════════ */
  const yieldVal = total > 0 ? pos / total : null;
  const score_yield = yieldVal === null ? 'GREEN'
    : (yieldVal === 0 && total >= 20) ? 'RED'   // zero yield with meaningful volume
    : yieldVal < CONFIG.PEPFAR_YIELD_TARGET ? 'YELLOW'
    : 'GREEN';

  /* ════════════════════════════════════════════════
     GLOBAL SCORE
  ════════════════════════════════════════════════ */
  const dims = [score_consistencia, score_aderencia, score_stock, score_yield];
  const score_global = dims.includes('RED')    ? 'RED'
    : dims.filter(d => d === 'YELLOW').length >= 1 ? 'YELLOW'
    : 'GREEN';

  /* ── Computed indicators (for display) ── */
  const yieldPct  = total > 0 ? +(pos/total*100).toFixed(1)             : null;
  const adherPct  = detR  > 0 ? +(uniReal/detR*100).toFixed(1)          : null;
  const indetPct  = total > 0 ? +(indet/total*100).toFixed(1)           : null;
  const detVarPct = (total > 0 && detCons > 0) ? +((detCons-total)/total*100).toFixed(1) : null;
  const uniVarPct = (detR  > 0 && uniCons > 0) ? +((uniCons-detR)/detR*100).toFixed(1)  : null;

  return {
    score_global, score_consistencia, score_aderencia, score_stock, score_yield,
    consistFlags, stockFlags,
    indicators: { yieldPct, adherPct, indetPct, detVarPct, uniVarPct },
    checks: { c01, c02, c03, c04, c05, c06, c07, c08, c09 }
  };
}
