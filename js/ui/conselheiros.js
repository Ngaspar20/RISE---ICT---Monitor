/* ══════════════════════════════════════════════════
   CONSELHEIROS — CRUD for lay counselors
══════════════════════════════════════════════════ */

/* ── Data access helpers ────────────────────────── */
function getConselheiros() {
  const all = store.get('conselheiros') || [];
  if (!currentProvincia) return all;
  return all.filter(c => c.provincia === currentProvincia);
}

function saveConselheiros(list) {
  // Merge: keep conselheiros from other províncias untouched
  const all    = store.get('conselheiros') || [];
  const others = all.filter(c => c.provincia !== currentProvincia);
  store.set('conselheiros', [...others, ...list]);
}

/* ── Render ─────────────────────────────────────── */
function renderConselheiros() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Conselheiros — ${currentProvincia}</h2>
        <p>Gestão dos conselheiros leigos do distrito</p>
      </div>
      <button class="btn btn-primary" onclick="openConselheiroModal()">+ Novo Conselheiro</button>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <input id="search-conselheiros" type="text" placeholder="Pesquisar por nome ou US…"
          style="flex:1;min-width:180px;padding:8px 12px;border:1px solid #CBD5E0;border-radius:7px;font-size:13px;font-family:inherit"
          oninput="filterConselheiros()" />
        <select id="filter-distrito" onchange="filterConselheiros()"
          style="padding:8px 12px;border:1px solid #CBD5E0;border-radius:7px;font-size:13px;font-family:inherit;background:#fff">
          <option value="">Todos os distritos</option>
          ${(CONFIG.DISTRICTS[currentProvincia] || []).map(d => `<option>${d}</option>`).join('')}
        </select>
        <select id="filter-status" onchange="filterConselheiros()"
          style="padding:8px 12px;border:1px solid #CBD5E0;border-radius:7px;font-size:13px;font-family:inherit;background:#fff">
          <option value="">Todos</option>
          <option value="ativo">Activos</option>
          <option value="inativo">Inactivos</option>
        </select>
      </div>
    </div>

    <div class="card">
      <div class="table-wrap" id="conselheiros-table-wrap">
        ${renderConselheiroTable(getConselheiros())}
      </div>
    </div>
  `;
}

function renderConselheiroTable(list) {
  if (!list.length) return emptyStateHTML('👤', 'Sem conselheiros', 'Adicione o primeiro conselheiro usando o botão acima.',
    `<div class="mt-3"><button class="btn btn-primary" onclick="openConselheiroModal()">+ Novo Conselheiro</button></div>`);

  const allResultados = store.get('resultados') || [];
  const allStock      = store.get('stock')      || [];
  const period        = activePeriod();

  return `
    <table>
      <thead>
        <tr>
          <th>Nome</th><th>Distrito</th><th>US</th><th>Contato</th>
          <th>Último Período</th><th>Score</th><th>Estado</th><th>Acções</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(c => {
          const r = allResultados.find(x => x.conselheiro_id === c.id && x.periodo_ref === period);
          const s = r && allStock.find(x => x.conselheiro_id === c.id && x.periodo_ref === period);
          const sc = r ? computeReliability(r, s || {}) : null;
          const score = sc?.score_global || (r ? 'SEM SCORE' : '—');
          return `<tr style="opacity:${c.ativo?1:.55}">
            <td style="font-weight:600;color:var(--rise-navy)">${escHtml(c.nome)}</td>
            <td style="font-size:12px">${escHtml(c.distrito || '—')}</td>
            <td style="font-size:12px;color:var(--rise-muted)">${escHtml(c.unidade_sanitaria || '—')}</td>
            <td style="font-size:12px;color:var(--rise-muted)">${escHtml(c.telefone || '—')}</td>
            <td style="font-size:12px">${r ? periodLabel(period) : '<span style="color:var(--rise-muted)">Sem dados</span>'}</td>
            <td>${r ? `<span class="badge ${scoreBadge(score)}">${score}</span>` : '<span style="color:var(--rise-muted);font-size:12px">—</span>'}</td>
            <td><span class="badge ${c.ativo ? 'badge-green' : 'badge-gray'}" style="font-size:11px">${c.ativo ? 'Activo' : 'Inactivo'}</span></td>
            <td>
              <div class="flex gap-2">
                <button class="btn btn-secondary btn-sm" onclick="openFicha('${c.id}')">Ficha</button>
                <button class="btn btn-secondary btn-sm" onclick="openConselheiroModal('${c.id}')">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="deleteConselheiro('${c.id}')">✕</button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="font-size:11px;color:var(--rise-muted);text-align:right;margin-top:8px">${list.length} conselheiro(s)</div>
  `;
}

function filterConselheiros() {
  const q       = (document.getElementById('search-conselheiros')?.value || '').toLowerCase();
  const dist    = document.getElementById('filter-distrito')?.value || '';
  const status  = document.getElementById('filter-status')?.value  || '';
  let list = getConselheiros();
  if (q)      list = list.filter(c => c.nome?.toLowerCase().includes(q) || c.unidade_sanitaria?.toLowerCase().includes(q));
  if (dist)   list = list.filter(c => c.distrito === dist);
  if (status) list = list.filter(c => status === 'ativo' ? c.ativo : !c.ativo);
  const wrap = document.getElementById('conselheiros-table-wrap');
  if (wrap) wrap.innerHTML = renderConselheiroTable(list);
}

/* ── Modal — create / edit ──────────────────────── */
function openConselheiroModal(id) {
  const existing = id ? (getConselheiros().find(c => c.id === id) || null) : null;
  const districts = CONFIG.DISTRICTS[currentProvincia] || [];

  showModal(`
    <div class="modal-header">
      <h3>${existing ? 'Editar Conselheiro' : 'Novo Conselheiro'}</h3>
      <button class="close-btn" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" style="display:grid;gap:14px">
      <div class="form-group">
        <label>Nome Completo *</label>
        <input id="c-nome" type="text" class="form-control" placeholder="Nome do conselheiro"
          value="${escHtml(existing?.nome || '')}" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label>Distrito *</label>
          <select id="c-distrito" class="form-control" onchange="updateDistrictOptions()">
            <option value="">— Seleccione —</option>
            ${districts.map(d => `<option ${existing?.distrito===d?'selected':''}>${d}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Unidade Sanitária</label>
          <input id="c-us" type="text" class="form-control" placeholder="Nome da US"
            value="${escHtml(existing?.unidade_sanitaria || '')}" />
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label>Nível de Formação</label>
          <select id="c-nivel" class="form-control">
            ${['','Básico','Médio','Superior'].map(v =>
              `<option ${existing?.nivel_formacao===v?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Telefone</label>
          <input id="c-tel" type="tel" class="form-control" placeholder="8X XXX XXXX"
            value="${escHtml(existing?.telefone || '')}" />
        </div>
      </div>
      <div class="form-group">
        <label>Responsável Clínico (nome)</label>
        <input id="c-resp" type="text" class="form-control" placeholder="Nome do supervisor directo"
          value="${escHtml(existing?.responsavel_clinico || '')}" />
      </div>

      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:12px">
        <div style="font-size:11px;font-weight:700;color:#1E40AF;margin-bottom:10px">📦 Stock Inicial de Arranque</div>

        <div style="font-size:11px;font-weight:600;color:#1E40AF;margin-bottom:6px">Determine</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Quantidade</label>
            <input id="c-stock-det" type="number" min="0" class="form-control"
              value="${existing?.stock_inicial_determine ?? 0}" />
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Lote</label>
            <input id="c-stock-det-lote" type="text" class="form-control"
              value="${existing?.stock_inicial_lote_determine ?? ''}" placeholder="ex: DET-2026-01" />
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Validade (AAAA-MM)</label>
            <input id="c-stock-det-val" type="text" class="form-control"
              value="${existing?.stock_inicial_validade_determine ?? ''}" placeholder="ex: 2027-06" />
          </div>
        </div>

        <div style="font-size:11px;font-weight:600;color:#1E40AF;margin-bottom:6px">Unigold</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Quantidade</label>
            <input id="c-stock-uni" type="number" min="0" class="form-control"
              value="${existing?.stock_inicial_unigold ?? 0}" />
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Lote</label>
            <input id="c-stock-uni-lote" type="text" class="form-control"
              value="${existing?.stock_inicial_lote_unigold ?? ''}" placeholder="ex: UNI-2026-01" />
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Validade (AAAA-MM)</label>
            <input id="c-stock-uni-val" type="text" class="form-control"
              value="${existing?.stock_inicial_validade_unigold ?? ''}" placeholder="ex: 2027-06" />
          </div>
        </div>

        <div style="font-size:11px;color:#1E40AF">
          ℹ️ Quantidade em mãos no início do programa. O sistema usa estes valores como abertura do primeiro período e transporta o stock automaticamente a partir daí.
        </div>
      </div>

      <div class="form-group">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:500">
          <input id="c-ativo" type="checkbox" ${(existing?.ativo ?? true) ? 'checked' : ''} style="width:16px;height:16px">
          Conselheiro Activo
        </label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveConselheiro('${id || ''}')">
        ${existing ? '💾 Guardar' : '+ Criar Conselheiro'}
      </button>
    </div>
  `);
}

function updateDistrictOptions() {
  // Placeholder — could update US options based on district in future
}

function saveConselheiro(editId) {
  const nome          = document.getElementById('c-nome')?.value.trim();
  const distrito      = document.getElementById('c-distrito')?.value;
  const us            = document.getElementById('c-us')?.value.trim()    || '';
  const nivel         = document.getElementById('c-nivel')?.value         || '';
  const tel           = document.getElementById('c-tel')?.value.trim()    || '';
  const resp          = document.getElementById('c-resp')?.value.trim()   || '';
  const ativo         = document.getElementById('c-ativo')?.checked ?? true;
  const stockDetInicial  = parseInt(document.getElementById('c-stock-det')?.value)      || 0;
  const stockDetLote     = document.getElementById('c-stock-det-lote')?.value.trim()   || '';
  const stockDetVal      = document.getElementById('c-stock-det-val')?.value.trim()    || '';
  const stockUniInicial  = parseInt(document.getElementById('c-stock-uni')?.value)      || 0;
  const stockUniLote     = document.getElementById('c-stock-uni-lote')?.value.trim()   || '';
  const stockUniVal      = document.getElementById('c-stock-uni-val')?.value.trim()    || '';

  if (!nome)     { showToast('Nome obrigatório.', 'error'); return; }
  if (!distrito) { showToast('Seleccione o distrito.', 'error'); return; }

  const list = getConselheiros();

  if (editId) {
    const idx = list.findIndex(c => c.id === editId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], nome, distrito, unidade_sanitaria: us, nivel_formacao: nivel,
        telefone: tel, responsavel_clinico: resp, ativo,
        stock_inicial_determine: stockDetInicial,
        stock_inicial_lote_determine: stockDetLote, stock_inicial_validade_determine: stockDetVal,
        stock_inicial_unigold: stockUniInicial,
        stock_inicial_lote_unigold: stockUniLote, stock_inicial_validade_unigold: stockUniVal,
        provincia: currentProvincia, updated_at: new Date().toISOString() };
    }
  } else {
    const rec = {
      id: uuid(), nome, distrito, unidade_sanitaria: us, nivel_formacao: nivel,
      telefone: tel, responsavel_clinico: resp, ativo,
      stock_inicial_determine: stockDetInicial,
      stock_inicial_lote_determine: stockDetLote, stock_inicial_validade_determine: stockDetVal,
      stock_inicial_unigold: stockUniInicial,
      stock_inicial_lote_unigold: stockUniLote, stock_inicial_validade_unigold: stockUniVal,
      provincia: currentProvincia, created_at: new Date().toISOString()
    };
    list.push(rec);
    // Queue for sync
    const q = store.get('sync_queue') || [];
    q.push(rec.id);
    store.set('sync_queue', q);
  }

  saveConselheiros(list);
  closeModal();
  showToast(editId ? 'Conselheiro actualizado.' : 'Conselheiro criado com sucesso.', 'success');
  updateTopbarContext();
  renderConselheiros();
}

function deleteConselheiro(id) {
  const c = getConselheiros().find(x => x.id === id);
  if (!c) return;
  showConfirm('Eliminar Conselheiro',
    `Tem a certeza que deseja eliminar <strong>${escHtml(c.nome)}</strong>? Esta acção é irreversível e remove também os registos associados.`,
    () => {
      let list    = getConselheiros().filter(x => x.id !== id);
      saveConselheiros(list);
      // Remove associated results, stock and delivery events
      store.set('resultados', (store.get('resultados') || []).filter(r => r.conselheiro_id !== id));
      store.set('stock',      (store.get('stock')      || []).filter(s => s.conselheiro_id !== id));
      store.set('entregas',   (store.get('entregas')   || []).filter(e => e.conselheiro_id !== id));
      showToast('Conselheiro eliminado.', 'success');
      updateTopbarContext();
      renderConselheiros();
    }
  );
}
