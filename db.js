/* ───────────────────────────────────────────────────────────
   db.js — ชั้นข้อมูล (Data Layer) เชื่อม Supabase
   • ฐานข้อมูลกลาง: ทุกคนที่เปิดลิงก์เดียวกันเห็นข้อมูลชุดเดียวกัน
   • Realtime: เมื่อมีคนเพิ่ม/แก้/ลบ เครื่องอื่นอัปเดตทันที
   • Offline: เน็ตหลุดก็ยังบันทึกได้ (เก็บใน localStorage แล้ว sync ทีหลัง)
   • ไม่มีระบบล็อกอิน — ใครมีลิงก์ก็ใช้ได้
   แนบไว้ที่ window.DurianDB
   ─────────────────────────────────────────────────────────── */
(function () {
  // ===== ⚙️ ตั้งค่าตรงนี้ก่อน DEPLOY ขึ้น GitHub Pages =====
  // เปิดโปรเจกต์ Supabase → Settings → API → คัดลอกค่ามาวาง
  // anon key ปลอดภัยที่จะใส่ในไฟล์ (ถูกป้องกันด้วย RLS อยู่แล้ว)
  const HARDCODED = {
    url: "https://iqwsfnugjnjrpgjrqsxw.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxd3NmbnVnam5qcnBnanJxc3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODYzNzcsImV4cCI6MjA5NjA2MjM3N30.ADelXEkVyQiXeGwST8P6PnAR-QUtRqWMUhDVyiekWVU",
  };
  // ถ้าเว้นว่างไว้ แอปจะให้กรอกค่าผ่านหน้าตั้งค่าตอนเปิดครั้งแรก (เก็บในเครื่อง)

  const TABLE        = "deliveries";
  const CFG_KEY      = "durian-supabase-config";
  const CACHE_KEY    = "durian-cloud-cache-v1";
  const QUEUE_KEY    = "durian-pending-ops-v1";
  const OLD_KEY      = "durian-delivery-v2";   // ข้อมูลเดิมที่เก็บใน localStorage
  const MIGRATED_KEY = "durian-migrated-v1";

  let client = null;
  let channel = null;
  let status = "init"; // init | not-configured | online | syncing | offline | error
  const listeners = { change: [], status: [] };

  const emit = (type, payload) => listeners[type].forEach(fn => { try { fn(payload); } catch (e) {} });
  const on = (type, fn) => { listeners[type].push(fn); return () => { listeners[type] = listeners[type].filter(f => f !== fn); }; };
  const setStatus = s => { status = s; emit("status", s); };

  // ── config ──────────────────────────────────────────────
  function getConfig() {
    if (HARDCODED.url && HARDCODED.key) return { url: HARDCODED.url, key: HARDCODED.key, source: "hardcoded" };
    try { const r = JSON.parse(localStorage.getItem(CFG_KEY) || "null"); if (r && r.url && r.key) return { ...r, source: "local" }; } catch (e) {}
    return null;
  }
  const setConfig = (url, key) => localStorage.setItem(CFG_KEY, JSON.stringify({ url: (url || "").trim(), key: (key || "").trim() }));
  const clearConfig = () => localStorage.removeItem(CFG_KEY);
  const configured = () => !!getConfig();
  const configSource = () => (getConfig() || {}).source || null;

  // ── cache (localStorage) ────────────────────────────────
  const getCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]"); } catch (e) { return []; } };
  const setCache = entries => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(entries)); } catch (e) {} };

  // ── mapping row <-> entry ───────────────────────────────
  function rowToEntry(row) {
    const e = {
      id:           String(row.id),
      purchaseDate: row.purchase_date || "",
      arrivalDate:  row.arrival_date || "",
      licensePlate: row.license_plate || "",
      grades:       row.grades || {},
      carCost:      (row.car_cost  != null && row.car_cost  !== "") ? String(row.car_cost)  : "",
      handling:     (row.handling  != null && row.handling  !== "") ? String(row.handling)  : "",
      notes:        row.notes || "",
      at:           row.created_at,
      updatedAt:    row.updated_at,
    };
    e.sum = window.Helpers.calc(e);
    return e;
  }
  const entryToRow = e => ({
    id:           String(e.id),
    purchase_date: e.purchaseDate || null,
    arrival_date:  e.arrivalDate || null,
    license_plate: e.licensePlate || "",
    car_cost:      parseFloat(e.carCost)  || 0,
    handling:      parseFloat(e.handling) || 0,
    notes:         e.notes || "",
    grades:        e.grades || {},
    created_at:    e.at || new Date().toISOString(),
    updated_at:    e.updatedAt || new Date().toISOString(),
  });

  const sortEntries = list => list.slice().sort((a, b) =>
    (b.purchaseDate || "").localeCompare(a.purchaseDate || "") ||
    String(b.at || "").localeCompare(String(a.at || "")));

  // ── init + realtime ─────────────────────────────────────
  function init() {
    const cfg = getConfig();
    if (!cfg) { setStatus("not-configured"); return false; }
    if (!window.supabase || !window.supabase.createClient) { setStatus("error"); return false; }
    try {
      client = window.supabase.createClient(cfg.url, cfg.key, { realtime: { params: { eventsPerSecond: 3 } } });
    } catch (e) { setStatus("error"); return false; }
    subscribe();
    return true;
  }

  function subscribe() {
    if (!client) return;
    if (channel) { try { client.removeChannel(channel); } catch (e) {} channel = null; }
    channel = client
      .channel("deliveries-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => { refresh(); })
      .subscribe(st => { if (st === "SUBSCRIBED" && status !== "offline") setStatus("online"); });
  }

  // ── fetch ───────────────────────────────────────────────
  async function fetchAll() {
    if (!client) return getCache();
    setStatus("syncing");
    const { data, error } = await client.from(TABLE).select("*");
    if (error) { setStatus("offline"); throw error; }
    const entries = sortEntries((data || []).map(rowToEntry));
    setCache(entries);
    setStatus("online");
    return entries;
  }

  async function refresh() {
    try { const entries = await fetchAll(); emit("change", entries); return entries; }
    catch (e) { emit("change", getCache()); return getCache(); }
  }

  // ── offline queue ───────────────────────────────────────
  const getQueue = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch (e) { return []; } };
  const setQueue = q => { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) {} };
  const queueOp = op => { const q = getQueue(); q.push(op); setQueue(q); };
  const queueCount = () => getQueue().length;

  async function flushQueue() {
    if (!client) return;
    const q = getQueue();
    if (!q.length) return;
    const remaining = [];
    for (const op of q) {
      try {
        if (op.type === "upsert") { const { error } = await client.from(TABLE).upsert(op.row); if (error) remaining.push(op); }
        else if (op.type === "remove") { const { error } = await client.from(TABLE).delete().eq("id", op.id); if (error) remaining.push(op); }
      } catch (e) { remaining.push(op); }
    }
    setQueue(remaining);
    if (!remaining.length) { emit("status", status); refresh(); }
  }

  // ── write ops (optimistic + cache + queue) ──────────────
  async function upsert(entry) {
    const withSum = { ...entry, sum: window.Helpers.calc(entry) };
    setCache(sortEntries([withSum, ...getCache().filter(e => String(e.id) !== String(entry.id))]));
    if (!client) { queueOp({ type: "upsert", row: entryToRow(entry) }); setStatus("offline"); return; }
    try {
      const { error } = await client.from(TABLE).upsert(entryToRow(entry));
      if (error) { queueOp({ type: "upsert", row: entryToRow(entry) }); setStatus("offline"); }
    } catch (e) { queueOp({ type: "upsert", row: entryToRow(entry) }); setStatus("offline"); }
  }

  async function remove(id) {
    setCache(getCache().filter(e => String(e.id) !== String(id)));
    if (!client) { queueOp({ type: "remove", id: String(id) }); setStatus("offline"); return; }
    try {
      const { error } = await client.from(TABLE).delete().eq("id", String(id));
      if (error) { queueOp({ type: "remove", id: String(id) }); setStatus("offline"); }
    } catch (e) { queueOp({ type: "remove", id: String(id) }); setStatus("offline"); }
  }

  // ── migration (ข้อมูลเดิมใน localStorage → ฐานข้อมูลกลาง) ──
  const getOldData = () => { try { return JSON.parse(localStorage.getItem(OLD_KEY) || "[]"); } catch (e) { return []; } };
  const migrationPending = () => !localStorage.getItem(MIGRATED_KEY) && getOldData().length > 0;
  const markMigrated = () => localStorage.setItem(MIGRATED_KEY, new Date().toISOString());

  async function pushAll(entries) {
    if (!client) throw new Error("ยังไม่ได้เชื่อมต่อฐานข้อมูล");
    const rows = entries.map(entryToRow);
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await client.from(TABLE).upsert(rows.slice(i, i + 200));
      if (error) throw error;
    }
    await refresh();
  }

  // ── network listeners ───────────────────────────────────
  window.addEventListener("online",  () => { if (client) { flushQueue(); refresh(); } });
  window.addEventListener("offline", () => setStatus("offline"));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && client) { flushQueue(); refresh(); }
  });

  window.DurianDB = {
    configured, getConfig, setConfig, clearConfig, configSource,
    init, fetchAll, refresh,
    upsert, remove, flushQueue, queueCount,
    getCache, setCache,
    on, getStatus: () => status,
    migrationPending, getOldData, markMigrated, pushAll,
    entryToRow, rowToEntry,
  };
})();
