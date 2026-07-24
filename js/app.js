/* ══════════════════════════════════════════════════
   APP  — global state, navigation, UI shell helpers
══════════════════════════════════════════════════ */

/* ── Global state ──────────────────────────────── */
let currentScreen   = 'dashboard';
let currentRole     = null;
let currentProvincia= null;
let provincialFilter= 'Ambas';
let dashboardPeriod     = null;       // null = current period
let dashboardPeriodTipo = 'semanal';  // 'semanal' | 'mensal'
let fichaConselheiro    = null;
let alertPanelOpen      = true;
let _registarEditId     = null;

/* ── Nav configuration ─────────────────────────── */
const NAV = {
  distrital: [
    { id:'dashboard',    icon:'🏠', label:'Dashboard' },
    { id:'conselheiros', icon:'👤', label:'Conselheiros' },
    { id:'ficha',        icon:'📈', label:'Ficha de Fiabilidade' },
    { id:'registar',     icon:'✏️',  label:'Registar Resultados' },
    { id:'entregas',     icon:'📦', label:'Entregas de Kits' },
    { id:'historico',    icon:'📋', label:'Histórico' },
    { id:'exportar',     icon:'📁', label:'Exportar / Importar' },
  ],
  provincial: [
    { id:'dashboard',    icon:'🏠', label:'Dashboard Provincial' },
    { id:'scorecard',    icon:'📊', label:'Scorecard Conselheiros' },
    { id:'relatorio',    icon:'📄', label:'Relatório por Período' },
    { id:'exportar',     icon:'📁', label:'Exportar' },
  ],
  nacional: [
    { id:'dashboard',    icon:'🌍', label:'Dashboard Nacional' },
    { id:'scorecard',    icon:'📊', label:'Scorecard Nacional' },
    { id:'relatorio',    icon:'📄', label:'Relatório Nacional' },
    { id:'exportar',     icon:'📁', label:'Exportar Dados' },
  ],
};

/* ── Period helpers (used by both dashboard & registar) ── */
function activePeriod() {
  if (dashboardPeriod) return dashboardPeriod;
  return dashboardPeriodTipo === 'mensal' ? currentMonthRef() : currentWeekRef();
}

function isActivePeriodCurrent() {
  if (!dashboardPeriod) return true;
  const ref = dashboardPeriodTipo === 'mensal' ? currentMonthRef() : currentWeekRef();
  return dashboardPeriod === ref;
}

/* ══════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════ */
function init() {
  initVersionFooter();
  initHamburger();
  updateOnlineStatus();

  currentRole     = store.get('role');
  currentProvincia= store.get('provincia');

  if (!currentRole || (currentRole === 'distrital' && !currentProvincia)) {
    document.getElementById('role-selector').classList.remove('hidden');
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('main').style.display    = 'none';
    if (currentRole === 'distrital' && !currentProvincia) goToProvinceStep();
  } else {
    _enterApp();
  }
}

/* ── Role selector flow ────────────────────────── */
function goToProvinceStep() {
  document.getElementById('rs-step1').style.display = 'none';
  document.getElementById('rs-step2').style.display = '';
}

function backToStep1() {
  document.getElementById('rs-step2').style.display = 'none';
  document.getElementById('rs-step1').style.display = '';
}

function selectRole(role, provincia) {
  store.set('role', role);
  if (provincia) store.set('provincia', provincia);
  currentRole      = role;
  currentProvincia = provincia;
  _enterApp();
}

function _enterApp() {
  document.getElementById('role-selector').classList.add('hidden');
  document.getElementById('sidebar').style.display = '';
  document.getElementById('main').style.display    = '';
  renderNav();
  updateTopbarContext();
  initVersionFooter();
  initHamburger();
  updateOnlineStatus();
  navigate('dashboard');
  updateSyncUI();
  startAutoSync();
}

function resetRole() {
  store.remove('role');
  store.remove('provincia');
  location.reload();
}

/* ══════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════ */
function renderNav() {
  const items = NAV[currentRole] || [];
  const nav   = document.getElementById('sidebar-nav');

  const provBadge = currentRole === 'distrital' && currentProvincia
    ? `<div style="margin:8px 16px 0;padding:6px 10px;border-radius:6px;background:rgba(0,166,147,.15);
                   border:1px solid rgba(0,166,147,.3);color:var(--rise-teal);font-size:11px;
                   font-weight:600;text-align:center">🗺️ ${currentProvincia}</div>`
    : currentRole === 'provincial'
      ? `<div style="margin:8px 16px 0;padding:6px 10px;border-radius:6px;background:rgba(255,255,255,.08);
                     color:rgba(255,255,255,.5);font-size:11px;font-weight:600;text-align:center">📊 Vista Provincial</div>`
    : currentRole === 'nacional'
      ? `<div style="margin:8px 16px 0;padding:6px 10px;border-radius:6px;background:rgba(255,255,255,.08);
                     color:rgba(255,255,255,.6);font-size:11px;font-weight:600;text-align:center">🌍 Manica + Zambézia</div>`
      : '';

  const roleLabel = currentRole === 'distrital'  ? 'Supervisor Distrital'
                  : currentRole === 'provincial'  ? 'Supervisor Provincial'
                  : currentRole === 'nacional'    ? 'Assessor Técnico Nacional'
                  : '';

  nav.innerHTML = `
    <div class="section-label">${roleLabel}</div>
    ${provBadge}
  `;

  items.forEach(item => {
    const a = document.createElement('a');
    a.href          = '#';
    a.dataset.screen= item.id;
    a.innerHTML     = `<span>${item.icon}</span><span>${item.label}</span>`;
    a.addEventListener('click', e => {
      e.preventDefault();
      navigate(item.id);
      if (window.innerWidth < 768) toggleSidebar();
    });
    nav.appendChild(a);
  });

  // Mobile bottom tabs
  const mobile = document.getElementById('mobile-tabs-inner');
  mobile.innerHTML = items.slice(0, 5).map(item =>
    `<a href="#" data-screen="${item.id}" onclick="navigate('${item.id}');return false;">
       <span class="tab-icon">${item.icon}</span>
       <span>${item.label.split(' ')[0]}</span>
     </a>`
  ).join('');
}

function navigate(screen) {
  currentScreen = screen;
  const items = NAV[currentRole] || [];
  const found = items.find(i => i.id === screen);
  document.getElementById('topbar-title').textContent = found ? found.label : screen;

  document.querySelectorAll('#sidebar-nav a').forEach(a =>
    a.classList.toggle('active', a.dataset.screen === screen));
  document.querySelectorAll('#mobile-tabs-inner a').forEach(a =>
    a.classList.toggle('active', a.dataset.screen === screen));

  const content = document.getElementById('content');
  content.innerHTML = '';

  try {
    switch (screen) {
      case 'dashboard':    renderDashboard();      break;
      case 'conselheiros': renderConselheiros();   break;
      case 'ficha':        renderFicha();          break;
      case 'registar':     renderRegistar(null);   break;
      case 'entregas':     renderEntregas();       break;
      case 'historico':    renderHistorico();      break;
      case 'exportar':     renderExportar();       break;
      case 'scorecard':    renderScorecard();      break;
      case 'relatorio':    renderRelatorio();      break;
      default:
        content.innerHTML = emptyStateHTML('🚧', 'Ecrã em desenvolvimento', 'Este módulo estará disponível em breve.');
    }
  } catch (err) {
    console.error('[navigate]', screen, err);
    content.innerHTML = errorStateHTML(err);
  }
}

/* ── Topbar context (score pills + sync status) ── */
function updateTopbarContext() {
  const right  = document.querySelector('#topbar .right');
  if (!right) return;

  const queue     = store.get('sync_queue') || [];
  const lastSync  = store.get('last_sync');
  const dotClass  = queue.length > 0 ? 'orange' : 'green';
  const dotLabel  = queue.length > 0 ? `${queue.length} pendente(s)` : 'Sincronizado';

  let pills = '';
  if (currentRole === 'distrital' || currentRole === 'provincial' || currentRole === 'nacional') {
    const allR = store.get('resultados')    || [];
    const allS = store.get('stock')         || [];
    // distrital: scope to own province; provincial/nacional: all
    const cIds = new Set((store.get('conselheiros') || [])
      .filter(c => c.ativo && (currentRole !== 'distrital' || !currentProvincia || c.provincia === currentProvincia))
      .map(c => c.id));
    const period = currentRole === 'distrital' ? activePeriod() : (provPeriod || (provPeriodTipo === 'mensal' ? currentMonthRef() : currentWeekRef()));
    const recs = allR.filter(r => cIds.has(r.conselheiro_id) && r.periodo_ref === period);
    const scores = recs.map(r => {
      const s = allS.find(x => x.conselheiro_id === r.conselheiro_id && x.periodo_ref === r.periodo_ref) || {};
      return computeReliability(r, s).score_global;
    });
    const g  = scores.filter(s => s === 'GREEN').length;
    const y  = scores.filter(s => s === 'YELLOW').length;
    const rd = scores.filter(s => s === 'RED').length;
    if (recs.length > 0) {
      pills = `<div class="topbar-pills">
        ${g  > 0 ? `<span class="topbar-pill green">🟢 ${g}</span>`  : ''}
        ${y  > 0 ? `<span class="topbar-pill yellow">🟡 ${y}</span>` : ''}
        ${rd > 0 ? `<span class="topbar-pill red">🔴 ${rd}</span>`   : ''}
      </div>`;
    }
  }

  right.innerHTML = `
    ${pills}
    <span id="sync-status" onclick="openSyncDrawer()" style="cursor:pointer;display:flex;align-items:center;gap:4px" title="Ver estado de sincronização">
      <span class="sync-dot ${dotClass}"></span>
      <span class="sync-label">${dotLabel}</span>
    </span>
    <span style="font-size:11px;color:var(--rise-muted)">
      ${lastSync ? 'Sync: ' + new Date(lastSync).toLocaleTimeString('pt') : ''}
    </span>
  `;
}

function updateSyncUI() { updateTopbarContext(); }

/* ── Sidebar hamburger (mobile) ────────────────── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function initHamburger() {
  const ham = document.getElementById('hamburger');
  if (!ham) return;
  const show = () => { ham.style.display = window.innerWidth < 768 ? 'block' : 'none'; };
  show();
  window.addEventListener('resize', show);
}

/* ── Online / Offline ──────────────────────────── */
function updateOnlineStatus() {
  const online  = navigator.onLine;
  const dot     = document.getElementById('online-dot');
  const side    = document.getElementById('sidebar-online');
  const syncBtn = document.getElementById('sync-btn');

  if (dot)     dot.classList.toggle('offline', !online);
  if (side)    { side.textContent = online ? '🟢 Online' : '🔴 Offline'; side.style.color = online ? '' : 'var(--status-red)'; }
  if (syncBtn) syncBtn.disabled = !online || !(store.get('config')?.apps_script_url || CONFIG.APPS_SCRIPT_URL);

  if (!online) {
    showToast('Sem ligação à internet — dados guardados localmente.', 'error');
  } else {
    const queue = store.get('sync_queue') || [];
    const url   = store.get('config')?.apps_script_url || CONFIG.APPS_SCRIPT_URL;
    if (queue.length && url) triggerManualSync();
  }
}

window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

/* ── Version footer ────────────────────────────── */
function initVersionFooter() {
  const el = document.getElementById('sidebar-version');
  if (!el) return;
  el.textContent = `v${CONFIG.APP_VERSION}`;
  el.title = `RISE ICT Monitor v${CONFIG.APP_VERSION} · PEPFAR/USAID RISE`;
}

/* ══════════════════════════════════════════════════
   LOADING / TOAST / MODAL / CONFIRM UTILITIES
══════════════════════════════════════════════════ */
function showLoading(msg) {
  const el  = document.getElementById('loading-overlay');
  const msgEl = document.getElementById('loading-msg');
  if (msgEl) msgEl.textContent = msg || 'A carregar…';
  if (el) el.classList.add('show');
}
function hideLoading() {
  const el = document.getElementById('loading-overlay');
  if (el) el.classList.remove('show');
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:${type === 'success' ? '#166534' : '#991B1B'};color:#fff;
    padding:10px 20px;border-radius:8px;font-size:13px;font-weight:500;
    z-index:500;box-shadow:0 4px 16px rgba(0,0,0,.2);animation:fadeIn .2s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showModal(html) {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-overlay" onclick="overlayClose(event)">
      <div class="modal">${html}</div>
    </div>`;
}
function closeModal() {
  document.getElementById('modal-container').innerHTML = '';
}
function overlayClose(e) {
  if (e.target.classList.contains('modal-overlay')) closeModal();
}

function showConfirm(title, msg, onConfirm) {
  showModal(`
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="close-btn" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <p style="color:var(--rise-muted);margin:0">${msg}</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-danger" id="confirm-ok">Confirmar</button>
    </div>
  `);
  document.getElementById('confirm-ok').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
}

/* ── Empty / Error state helpers ───────────────── */
function emptyStateHTML(icon, title, desc, actionHTML) {
  return `<div class="card"><div class="empty-state">
    <div class="icon">${icon}</div>
    <h3>${escHtml(title)}</h3>
    <p>${escHtml(desc)}</p>
    ${actionHTML || ''}
  </div></div>`;
}

function errorStateHTML(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return `<div class="card"><div class="error-state">
    <div class="icon">⚠️</div>
    <h3>Erro ao carregar o ecrã</h3>
    <p>${escHtml(msg)}</p>
    <button class="btn btn-secondary" onclick="navigate(currentScreen)">↺ Tentar novamente</button>
  </div></div>`;
}

function skeletonCard(lines) {
  const bars = Array.from({ length: lines || 3 }, (_, i) =>
    `<div class="skeleton" style="height:14px;width:${i === 0 ? '60%' : i % 2 ? '90%' : '75%'};margin-bottom:10px"></div>`
  ).join('');
  return `<div class="card">${bars}</div>`;
}

/* ── Boot ──────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', init);
