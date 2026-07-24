/* ══════════════════════════════════════════════════
   SYNC  — Google Apps Script bridge
   Manages the offline-first sync queue, the sync
   drawer UI, and the background auto-sync timer.
══════════════════════════════════════════════════ */

/* ── Open / Close drawer ───────────────────────── */
function openSyncDrawer() {
  const queue        = store.get('sync_queue')   || [];
  const resultados   = store.get('resultados')   || [];
  const conselheiros = store.get('conselheiros') || [];
  const lastSync     = store.get('last_sync');
  const cMap = Object.fromEntries(conselheiros.map(c => [c.id, c]));

  const pendR    = resultados.filter(r => queue.includes(r.id));
  const savedUrl = store.get('config')?.apps_script_url || CONFIG.APPS_SCRIPT_URL || '';
  const hasUrl   = !!savedUrl;

  const body = document.getElementById('sync-drawer-body');
  body.innerHTML = `
    <!-- Status row -->
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:600;color:var(--rise-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Estado de Sincronização</div>
      <div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--rise-light);border-radius:8px">
        <span class="sync-dot ${queue.length > 0 ? 'orange' : 'green'}" style="width:12px;height:12px;flex-shrink:0"></span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${queue.length > 0 ? queue.length + ' registo(s) pendentes' : 'Tudo sincronizado'}</div>
          <div style="font-size:11px;color:var(--rise-muted);margin-top:1px">
            ${lastSync ? 'Última sync: ' + new Date(lastSync).toLocaleString('pt') : 'Nunca sincronizado'}
          </div>
        </div>
      </div>
      <div id="sync-status-msg" style="font-size:12px;margin-top:6px;min-height:16px"></div>
    </div>

    <!-- Sync button -->
    <div style="margin-bottom:8px">
      <button id="sync-btn" class="btn btn-primary" style="width:100%"
        onclick="triggerManualSync()" ${!hasUrl ? 'disabled title="Configure o URL primeiro"' : ''}>
        🔄 Sincronizar Agora
      </button>
    </div>
    <div style="margin-bottom:16px">
      <button class="btn btn-secondary" style="width:100%;font-size:12px"
        onclick="requeueAll()" ${!hasUrl ? 'disabled' : ''}>
        ↺ Re-enviar Todos os Dados Locais
      </button>
    </div>

    <!-- Pending records -->
    ${pendR.length > 0 ? `
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:600;color:var(--rise-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">
        Registos Pendentes (${pendR.length})
      </div>
      <div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
        ${pendR.map(r => {
          const c = cMap[r.conselheiro_id] || {};
          return `<div style="padding:9px 12px;border:1px solid #E2E8F0;border-radius:6px;font-size:12px">
            <div style="font-weight:600;color:var(--rise-navy)">${escHtml(c.nome || '—')}</div>
            <div style="color:var(--rise-muted);margin-top:2px">${r.periodo_ref} · ${r.total_testados} testados</div>
          </div>`;
        }).join('')}
      </div>
    </div>` : queue.length === 0 ? `
    <div style="text-align:center;padding:16px;color:var(--rise-muted);font-size:13px;margin-bottom:12px">
      ✅ Todos os registos estão sincronizados.
    </div>` : ''}

    <hr style="border:none;border-top:1px solid #E2E8F0;margin:16px 0">

    <!-- URL configuration -->
    <div>
      <div style="font-size:11px;font-weight:600;color:var(--rise-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">⚙️ Configuração Google Sheets</div>
      <div style="font-size:12px;color:var(--rise-muted);margin-bottom:8px">
        Cole o URL do Google Apps Script Web App para activar a sincronização.
      </div>
      <input id="apps-script-url-input" type="url"
        placeholder="https://script.google.com/macros/s/..."
        value="${escHtml(savedUrl)}"
        style="width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #CBD5E0;border-radius:7px;font-size:12px;font-family:inherit;margin-bottom:8px;color:var(--rise-text)"
      />
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <button class="btn btn-secondary" style="flex:1;font-size:13px" onclick="saveAppsScriptUrl()">💾 Guardar</button>
        <button id="test-conn-btn" class="btn btn-secondary" style="flex:1;font-size:13px"
          onclick="testAppsScriptConnection()" ${!hasUrl ? 'disabled' : ''}>🔌 Testar Ligação</button>
      </div>
      <div id="test-conn-msg" style="font-size:12px;min-height:16px;margin-bottom:6px"></div>
      ${hasUrl ? `
      <div style="padding:8px 10px;background:#F0FDF4;border-radius:6px;font-size:11px;color:#16A34A;display:flex;align-items:center;gap:6px">
        <span>✅</span><span>URL configurado. Sincronização automática activa a cada 5 min quando online.</span>
      </div>` : `
      <div style="padding:8px 10px;background:#FFFBEB;border-radius:6px;font-size:11px;color:#92400E;display:flex;align-items:center;gap:6px">
        <span>⚠️</span><span>Sem URL configurado — dados guardados localmente.</span>
      </div>`}
    </div>

    ${(currentRole === 'provincial' || currentRole === 'nacional') ? `
    <hr style="border:none;border-top:1px solid #E2E8F0;margin:16px 0">

    <!-- Pull section — read-only roles -->
    <div>
      <div style="font-size:11px;font-weight:600;color:var(--rise-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">
        📥 ${currentRole === 'nacional' ? 'Actualizar Dados Nacionais' : 'Actualizar Dados Provinciais'}
      </div>
      <div style="font-size:12px;color:var(--rise-muted);margin-bottom:8px">
        Carrega todos os registos do Google Sheets para este dispositivo.
        ${currentRole === 'nacional' ? 'Inclui todas as províncias (Manica e Zambézia).' : ''}
      </div>
      <button id="pull-btn" class="btn btn-secondary" style="width:100%;margin-bottom:6px"
        onclick="pullFromServer()" ${!hasUrl ? 'disabled title="Configure o URL primeiro"' : ''}>
        📥 Actualizar do Servidor
      </button>
      <div id="pull-status-msg" style="font-size:12px;min-height:16px;margin-bottom:6px">
        ${store.get('last_pull')
          ? '↻ Última actualização: ' + new Date(store.get('last_pull')).toLocaleString('pt')
          : 'Ainda não sincronizado a partir do servidor.'}
      </div>
      <div style="padding:8px 10px;background:#EFF6FF;border-radius:6px;font-size:11px;color:#1E40AF;
                  display:flex;align-items:flex-start;gap:6px">
        <span style="flex-shrink:0">ℹ️</span>
        <span>Os seus dados locais serão substituídos pelos dados do servidor. Use apenas após o URL estar configurado e testado.</span>
      </div>
    </div>` : ''}

    <div style="font-size:11px;color:var(--rise-muted);text-align:center;margin-top:16px">
      RISE ICT Monitor · Offline-first · Dados em localStorage
    </div>
  `;

  document.getElementById('sync-drawer').classList.add('open');
  document.getElementById('sync-overlay').classList.add('open');
}

function closeSyncDrawer() {
  document.getElementById('sync-drawer').classList.remove('open');
  document.getElementById('sync-overlay').classList.remove('open');
}

/* ── Manual sync ───────────────────────────────── */
async function triggerManualSync() {
  const url = store.get('config')?.apps_script_url || CONFIG.APPS_SCRIPT_URL;
  if (!url) { showToast('URL do Apps Script não configurado.', 'error'); return; }

  const btn = document.getElementById('sync-btn');
  if (btn) { btn.disabled = true; btn.textContent = '🔄 A sincronizar…'; }

  const setSyncStatus = (msg, ok) => {
    const el = document.getElementById('sync-status-msg');
    if (el) { el.textContent = msg; el.style.color = ok ? 'var(--status-green)' : 'var(--status-red)'; }
  };

  try {
    const queue = store.get('sync_queue') || [];
    if (!queue.length) {
      showToast('Nada para sincronizar.', 'success');
      if (btn) { btn.disabled = false; btn.textContent = '🔄 Sincronizar Agora'; }
      return;
    }

    const allResultados   = store.get('resultados')   || [];
    const allStock        = store.get('stock')         || [];
    const allConselheiros = store.get('conselheiros')  || [];
    const allEntregas     = store.get('entregas')      || [];

    const pendR = allResultados.filter(r => queue.includes(r.id));
    const pendS = allStock.filter(s => queue.includes(s.id));
    const pendC = allConselheiros.filter(c => queue.includes(c.id));
    const pendE = allEntregas.filter(e => queue.includes(e.id));

    setSyncStatus('A enviar…', true);

    // GET with base64 payload — avoids CORS preflight and GAS redirect issues
    const postBatch = async (action, records) => {
      if (!records.length) return;
      const payload = JSON.stringify({ action, records, provincia: currentProvincia, role: currentRole });
      const encoded = btoa(unescape(encodeURIComponent(payload)));
      const res = await fetch(`${url}?action=sync&d=${encodeURIComponent(encoded)}`, { method: 'GET' });
      if (!res.ok) throw new Error(`Servidor respondeu ${res.status}`);
      const json = await res.json();
      if (json.status === 'error') throw new Error(json.message);
    };

    await postBatch('sync_conselheiros', pendC);
    await postBatch('sync_resultados',   pendR);
    await postBatch('sync_stock',        pendS);
    await postBatch('sync_entregas',     pendE);

    store.set('sync_queue', []);
    store.set('last_sync', new Date().toISOString());

    setSyncStatus('✅ Sincronizado com sucesso', true);
    showToast(`Sincronização concluída — ${queue.length} registo(s) enviado(s).`, 'success');
    updateSyncUI();
    openSyncDrawer();
  } catch (e) {
    setSyncStatus('❌ Erro: ' + e.message, false);
    showToast('Erro de sincronização: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Sincronizar Agora'; }
  }
}

/* ── Force re-queue ALL local records ─────────── */
function requeueAll() {
  const resultados   = store.get('resultados')   || [];
  const stock        = store.get('stock')        || [];
  const conselheiros = store.get('conselheiros') || [];
  const entregas     = store.get('entregas')     || [];

  const allIds = [
    ...resultados.map(r => r.id),
    ...stock.map(s => s.id),
    ...conselheiros.map(c => c.id),
    ...entregas.map(e => e.id),
  ];

  store.set('sync_queue', allIds);
  showToast(`${allIds.length} registo(s) adicionados à fila de sincronização.`, 'success');
  openSyncDrawer();
}

/* ── Save Apps Script URL ──────────────────────── */
function saveAppsScriptUrl() {
  const input = document.getElementById('apps-script-url-input');
  if (!input) return;
  const url = input.value.trim();
  const cfg = store.get('config') || {};
  cfg.apps_script_url = url;
  store.set('config', cfg);
  showToast(url ? 'URL guardado.' : 'URL removido.', 'success');
  openSyncDrawer();
}

/* ── Test connection ───────────────────────────── */
async function testAppsScriptConnection() {
  const url = store.get('config')?.apps_script_url || CONFIG.APPS_SCRIPT_URL;
  if (!url) { showToast('Cole o URL primeiro.', 'error'); return; }

  const btn = document.getElementById('test-conn-btn');
  const msg = document.getElementById('test-conn-msg');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ A testar…'; }
  if (msg) { msg.textContent = 'A contactar o servidor…'; msg.style.color = 'var(--rise-muted)'; }

  try {
    // no-cors: if reachable, res.type === 'opaque'; if unreachable, throws TypeError
    await fetch(url + '?action=ping', { method: 'GET', mode: 'no-cors', redirect: 'follow' });
    if (msg) { msg.textContent = '✅ URL acessível — servidor respondeu.'; msg.style.color = 'var(--status-green)'; }
    showToast('Ligação confirmada!', 'success');
  } catch (e) {
    if (msg) { msg.textContent = '❌ Sem resposta — verifique o URL e as permissões.'; msg.style.color = 'var(--status-red)'; }
    showToast('Falha na ligação: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔌 Testar Ligação'; }
  }
}

/* ── Auto-sync timer ───────────────────────────── */
function startAutoSync() {
  setInterval(() => {
    const url   = store.get('config')?.apps_script_url || CONFIG.APPS_SCRIPT_URL;
    const queue = store.get('sync_queue') || [];
    if (navigator.onLine && url && queue.length) triggerManualSync();
  }, CONFIG.SYNC_INTERVAL_MS);
}

/* ════════════════════════════════════════════════
   PULL — fetch all data from Google Sheets
   Used by provincial / nacional roles to load
   data entered by district supervisors.
════════════════════════════════════════════════ */
async function pullFromServer() {
  const url = store.get('config')?.apps_script_url || CONFIG.APPS_SCRIPT_URL;
  if (!url) { showToast('Configure o URL do servidor primeiro.', 'error'); return; }
  if (!navigator.onLine) { showToast('Sem ligação à internet.', 'error'); return; }

  const btn = document.getElementById('pull-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ A carregar…'; }

  const setMsg = (msg, ok) => {
    const el = document.getElementById('pull-status-msg');
    if (el) { el.textContent = msg; el.style.color = ok ? 'var(--status-green)' : 'var(--status-red)'; }
  };

  try {
    setMsg('A contactar o servidor…', true);

    // Provincial role: optionally filter by province on server
    // Nacional role: no filter — receives all provinces
    const provinciaParam = currentRole === 'provincial' && currentProvincia
      ? `&provincia=${encodeURIComponent(currentProvincia)}`
      : '';

    const res = await fetch(url + '?action=pull' + provinciaParam, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!res.ok) throw new Error(`Servidor respondeu com código ${res.status}`);

    const data = await res.json();
    if (data.status === 'error') throw new Error(data.message || 'Erro desconhecido');
    if (!data.conselheiros || !data.resultados || !data.stock)
      throw new Error('Resposta incompleta — verifique a versão do Apps Script');
    // entregas is optional — older server versions may not return it;

    // Merge strategy: server records overwrite local; local-only records are preserved
    const merge = (localKey, incoming) => {
      const local = store.get(localKey) || [];
      const serverIds = new Set(incoming.map(r => r.id));
      // Keep local records not yet on server (in queue), add/update server records
      const localOnly = local.filter(r => !serverIds.has(r.id));
      store.set(localKey, [...incoming, ...localOnly]);
    };

    merge('conselheiros', data.conselheiros);
    merge('resultados',   data.resultados);
    merge('stock',        data.stock);
    if (data.entregas) merge('entregas', data.entregas);

    const now = new Date().toISOString();
    store.set('last_pull', now);

    const { counts } = data;
    const summary = counts
      ? `${counts.conselheiros} conselheiros · ${counts.resultados} resultados · ${counts.stock} stocks`
      : `${data.conselheiros.length + data.resultados.length + data.stock.length} registos`;

    setMsg(`✅ Actualizado em ${new Date(now).toLocaleTimeString('pt')} — ${summary}`, true);
    showToast('Dados actualizados a partir do servidor.', 'success');

    updateTopbarContext();
    // Re-render current screen with fresh data
    setTimeout(() => navigate(currentScreen), 300);

  } catch (err) {
    const isCorsProblem = err instanceof TypeError && err.message.includes('fetch');
    const hint = isCorsProblem
      ? ' (Possível problema de CORS — verifique as permissões de acesso do Apps Script)'
      : '';
    setMsg('❌ ' + err.message + hint, false);
    showToast('Erro ao actualizar dados: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📥 Actualizar do Servidor'; }
  }
}
