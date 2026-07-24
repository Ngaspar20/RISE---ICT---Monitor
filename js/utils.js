/* ══════════════════════════════════════════════════
   UTILS  — shared helper functions
══════════════════════════════════════════════════ */

/* UUID v4 */
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* HTML entity escape — always use before inserting user data into innerHTML */
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* Format ISO datetime → localised short date */
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt', { day:'2-digit', month:'2-digit', year:'numeric' });
}

/* ISO week reference: "2026-W23" */
function getWeekRef(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const wk = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(wk).padStart(2, '0')}`;
}

/* Current references */
function currentWeekRef()  { return getWeekRef(new Date()); }
function currentMonthRef() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* Period navigation */
function shiftWeek(ref, delta) {
  const [y, w] = ref.split('-W').map(Number);
  const d = new Date(y, 0, 1 + (w - 1) * 7);
  d.setDate(d.getDate() + delta * 7);
  return getWeekRef(d);
}

function shiftMonth(ref, delta) {
  const [y, m] = ref.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* Human-readable period label */
function periodLabel(ref) {
  if (!ref) return '';
  if (ref.includes('-W')) {
    const [y, w] = ref.split('-W');
    return `Semana ${w}, ${y}`;
  }
  if (ref.match(/^\d{4}-\d{2}$/)) {
    const [y, m] = ref.split('-');
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${months[parseInt(m) - 1]} ${y}`;
  }
  return ref;
}

/* Build array of N period refs ending at endRef */
function buildTrendPeriods(endRef, tipo, n) {
  const periods = [];
  let cur = endRef;
  for (let i = 0; i < n; i++) {
    periods.unshift(cur);
    cur = tipo === 'mensal' ? shiftMonth(cur, -1) : shiftWeek(cur, -1);
  }
  return periods;
}

/* Score → badge CSS class */
function scoreBadge(score) {
  if (score === 'GREEN')  return 'badge-green';
  if (score === 'YELLOW') return 'badge-yellow';
  if (score === 'RED')    return 'badge-red';
  return 'badge-gray';
}

/* Trigger file download in browser */
function downloadFile(content, filename, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
}

/* Read number from a form input, default 0 */
function n(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return parseInt(el.value) || 0;
}

/* ── Period date-range helpers ───────────────────── */

/* Returns {start:Date, end:Date} for a period reference string */
function getPeriodDateRange(ref) {
  if (!ref) return null;
  if (ref.includes('-W')) {
    const [y, w] = ref.split('-W').map(Number);
    const jan4 = new Date(y, 0, 4);
    const dow   = jan4.getDay() || 7;
    const startW1 = new Date(jan4);
    startW1.setDate(jan4.getDate() - dow + 1);
    const start = new Date(startW1);
    start.setDate(start.getDate() + (w - 1) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }
  const [y, m] = ref.split('-').map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
}

/* Returns true if a YYYY-MM-DD date string falls within a period reference */
function dateInPeriod(dateStr, periodRef) {
  if (!dateStr || !periodRef) return false;
  const d = new Date(dateStr + 'T12:00:00'); // noon avoids DST edge cases
  const r = getPeriodDateRange(periodRef);
  return r ? d >= r.start && d <= r.end : false;
}

/* Returns the reference for the period immediately before the given one */
function prevPeriodRef(ref, tipo) {
  if (!ref) return null;
  return tipo === 'mensal' ? shiftMonth(ref, -1) : shiftWeek(ref, -1);
}
