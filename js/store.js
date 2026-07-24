/* ══════════════════════════════════════════════════
   STORE  — localStorage wrapper
   All data lives under the 'rise_ict_' namespace.

   Keys used:
     rise_ict_role            → 'distrital' | 'provincial'
     rise_ict_provincia       → 'Manica' | 'Zambézia'
     rise_ict_conselheiros    → Conselheiro[]
     rise_ict_resultados      → Resultado[]
     rise_ict_stock           → Stock[]
     rise_ict_sync_queue      → string[]  (record IDs pending sync)
     rise_ict_last_sync       → ISO datetime string
     rise_ict_config          → { apps_script_url: string }
══════════════════════════════════════════════════ */
const NS = 'rise_ict_';

const store = {
  get:    k => { try { return JSON.parse(localStorage.getItem(NS + k)); } catch { return null; } },
  set:    (k, v) => localStorage.setItem(NS + k, JSON.stringify(v)),
  remove: k => localStorage.removeItem(NS + k)
};
