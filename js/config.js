/* ══════════════════════════════════════════════════
   CONFIG  — RISE ICT Monitor
   Central configuration. Edit thresholds here only.
══════════════════════════════════════════════════ */
const CONFIG = {
  APP_VERSION: '1.1.0',
  APP_NAME: 'RISE ICT Monitor',

  // Set after Google Apps Script deployment
  APPS_SCRIPT_URL: '',

  // PEPFAR MER thresholds
  PEPFAR_YIELD_TARGET:    0.05,   // 5%  – minimum positivity yield
  PEPFAR_INDET_MAX:       0.02,   // 2%  – maximum indeterminate rate
  PEPFAR_ADHERENCE_MIN:   0.95,   // 95% – minimum algorithm adherence

  // Stock variance thresholds
  STOCK_VARIANCE_GREEN:   0.05,   // ±5%  → GREEN
  STOCK_VARIANCE_RED:     0.15,   // ±15% → RED (anything between 5-15% is YELLOW)

  // Stock alert thresholds
  STOCK_ALERT_UNITS: 30,    // units below which low-stock alert fires on Entregas screen
  STOCK_ALERT_DAYS:  14,    // day-supply reserve threshold (for future daily-rate calculation)

  // Sync interval
  SYNC_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes

  // Geography
  PROVINCES: ['Manica', 'Zambézia'],
  DISTRICTS: {
    'Manica':   ['Chimoio','Manica','Gondola','Sussundenga','Mossurize',
                 'Báruè','Tambara','Macossa','Guro','Tsangano'],
    'Zambézia': ['Quelimane','Nicoadala','Mocuba','Milange','Gurué',
                 'Morrumbala','Pebane','Alto Molócuè','Lugela','Ile',
                 'Namacurra','Inhassunge','Maganja da Costa','Chinde',
                 'Mopeia','Luabo']
  }
};
