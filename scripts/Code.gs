/**
 * RISE ICT Monitor — Google Apps Script Backend
 * ══════════════════════════════════════════════
 * Deploy as: Web App
 *   Execute as: Me
 *   Who has access: Anyone (or Anyone within your organisation)
 *
 * After deploy, paste the Web App URL into the app's Sync drawer.
 *
 * Sheet names (auto-created on first write):
 *   Conselheiros | Resultados | Stock | Entregas | SyncLog
 */

const SPREADSHEET_ID = ''; // ← paste your Google Sheets ID here, or leave blank to use the bound sheet
const SHEET_NAMES = {
  conselheiros: 'Conselheiros',
  resultados:   'Resultados',
  stock:        'Stock',
  entregas:     'Entregas',
  log:          'SyncLog',
};

/* ── Headers per sheet ── */
const HEADERS = {
  conselheiros: [
    'id','nome','distrito','unidade_sanitaria','nivel_formacao',
    'telefone','responsavel_clinico','ativo','provincia','created_at','updated_at'
  ],
  resultados: [
    'id','conselheiro_id','periodo_ref','periodo_tipo',
    'total_testados','determine_reactivos','determine_nao_reactivos',
    'unigold_realizados','unigold_reactivos','unigold_nao_reactivos',
    'positivos_confirmados','negativos_finais','indeterminados',
    'determine_consumido_reportado','unigold_consumido_reportado',
    'determine_injustificados','unigold_injustificados',
    'servico_depositario','assinatura',
    'created_at','updated_at','synced_at'
  ],
  stock: [
    'id','conselheiro_id','periodo_ref','periodo_tipo',
    'determine_stock_abertura','determine_recebido','determine_consumido_reportado',
    'determine_expirado_perdido','determine_fecho',
    'unigold_stock_abertura','unigold_recebido','unigold_consumido_reportado',
    'unigold_expirado_perdido','unigold_fecho',
    'created_at','updated_at','synced_at'
  ],
  entregas: [
    'id','conselheiro_id','data_entrega',
    'determine_qty','unigold_qty',
    'lote_determine','validade_determine',
    'lote_unigold','validade_unigold',
    'notas','created_at','synced_at'
  ],
};

/* ════════════════════════════════════════════════
   GET — ping · pull · info
   IMPORTANT: Deploy with "Who has access: Anyone"
   to enable CORS for the pull endpoint.
════════════════════════════════════════════════ */
function doGet(e) {
  const action   = e?.parameter?.action   || '';
  const provincia = e?.parameter?.provincia || null; // optional filter for pull

  /* ── Ping ── */
  if (action === 'ping') {
    return _jsonOut({ status: 'ok', ts: new Date().toISOString() });
  }

  /* ── Sync via GET+base64 — avoids CORS preflight on GAS redirects ── */
  if (action === 'sync') {
    try {
      const d       = e?.parameter?.d || '';
      const decoded = JSON.parse(decodeURIComponent(escape(atob(d))));
      const { action: batchAction, records = [], provincia: prov = '', role: r = '' } = decoded;

      logSync(batchAction, records.length, prov, r);

      let written = 0;
      if      (batchAction === 'sync_conselheiros') written = upsertRows('conselheiros', records);
      else if (batchAction === 'sync_resultados')   written = upsertRows('resultados',   records);
      else if (batchAction === 'sync_stock')        written = upsertRows('stock',        records);
      else if (batchAction === 'sync_entregas')     written = upsertRows('entregas',     records);

      return _jsonOut({ status: 'ok', action: batchAction, written, ts: new Date().toISOString() });
    } catch (err) {
      logError(err);
      return _jsonOut({ status: 'error', message: err.message });
    }
  }

  /* ── Pull — returns all data for provincial/nacional consumption ── */
  if (action === 'pull') {
    try {
      const conselheiros = getSheetRows('conselheiros');
      const resultados   = getSheetRows('resultados');
      const stock        = getSheetRows('stock');
      const entregas     = getSheetRows('entregas');

      // Optional province filter: only return data for matching province
      const cFiltered = provincia
        ? conselheiros.filter(c => c.provincia === provincia)
        : conselheiros;
      const cIds = new Set(cFiltered.map(c => c.id));
      const rFiltered = resultados.filter(r => cIds.has(r.conselheiro_id));
      const sFiltered = stock.filter(s => cIds.has(s.conselheiro_id));
      const eFiltered = entregas.filter(e => cIds.has(e.conselheiro_id));

      logSync('pull', cFiltered.length + rFiltered.length + sFiltered.length + eFiltered.length, provincia || 'ALL', 'pull');

      return _jsonOut({
        status: 'ok',
        conselheiros: cFiltered,
        resultados:   rFiltered,
        stock:        sFiltered,
        entregas:     eFiltered,
        counts: {
          conselheiros: cFiltered.length,
          resultados:   rFiltered.length,
          stock:        sFiltered.length,
          entregas:     eFiltered.length,
        },
        ts: new Date().toISOString()
      });
    } catch (err) {
      logError(err);
      return _jsonOut({ status: 'error', message: err.message });
    }
  }

  /* ── Info (default) ── */
  return _jsonOut({
    app: 'RISE ICT Monitor',
    version: '1.1.0',
    status: 'ready',
    endpoints: ['ping', 'pull', 'sync_conselheiros', 'sync_resultados', 'sync_stock', 'sync_entregas'],
    sheets: Object.values(SHEET_NAMES),
    ts: new Date().toISOString()
  });
}

/* ── JSON output helper ── */
function _jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ════════════════════════════════════════════════
   READ — return all rows from a sheet as objects
════════════════════════════════════════════════ */
function getSheetRows(sheetKey) {
  const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES[sheetKey]);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const headers  = HEADERS[sheetKey];
  const numCols  = headers.length;
  const numRows  = sheet.getLastRow() - 1;
  const values   = sheet.getRange(2, 1, numRows, numCols).getValues();

  return values
    .filter(row => row[0] !== '' && row[0] !== null) // skip empty rows
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let v = row[i];
        if (v === '') v = null;
        // Normalise booleans stored as strings
        if (v === 'TRUE'  || v === true)  v = true;
        if (v === 'FALSE' || v === false) v = false;
        // Normalise numbers stored as strings
        if (typeof v === 'string' && v !== null && !isNaN(v) && v.trim() !== '') v = Number(v);
        obj[h] = v;
      });
      return obj;
    });
}

/* ════════════════════════════════════════════════
   POST — receive sync batch
════════════════════════════════════════════════ */
function doPost(e) {
  try {
    const payload  = JSON.parse(e.postData.contents);
    const action   = payload.action   || '';
    const records  = payload.records  || [];
    const provincia = payload.provincia || '';
    const role      = payload.role     || '';

    logSync(action, records.length, provincia, role);

    let written = 0;
    if (action === 'sync_conselheiros')      written = upsertRows('conselheiros', records);
    else if (action === 'sync_resultados')   written = upsertRows('resultados',   records);
    else if (action === 'sync_stock')        written = upsertRows('stock',        records);
    else if (action === 'sync_entregas')     written = upsertRows('entregas',     records);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok', action, written, ts: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    logError(err);
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/* ════════════════════════════════════════════════
   UPSERT — insert or update rows by id
════════════════════════════════════════════════ */
function upsertRows(sheetKey, records) {
  if (!records || !records.length) return 0;
  const sheet   = getOrCreateSheet(SHEET_NAMES[sheetKey], HEADERS[sheetKey]);
  const headers = HEADERS[sheetKey];
  const now     = new Date().toISOString();

  // Build ID → row index map
  const idCol   = 1; // column A = id (1-indexed)
  const lastRow = sheet.getLastRow();
  const idMap   = {};
  if (lastRow > 1) {
    const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
    ids.forEach((row, i) => { if (row[0]) idMap[row[0]] = i + 2; }); // +2: 1-indexed + header
  }

  let written = 0;
  records.forEach(rec => {
    const rowData = headers.map(h => {
      if (h === 'synced_at') return now;
      const v = rec[h];
      if (v === null || v === undefined) return '';
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      return v;
    });

    if (idMap[rec.id]) {
      // Update existing row
      sheet.getRange(idMap[rec.id], 1, 1, headers.length).setValues([rowData]);
    } else {
      // Append new row
      sheet.appendRow(rowData);
      idMap[rec.id] = sheet.getLastRow();
    }
    written++;
  });

  return written;
}

/* ════════════════════════════════════════════════
   SHEET HELPERS
════════════════════════════════════════════════ */
function getSpreadsheet() {
  return SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet(name, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Write header row
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    // Style header
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setBackground('#1B3A6B').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

/* ════════════════════════════════════════════════
   LOGGING
════════════════════════════════════════════════ */
function logSync(action, count, provincia, role) {
  try {
    const sheet = getOrCreateSheet(SHEET_NAMES.log, ['ts','action','count','provincia','role']);
    sheet.appendRow([new Date().toISOString(), action, count, provincia, role]);
  } catch (_) { /* silent fail */ }
}

function logError(err) {
  try {
    const ss    = getSpreadsheet();
    let sheet   = ss.getSheetByName('ErrorLog');
    if (!sheet) sheet = ss.insertSheet('ErrorLog');
    sheet.appendRow([new Date().toISOString(), err.message, err.stack || '']);
  } catch (_) { /* silent fail */ }
}

/* ════════════════════════════════════════════════
   OPTIONAL: Named trigger to clean up old logs
   Set up via: Edit → Current project's triggers
   Run: cleanLogs, Time-driven, Week timer
════════════════════════════════════════════════ */
function cleanLogs() {
  try {
    const ss    = getSpreadsheet();
    const log   = ss.getSheetByName(SHEET_NAMES.log);
    if (!log) return;
    const cutoff  = new Date();
    cutoff.setDate(cutoff.getDate() - 90); // keep 90 days
    const lastRow = log.getLastRow();
    if (lastRow <= 1) return;
    const dates = log.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = dates.length - 1; i >= 0; i--) {
      if (new Date(dates[i][0]) < cutoff) {
        log.deleteRow(i + 2);
      }
    }
  } catch (_) { /* silent fail */ }
}
