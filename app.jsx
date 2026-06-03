/* ───────────────────────────────────────────────────────────
   app.jsx — UI หลัก (React) เชื่อมฐานข้อมูลกลางผ่าน window.DurianDB
   ─────────────────────────────────────────────────────────── */
const { useState, useEffect, useRef } = React;
const { GRADES, GOLD, GOLD_L, initG, emptyForm, calc, f2, fd, newId } = window.Helpers;
const DB = window.DurianDB;

const S = {
  card: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", marginBottom: 14 },
  lbl:  { color: "var(--muted)", fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", marginBottom: 5, textTransform: "uppercase", display: "block" },
  inp:  { width: "100%" },
};

/* ═══ สถานะการเชื่อมต่อฐานข้อมูล ═══ */
function StatusBadge({ status, pending, onClick }) {
  const map = {
    online:           { c: "#15803d", bg: "#f0fdf4", dot: "#16a34a", t: "เชื่อมต่อแล้ว",        i: "ti-cloud-check" },
    syncing:          { c: "#b45309", bg: "#fffbeb", dot: "#d97706", t: "กำลังซิงค์…",           i: "ti-cloud-up" },
    offline:          { c: "#b91c1c", bg: "#fef2f2", dot: "#dc2626", t: "ออฟไลน์ — บันทึกในเครื่อง", i: "ti-cloud-off" },
    "not-configured": { c: "#6b6b60", bg: "#f3f3ee", dot: "#9ca3af", t: "ยังไม่ตั้งค่าฐานข้อมูล",  i: "ti-database-off" },
    error:            { c: "#b91c1c", bg: "#fef2f2", dot: "#dc2626", t: "เชื่อมต่อไม่ได้",        i: "ti-alert-triangle" },
    init:             { c: "#6b6b60", bg: "#f3f3ee", dot: "#9ca3af", t: "กำลังเริ่ม…",            i: "ti-loader" },
  };
  const m = map[status] || map.init;
  return (
    <button onClick={onClick} title="ตั้งค่าฐานข้อมูล" style={{
      display: "flex", alignItems: "center", gap: 7, background: m.bg, border: `1px solid ${m.c}33`,
      borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: m.c, fontFamily: "var(--font)" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.dot, flexShrink: 0,
        boxShadow: status === "online" ? `0 0 0 3px ${m.dot}33` : "none" }} />
      <i className={`ti ${m.i}`} style={{ fontSize: 14 }} />
      {m.t}
      {pending > 0 && <span style={{ background: m.c, color: "#fff", borderRadius: 999, padding: "1px 7px", fontSize: 10, marginLeft: 2 }}>{pending} รอซิงค์</span>}
    </button>
  );
}

/* ═══ หน้าตั้งค่าฐานข้อมูล Supabase ═══ */
function SetupModal({ initialCfg, onSave, onSkip, onClose, canClose }) {
  const [url, setUrl] = useState(initialCfg?.url || "");
  const [key, setKey] = useState(initialCfg?.key || "");
  const [err, setErr] = useState("");
  function submit() {
    const u = url.trim(), k = key.trim();
    if (!/^https:\/\/.+\.supabase\.co/.test(u)) { setErr("URL ต้องเป็นรูปแบบ https://xxxx.supabase.co"); return; }
    if (k.length < 30) { setErr("anon key ไม่ถูกต้อง (ปกติยาวมากและขึ้นต้นด้วย eyJ...)"); return; }
    onSave(u, k);
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(13,27,46,0.55)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, border: `1px solid ${GOLD}40`, maxWidth: 540, width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        <div style={{ background: "#0D1B2E", padding: "18px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ti ti-database-cog" style={{ color: "#0D1B2E", fontSize: 21 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: GOLD }}>เชื่อมต่อฐานข้อมูลกลาง (Supabase)</div>
            <div style={{ fontSize: 12, color: "#aac4e0", marginTop: 2 }}>ใส่ค่าจาก Supabase → Settings → API</div>
          </div>
          {canClose && (
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#8899bb", fontSize: 20, cursor: "pointer" }}>✕</button>
          )}
        </div>
        <div style={{ padding: "22px 24px" }}>
          <div style={{ marginBottom: 16 }}>
            <label style={S.lbl}>Project URL</label>
            <input type="text" style={S.inp} placeholder="https://xxxxxxxx.supabase.co" value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={S.lbl}>anon public key</label>
            <input type="text" style={S.inp} placeholder="eyJhbGciOiJIUzI1NiIs..." value={key} onChange={e => setKey(e.target.value)} />
          </div>
          {err && (
            <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "9px 12px", fontSize: 13, marginBottom: 14, display: "flex", gap: 7, alignItems: "center" }}>
              <i className="ti ti-alert-triangle" /> {err}
            </div>
          )}
          <div style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: 9, padding: "12px 14px", fontSize: 12, color: "var(--muted)", lineHeight: 1.7, marginBottom: 18 }}>
            <strong style={{ color: "var(--text)" }}>ครั้งแรก?</strong> ต้องสร้างตารางในฐานข้อมูลก่อน — เปิด Supabase → SQL Editor →
            วางสคริปต์จากไฟล์ <code style={{ background: "#0D1B2E", color: GOLD, padding: "1px 6px", borderRadius: 4, fontFamily: "var(--mono)" }}>supabase-schema.sql</code> แล้วกด Run
            (ดูขั้นตอนละเอียดในไฟล์ <strong style={{ color: "var(--text)" }}>README-ภาษาไทย.md</strong>)
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={submit} style={{ flex: 1, background: GOLD, color: "#0D1B2E", border: "none", borderRadius: 9, padding: "12px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <i className="ti ti-plug-connected" style={{ fontSize: 17 }} /> เชื่อมต่อ
            </button>
            <button onClick={onSkip} style={{ background: "none", border: "1px solid var(--border2)", color: "var(--muted)", borderRadius: 9, padding: "12px 18px", fontSize: 13, fontFamily: "var(--font)" }}>
              ใช้ออฟไลน์ก่อน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [form,      setForm]      = useState(emptyForm());
  const [entries,   setEntries]   = useState([]);
  const [tab,       setTab]       = useState("form");
  const [flash,     setFlash]     = useState(null);
  const [exp,       setExp]       = useState(null);
  const [errs,      setErrs]      = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm,  setEditForm]  = useState(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo,   setFilterTo]   = useState("");
  const [importResult, setImportResult] = useState(null);
  const importRef = useRef(null);

  // ── สถานะฐานข้อมูล ──
  const [dbStatus,   setDbStatus]   = useState(DB.getStatus());
  const [pending,    setPending]    = useState(0);
  const [showSetup,  setShowSetup]  = useState(false);
  const [migrateCount, setMigrateCount] = useState(0);

  useEffect(() => {
    setEntries(DB.getCache()); // แสดงจาก cache ทันที
    const offStatus = DB.on("status", s => { setDbStatus(s); setPending(DB.queueCount()); });
    const offChange = DB.on("change", list => setEntries(list));
    setDbStatus(DB.getStatus());
    if (!DB.configured()) setShowSetup(true);
    else startDb();
    return () => { offStatus(); offChange(); };
  }, []);

  function startDb() {
    const ok = DB.init();
    if (ok) {
      DB.refresh();
      DB.flushQueue();
      if (DB.migrationPending()) setMigrateCount(DB.getOldData().length);
    }
  }

  const s = calc(form);

  const sf = (k, v)     => setForm(f => ({ ...f, [k]: v }));
  const sg = (id, fk, v) => setForm(f => ({ ...f, grades: { ...f.grades, [id]: { ...f.grades[id], [fk]: v } } }));
  const sef = (k, v)     => setEditForm(f => ({ ...f, [k]: v }));
  const seg = (id, fk, v) => setEditForm(f => ({ ...f, grades: { ...f.grades, [id]: { ...f.grades[id], [fk]: v } } }));

  const flash2 = (type, msg) => { setFlash({ type, msg }); setTimeout(() => setFlash(null), 2800); };

  // ── ตั้งค่าฐานข้อมูล ──
  function handleSetupSave(url, key) {
    DB.setConfig(url, key);
    setShowSetup(false);
    startDb();
    flash2("ok", "เชื่อมต่อฐานข้อมูลแล้ว — กำลังโหลดข้อมูล…");
  }
  function handleDisconnect() {
    DB.clearConfig();
    setShowSetup(false);
    setDbStatus("not-configured");
    flash2("ok", "ยกเลิกการเชื่อมต่อแล้ว");
  }

  // ── ย้ายข้อมูลเดิมขึ้นคลาวด์ ──
  async function doMigrate() {
    const old = DB.getOldData().map(e => ({ ...e, id: String(e.id) }));
    if (!old.length) { setMigrateCount(0); return; }
    flash2("ok", "กำลังย้ายข้อมูลขึ้นคลาวด์…");
    try {
      await DB.pushAll(old);
      DB.markMigrated();
      setMigrateCount(0);
      flash2("ok", `ย้ายข้อมูลเดิมขึ้นฐานข้อมูลกลางสำเร็จ ${old.length} รายการ ✓`);
    } catch (err) {
      flash2("err", "ย้ายไม่สำเร็จ: " + err.message);
    }
  }

  function startEdit(entry, ev) {
    ev.stopPropagation();
    setEditingId(entry.id);
    setEditForm({ purchaseDate: entry.purchaseDate, arrivalDate: entry.arrivalDate,
      licensePlate: entry.licensePlate, grades: JSON.parse(JSON.stringify(entry.grades || initG())),
      carCost: entry.carCost || "", handling: entry.handling || "", notes: entry.notes || "" });
    setExp(null);
  }

  function saveEdit(id) {
    if (!editForm.licensePlate.trim()) { flash2("err", "กรุณากรอกทะเบียนรถ"); return; }
    const es = calc(editForm);
    if (es.tw === 0) { flash2("err", "กรุณากรอกน้ำหนักอย่างน้อย 1 เบอร์"); return; }
    const base = entries.find(e => e.id === id) || {};
    const updated = { ...base, ...editForm, id, sum: es, updatedAt: new Date().toISOString() };
    setEntries(prev => prev.map(e => e.id === id ? updated : e));
    DB.upsert(updated);
    setEditingId(null); setEditForm(null);
    flash2("ok", "แก้ไขข้อมูลสำเร็จ ✓");
  }

  function cancelEdit() { setEditingId(null); setEditForm(null); }

  function save() {
    const e = {};
    if (!form.licensePlate.trim()) e.plate = true;
    if (s.tw === 0) e.grades = true;
    if (Object.keys(e).length) { setErrs(e); flash2("err", "กรุณากรอกทะเบียนรถ และน้ำหนักอย่างน้อย 1 เบอร์"); return; }
    setErrs({});
    const entry = { id: newId(), ...form, sum: calc(form), at: new Date().toISOString() };
    setEntries(prev => [entry, ...prev]);
    DB.upsert(entry);
    setForm(emptyForm());
    flash2("ok", `บันทึกสำเร็จ — ${entry.licensePlate}`);
    setTab("history");
  }

  function del(id) {
    if (!window.confirm("ลบรายการนี้ออกจากฐานข้อมูลกลาง? (ทุกคนจะไม่เห็นรายการนี้อีก)")) return;
    setEntries(prev => prev.filter(e => e.id !== id));
    DB.remove(id);
    flash2("ok", "ลบข้อมูลแล้ว"); setExp(null);
  }

  function csv() {
    const h = ["ทะเบียนรถ", "วันที่ซื้อ", "วันที่ถึงโรงงาน", "น้ำหนัก(กก)", "ราคาเฉลี่ย", "ค่ารถ", "ค่าดำเนินการ", "ต้นทุน/กก", "หมายเหตุ"];
    const rows = filteredEntries.map(e => [e.licensePlate, e.purchaseDate, e.arrivalDate,
      (e.sum?.tw || 0).toFixed(2), (e.sum?.avg || 0).toFixed(2), (e.sum?.car || 0).toFixed(2),
      (e.sum?.hand || 0).toFixed(2), (e.sum?.total || 0).toFixed(2), e.notes || ""]);
    navigator.clipboard.writeText([h, ...rows].map(r => r.join(",")).join("\n"));
    flash2("ok", "คัดลอก CSV แล้ว");
  }

  function exportExcel() {
    const hd = [
      "ทะเบียนรถ", "วันที่ซื้อ", "วันที่ถึงโรงงาน",
      "น้ำหนักรวม (กก.)", "ราคาเฉลี่ย (฿/กก.)", "ค่าวัตถุดิบ (฿)",
      "ค่ารถ (฿)", "ค่าดำเนินการ (฿/กก.)", "ค่าดำเนินการรวม (฿)",
      "ยอดที่ต้องจ่าย (฿)", "ต้นทุน/กก. (฿)", "หมายเหตุ",
      ...GRADES.flatMap(g => [`${g.label} น้ำหนัก(กก)`, `${g.label} ราคา(฿/กก)`, `${g.label} มูลค่า(฿)`])
    ];
    const rows = filteredEntries.map(e => [
      e.licensePlate, e.purchaseDate, e.arrivalDate,
      e.sum?.tw || 0, e.sum?.avg || 0, e.sum?.tv || 0,
      e.sum?.car || 0, e.sum?.hand || 0, e.sum?.handTotal || 0,
      e.sum?.totalPay || 0, e.sum?.total || 0, e.notes || "",
      ...GRADES.flatMap(g => { const r = (e.sum?.rows || []).find(x => x.id === g.id); return [r?.weight || 0, r?.price || 0, r?.value || 0]; })
    ]);
    const ws = XLSX.utils.aoa_to_sheet([hd, ...rows]);
    ws["!cols"] = [
      { wch: 14 }, { wch: 12 }, { wch: 14 },
      { wch: 16 }, { wch: 16 }, { wch: 16 },
      { wch: 12 }, { wch: 18 }, { wch: 18 },
      { wch: 20 }, { wch: 16 }, { wch: 18 },
      ...GRADES.flatMap(() => [{ wch: 16 }, { wch: 14 }, { wch: 14 }])
    ];
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: "C8982A" } }, alignment: { horizontal: "center" } };
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "การจัดส่งทุเรียน");
    const sumRows = [
      ["สรุปภาพรวม", ""],
      ["ช่วงวันที่", isFiltered ? `${filterFrom || "ทั้งหมด"} ถึง ${filterTo || "ทั้งหมด"}` : "ทั้งหมด"],
      ["จำนวนรถ", filteredEntries.length + (isFiltered ? "/" + entries.length : "") + " คัน"],
      ["น้ำหนักรวม", fW.toFixed(2) + " กก."],
      ["มูลค่าวัตถุดิบรวม", fV.toFixed(2) + " ฿"],
      ["ราคาเฉลี่ยรวม", fA.toFixed(2) + " ฿/กก."],
      ["ยอดที่โรงงานต้องจ่ายรวม", fPay.toFixed(2) + " ฿"],
      ["วันที่ส่งออก", new Date().toLocaleDateString("th-TH")],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(sumRows);
    ws2["!cols"] = [{ wch: 28 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws2, "สรุปภาพรวม");
    const filterLabel = isFiltered ? `-${filterFrom || ""}ถึง${filterTo || ""}` : "";
    const fname = `ทุเรียน-FF${filterLabel}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fname);
    flash2("ok", "ส่งออก Excel สำเร็จ — " + fname);
  }

  function handleImportFile(ev0) {
    const file = ev0.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array" });
        const ws = wb.Sheets["การจัดส่งทุเรียน"];
        if (!ws) { flash2("err", "ไม่พบ sheet 'การจัดส่งทุเรียน' ในไฟล์นี้"); return; }
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (rows.length < 2) { flash2("err", "ไม่พบข้อมูลในไฟล์"); return; }

        let added = 0, skipped = 0, dupes = 0;
        const addedEntries = [];
        const existingKeys = new Set(entries.map(e => `${e.licensePlate}|${e.purchaseDate}`));

        rows.slice(1).forEach((r, idx) => {
          const plate = String(r[0] || "").trim();
          const buyDate = String(r[1] || "").trim();
          if (!plate || !buyDate) { skipped++; return; }
          const key = `${plate}|${buyDate}`;
          if (existingKeys.has(key)) { dupes++; return; }

          const grades = {};
          GRADES.forEach((g, i) => {
            const w = parseFloat(r[12 + i * 3]) || 0;
            const p = parseFloat(r[12 + i * 3 + 1]) || 0;
            grades[g.id] = { weight: w > 0 ? String(w) : "", price: p > 0 ? String(p) : "" };
          });
          const formObj = {
            purchaseDate: buyDate,
            arrivalDate:  String(r[2] || buyDate).trim(),
            licensePlate: plate,
            grades,
            carCost:  String(parseFloat(r[6]) || ""),
            handling: String(parseFloat(r[7]) || ""),
            notes:    String(r[11] || ""),
          };
          const entry = { id: newId(), ...formObj, sum: calc(formObj), at: new Date().toISOString(), importedFrom: file.name };
          addedEntries.push(entry);
          existingKeys.add(key);
          added++;
        });

        // optimistic + push to DB
        const merged = [...addedEntries, ...entries].sort((a, b) => (b.purchaseDate || "").localeCompare(a.purchaseDate || ""));
        setEntries(merged);
        addedEntries.forEach(e => DB.upsert(e));

        setImportResult({ added, dupes, skipped, file: file.name });
        setTimeout(() => setImportResult(null), 6000);
      } catch (err) {
        flash2("err", "อ่านไฟล์ไม่สำเร็จ: " + err.message);
      }
      ev0.target.value = "";
    };
    reader.readAsArrayBuffer(file);
  }

  // ── filtered ──
  const filteredEntries = entries.filter(e => {
    if (filterFrom && e.purchaseDate < filterFrom) return false;
    if (filterTo   && e.purchaseDate > filterTo)   return false;
    return true;
  });
  const fW  = filteredEntries.reduce((a, e) => a + (e.sum?.tw || 0), 0);
  const fV  = filteredEntries.reduce((a, e) => a + (e.sum?.tv || 0), 0);
  const fA  = fW > 0 ? fV / fW : 0;
  const fPay = filteredEntries.reduce((a, e) => a + (e.sum?.totalPay || 0), 0);
  const isFiltered = filterFrom || filterTo;

  return (
    <div style={{ fontFamily: "var(--font)", paddingBottom: 48 }}>
      <h2 className="sr-only">ระบบบันทึกข้อมูลการจัดส่งทุเรียน FF Branch</h2>

      {showSetup && (
        <SetupModal
          initialCfg={DB.getConfig()}
          canClose={DB.configured()}
          onSave={handleSetupSave}
          onSkip={() => { setShowSetup(false); setDbStatus(DB.getStatus()); }}
          onClose={() => setShowSetup(false)}
        />
      )}

      {/* HEADER */}
      <div style={{ borderBottom: `2px solid ${GOLD}`, padding: "14px 24px", display: "flex", alignItems: "center", gap: 12, background: "var(--card)", flexWrap: "wrap" }}>
        <div style={{ width: 38, height: 38, borderRadius: 8, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="ti ti-leaf" style={{ color: "#0D1B2E", fontSize: 20 }} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: GOLD, lineHeight: 1.2 }}>บันทึกข้อมูลการจัดส่งทุเรียน</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>FF Branch · บริษัท ห้องเย็นโชติวัฒน์หาดใหญ่ จำกัด (มหาชน)</div>
        </div>
        <StatusBadge status={dbStatus} pending={pending} onClick={() => setShowSetup(true)} />
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{entries.length} รายการ</div>
      </div>

      {/* FLASH */}
      {flash && (
        <div style={{ padding: "10px 24px", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
          background: flash.type === "err" ? "var(--danger-bg)" : "var(--success-bg)",
          color: flash.type === "err" ? "var(--danger)" : "var(--success)",
          borderBottom: `1px solid ${flash.type === "err" ? "var(--danger)" : "var(--success)"}30` }}>
          <i className={`ti ${flash.type === "err" ? "ti-alert-triangle" : "ti-check"}`} />
          {flash.msg}
        </div>
      )}

      {/* MIGRATION BANNER */}
      {migrateCount > 0 && (
        <div style={{ background: "#0D1B2E", borderBottom: `1px solid ${GOLD}`, padding: "12px 24px",
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <i className="ti ti-cloud-upload" style={{ fontSize: 22, color: GOLD, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, color: GOLD, fontSize: 14 }}>พบข้อมูลเดิมในเครื่องนี้ {migrateCount} รายการ</div>
            <div style={{ fontSize: 12, color: "#aac4e0", marginTop: 2 }}>ย้ายขึ้นฐานข้อมูลกลางเพื่อให้ทุกคนเห็นข้อมูลชุดเดียวกัน</div>
          </div>
          <button onClick={doMigrate} style={{ background: GOLD, color: "#0D1B2E", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-cloud-upload" /> ย้ายขึ้นคลาวด์
          </button>
          <button onClick={() => { DB.markMigrated(); setMigrateCount(0); }} style={{ background: "none", border: "1px solid #ffffff30", color: "#aac4e0", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontFamily: "var(--font)" }}>
            ไม่ต้องย้าย
          </button>
        </div>
      )}

      {/* TABS */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 24px", background: "var(--card)" }}>
        {[{ id: "form", icon: "ti-edit", label: "บันทึกข้อมูล" }, { id: "history", icon: "ti-archive", label: `ประวัติการจัดส่ง (${entries.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", padding: "11px 18px", fontSize: 13, fontWeight: 600,
            color: tab === t.id ? GOLD : "var(--muted)",
            borderBottom: tab === t.id ? `2px solid ${GOLD}` : "2px solid transparent",
            marginBottom: -1, display: "flex", alignItems: "center", gap: 6 }}>
            <i className={`ti ${t.icon}`} />{t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 900, margin: "0 auto" }}>

        {/* ═══ FORM ═══ */}
        {tab === "form" && (
          <div>
            <div style={S.card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-truck-delivery" /> ข้อมูลการจัดส่ง
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <div><label style={S.lbl}>วันที่ซื้อ</label>
                  <input type="date" style={S.inp} value={form.purchaseDate} onChange={e => sf("purchaseDate", e.target.value)} /></div>
                <div><label style={S.lbl}>วันที่ถึงโรงงาน</label>
                  <input type="date" style={S.inp} value={form.arrivalDate} onChange={e => sf("arrivalDate", e.target.value)} /></div>
                <div><label style={S.lbl}>ทะเบียนรถ *</label>
                  <input type="text" style={{ ...S.inp, borderColor: errs.plate ? "var(--danger)" : undefined }}
                    placeholder="เช่น กข-1234" value={form.licensePlate}
                    onChange={e => { sf("licensePlate", e.target.value); setErrs(p => ({ ...p, plate: false })); }} /></div>
              </div>
            </div>

            <div style={{ ...S.card, borderColor: errs.grades ? "var(--danger)" : undefined }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-table" /> น้ำหนักและราคาแต่ละเบอร์ *
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${GOLD}40` }}>
                      {["เบอร์ทุเรียน", "น้ำหนัก (กก.)", "ราคา (฿/กก.)", "มูลค่า (฿)"].map((h, i) => (
                        <th key={h} style={{ padding: "9px 12px", textAlign: i === 0 ? "left" : "right", color: GOLD, fontWeight: 600, fontSize: 11,
                          textTransform: "uppercase", letterSpacing: "0.06em", background: `${GOLD}12` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {GRADES.map((g, i) => {
                      const row = s.rows[i];
                      const has = row.weight > 0 || row.price > 0;
                      return (
                        <tr key={g.id} style={{ borderBottom: "1px solid var(--border)", background: has ? `${GOLD}08` : undefined }}>
                          <td style={{ padding: "7px 12px" }}>
                            <span style={{ display: "inline-block", background: `${GOLD}20`, border: `1px solid ${GOLD}50`,
                              borderRadius: 5, padding: "2px 10px", fontSize: 12, fontWeight: 600, color: GOLD_L }}>{g.label}</span>
                          </td>
                          <td style={{ padding: "7px 12px" }}>
                            <input type="number" min="0" step="0.1" style={{ width: 120 }} placeholder="0.0"
                              value={form.grades[g.id]?.weight}
                              onChange={e => { sg(g.id, "weight", e.target.value); setErrs(p => ({ ...p, grades: false })); }} />
                          </td>
                          <td style={{ padding: "7px 12px" }}>
                            <input type="number" min="0" step="0.01" style={{ width: 120 }} placeholder="0.00"
                              value={form.grades[g.id]?.price}
                              onChange={e => sg(g.id, "price", e.target.value)} />
                          </td>
                          <td style={{ padding: "7px 12px", textAlign: "right", fontFamily: "var(--mono)", fontSize: 13 }}>
                            {row.weight > 0 && row.price > 0
                              ? <span style={{ color: "var(--success)", fontWeight: 600 }}>{f2(row.value)}</span>
                              : <span style={{ color: "var(--muted)" }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: `${GOLD}15`, borderTop: `1px solid ${GOLD}60` }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: GOLD }}>รวมทั้งหมด</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--mono)", fontWeight: 700, color: GOLD }}>{s.tw > 0 ? f2(s.tw) : "—"}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, color: "var(--muted)" }}>{s.tw > 0 ? `เฉลี่ย ${f2(s.avg)} ฿/กก.` : ""}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--mono)", fontWeight: 700, color: GOLD }}>{s.tv > 0 ? f2(s.tv) : "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={S.card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-receipt" /> ต้นทุนเพิ่มเติม
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <div>
                  <label style={S.lbl}>ค่ารถ (฿ / คัน รวม)</label>
                  <input type="number" min="0" step="1" style={S.inp} placeholder="0" value={form.carCost} onChange={e => sf("carCost", e.target.value)} />
                  {s.tw > 0 && parseFloat(form.carCost) > 0 && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>= {f2(s.carKg)} ฿/กก.</div>}
                </div>
                <div>
                  <label style={S.lbl}>ค่าดำเนินการ (฿ / กก.)</label>
                  <input type="number" min="0" step="0.01" style={S.inp} placeholder="0.00" value={form.handling} onChange={e => sf("handling", e.target.value)} />
                  {s.tw > 0 && parseFloat(form.handling) > 0 && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>รวม = {f2(parseFloat(form.handling) * s.tw)} ฿</div>}
                </div>
                <div>
                  <label style={S.lbl}>หมายเหตุ</label>
                  <input type="text" style={S.inp} placeholder="(ไม่บังคับ)" value={form.notes} onChange={e => sf("notes", e.target.value)} />
                </div>
              </div>
            </div>

            {s.tw > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 10, marginBottom: 16 }}>
                {[
                  { lb: "น้ำหนักรวม", v: f2(s.tw),    u: "กก.",    hi: false },
                  { lb: "มูลค่า RM",  v: f2(s.tv, 0), u: "฿",     hi: false },
                  { lb: "ราคาเฉลี่ย", v: f2(s.avg),   u: "฿/กก.", hi: false },
                  { lb: "ค่ารถ/กก.",  v: f2(s.carKg), u: "฿/กก.", hi: false },
                  { lb: "ต้นทุน/กก.", v: f2(s.total), u: "฿/กก.", hi: true },
                ].map(c => (
                  <div key={c.lb} style={{ background: c.hi ? `${GOLD}18` : "var(--card2)", border: `1px solid ${c.hi ? GOLD + "80" : "var(--border)"}`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.3 }}>{c.lb}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: c.hi ? GOLD : "var(--text)", fontFamily: "var(--mono)" }}>{c.v}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{c.u}</div>
                  </div>
                ))}
              </div>
            )}

            {s.tw > 0 && (
              <div style={{ background: "#0D1B2E", border: `2px solid ${GOLD}`, borderRadius: 12, padding: "18px 22px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-calculator" style={{ fontSize: 14 }} /> สรุปยอดที่โรงงานต้องจ่าย
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "6px 16px", fontSize: 13, alignItems: "center" }}>
                  <span style={{ color: "#aac4e0" }}>ค่าวัตถุดิบ (RM)</span>
                  <span style={{ fontFamily: "var(--mono)", fontWeight: 600, color: "#e8ecf1", textAlign: "right" }}>{f2(s.tv)} ฿</span>
                  <span style={{ color: "#aac4e0" }}>ค่ารถ</span>
                  <span style={{ fontFamily: "var(--mono)", fontWeight: 600, color: "#e8ecf1", textAlign: "right" }}>+ {f2(s.car)} ฿</span>
                  <span style={{ color: "#aac4e0" }}>ค่าดำเนินการ ({f2(s.hand, 2)} ฿/กก. × {f2(s.tw)} กก.)</span>
                  <span style={{ fontFamily: "var(--mono)", fontWeight: 600, color: "#e8ecf1", textAlign: "right" }}>+ {f2(s.handTotal)} ฿</span>
                  <div style={{ gridColumn: "1/-1", borderTop: `1px dashed ${GOLD}50`, margin: "8px 0" }} />
                  <span style={{ fontWeight: 700, color: GOLD, fontSize: 15 }}>ยอดที่โรงงานต้องจ่าย</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--mono)", fontWeight: 700, color: GOLD, fontSize: 20 }}>{f2(s.totalPay)} ฿</div>
                    <div style={{ fontFamily: "var(--mono)", fontWeight: 600, color: GOLD_L, fontSize: 13, marginTop: 2 }}>{f2(s.total)} ฿/กก.</div>
                  </div>
                </div>
              </div>
            )}

            <button onClick={save} style={{ background: GOLD, color: "#0D1B2E", border: "none", borderRadius: 10,
              padding: "13px 32px", fontSize: 15, fontWeight: 700, width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <i className="ti ti-device-floppy" style={{ fontSize: 18 }} /> บันทึกข้อมูล
            </button>
          </div>
        )}

        {/* ═══ HISTORY ═══ */}
        {tab === "history" && (
          <div>
            <div style={{ ...S.card, marginBottom: 16, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-filter" style={{ fontSize: 13 }} /> กรองข้อมูลตามวันที่ซื้อ
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={S.lbl}>ตั้งแต่วันที่</label>
                  <input type="date" style={S.inp} value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setExp(null); }} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={S.lbl}>ถึงวันที่</label>
                  <input type="date" style={S.inp} value={filterTo} onChange={e => { setFilterTo(e.target.value); setExp(null); }} />
                </div>
                <div style={{ display: "flex", gap: 8, paddingBottom: 1 }}>
                  <button onClick={() => { setFilterFrom(""); setFilterTo(""); setExp(null); }} style={{
                    background: "none", border: "1px solid var(--border2)", color: "var(--muted)",
                    borderRadius: 7, padding: "7px 16px", fontSize: 13, fontFamily: "var(--font)",
                    display: "flex", alignItems: "center", gap: 5,
                    opacity: isFiltered ? 1 : 0.4, cursor: isFiltered ? "pointer" : "default" }}>
                    <i className="ti ti-x" style={{ fontSize: 13 }} /> ล้าง
                  </button>
                </div>
              </div>
              {isFiltered && (
                <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-info-circle" style={{ color: GOLD }} />
                  แสดง <strong style={{ color: GOLD }}>{filteredEntries.length}</strong> รายการ
                  {filterFrom && <> ตั้งแต่ <strong style={{ color: "var(--text)" }}>{fd(filterFrom)}</strong></>}
                  {filterTo && <> ถึง <strong style={{ color: "var(--text)" }}>{fd(filterTo)}</strong></>}
                  {" "}(จากทั้งหมด {entries.length} รายการ)
                </div>
              )}
            </div>

            {entries.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
                <i className="ti ti-package" style={{ fontSize: 40, color: GOLD }} />
                <div style={{ marginTop: 12, fontSize: 14 }}>ยังไม่มีข้อมูลการจัดส่ง</div>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>
                <i className="ti ti-search" style={{ fontSize: 36, color: GOLD }} />
                <div style={{ marginTop: 12, fontSize: 14 }}>ไม่พบรายการในช่วงวันที่ที่เลือก</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>ลองเปลี่ยนช่วงวันที่หรือกดปุ่ม "ล้าง"</div>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginBottom: 18 }}>
                  {[
                    { lb: "จำนวนรถ", v: filteredEntries.length + " คัน", sub: null, ic: "ti-truck" },
                    { lb: "น้ำหนักรวม", v: f2(fW, 0) + " กก.", sub: null, ic: "ti-weight" },
                    { lb: "มูลค่า RM รวม", v: f2(fV, 0) + " ฿", sub: null, ic: "ti-cash" },
                    { lb: "ราคาเฉลี่ย", v: f2(fA) + " ฿/กก.", sub: null, ic: "ti-chart-line" },
                  ].map(c => (
                    <div key={c.lb} style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                      <i className={`ti ${c.ic}`} style={{ fontSize: 18, color: GOLD }} />
                      <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "6px 0 4px", lineHeight: 1.3 }}>{c.lb}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: GOLD, fontFamily: "var(--mono)" }}>{c.v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: "#0D1B2E", border: `1px solid ${GOLD}50`, borderRadius: 10,
                  padding: "12px 20px", marginBottom: 16, display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.07em", flexShrink: 0 }}>
                    <i className="ti ti-calculator" style={{ fontSize: 13, marginRight: 4 }} />
                    ยอดที่ต้องจ่ายรวม{isFiltered ? " (ที่กรอง)" : ""}
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontWeight: 700, color: GOLD, fontSize: 20 }}>{f2(fPay)} ฿</div>
                  <div style={{ fontSize: 12, color: "#8899bb", fontFamily: "var(--mono)" }}>{fW > 0 ? f2(fPay / fW, 2) + " ฿/กก." : ""}</div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <input ref={importRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleImportFile} />
                  <button onClick={() => importRef.current.click()} style={{
                    background: "none", border: `1px solid ${GOLD}`, borderRadius: 7,
                    color: GOLD, padding: "8px 18px", fontSize: 13, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--font)" }}>
                    <i className="ti ti-file-import" style={{ fontSize: 16 }} /> นำเข้า Excel
                  </button>
                  <button onClick={exportExcel} style={{
                    background: "#1a6b35", border: "1px solid #2d9e52", borderRadius: 7,
                    color: "#d1fae5", padding: "8px 18px", fontSize: 13, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--font)" }}>
                    <i className="ti ti-file-spreadsheet" style={{ fontSize: 16 }} /> ส่งออก Excel{isFiltered ? " (ที่กรอง)" : ""}
                  </button>
                  <button onClick={csv} style={{ background: "none", border: `1px solid ${GOLD}60`, borderRadius: 7,
                    color: GOLD, padding: "8px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font)" }}>
                    <i className="ti ti-copy" style={{ fontSize: 14 }} /> คัดลอก CSV
                  </button>
                </div>

                {importResult && (
                  <div style={{ background: "#0D1B2E", border: `1.5px solid ${GOLD}`, borderRadius: 10, padding: "14px 18px", marginBottom: 14, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                    <i className="ti ti-check" style={{ fontSize: 20, color: GOLD, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: GOLD, fontSize: 14, marginBottom: 4 }}>นำเข้าข้อมูลสำเร็จ — {importResult.file}</div>
                      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13 }}>
                        <span style={{ color: "#6ee7b7" }}>✓ เพิ่มใหม่ <strong style={{ color: "#a7f3d0" }}>{importResult.added} รายการ</strong></span>
                        {importResult.dupes > 0 && <span style={{ color: "#fcd34d" }}>⚠ ซ้ำ (ข้าม) <strong style={{ color: "#fde68a" }}>{importResult.dupes} รายการ</strong></span>}
                        {importResult.skipped > 0 && <span style={{ color: "#aac4e0" }}>— ว่าง (ข้าม) <strong>{importResult.skipped} รายการ</strong></span>}
                      </div>
                    </div>
                    <button onClick={() => setImportResult(null)} style={{ background: "none", border: "none", color: "#8899bb", cursor: "pointer", fontSize: 18, padding: 0 }}>✕</button>
                  </div>
                )}

                {filteredEntries.map(entry => {
                  const isEditing = editingId === entry.id;
                  const es = isEditing ? calc(editForm) : null;
                  return (
                    <div key={entry.id} style={{ ...S.card, marginBottom: 10,
                      cursor: isEditing ? "default" : "pointer",
                      borderColor: isEditing ? GOLD : exp === entry.id ? `${GOLD}80` : "var(--border)",
                      borderWidth: isEditing ? "2px" : "1px" }}
                      onClick={() => { if (!isEditing) setExp(exp === entry.id ? null : entry.id); }}>

                      {isEditing && editForm ? (
                        <div onClick={e => e.stopPropagation()}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                            <i className="ti ti-pencil" /> แก้ไขข้อมูล — {entry.licensePlate}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                            <div><label style={S.lbl}>วันที่ซื้อ</label>
                              <input type="date" style={S.inp} value={editForm.purchaseDate} onChange={e => sef("purchaseDate", e.target.value)} /></div>
                            <div><label style={S.lbl}>วันที่ถึงโรงงาน</label>
                              <input type="date" style={S.inp} value={editForm.arrivalDate} onChange={e => sef("arrivalDate", e.target.value)} /></div>
                            <div><label style={S.lbl}>ทะเบียนรถ</label>
                              <input type="text" style={S.inp} value={editForm.licensePlate} onChange={e => sef("licensePlate", e.target.value)} /></div>
                          </div>
                          <div style={{ overflowX: "auto", marginBottom: 14 }}>
                            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ background: `${GOLD}12`, borderBottom: `1px solid ${GOLD}40` }}>
                                  {["เบอร์", "น้ำหนัก (กก.)", "ราคา (฿/กก.)", "มูลค่า (฿)"].map((h, i) => (
                                    <th key={h} style={{ padding: "8px 10px", textAlign: i === 0 ? "left" : "right", color: GOLD, fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {GRADES.map((g, i) => {
                                  const row = es.rows[i];
                                  return (
                                    <tr key={g.id} style={{ borderBottom: "1px solid var(--border)", background: row.weight > 0 ? `${GOLD}06` : undefined }}>
                                      <td style={{ padding: "6px 10px" }}>
                                        <span style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}50`, borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 600, color: GOLD_L }}>{g.label}</span>
                                      </td>
                                      <td style={{ padding: "6px 10px" }}>
                                        <input type="number" min="0" step="0.1" style={{ width: 110, textAlign: "right", background: "var(--card2)", border: "1px solid var(--border2)", borderRadius: 5, color: "var(--text)", padding: "5px 8px", fontSize: 13, fontFamily: "var(--font)" }}
                                          placeholder="0.0" value={editForm.grades[g.id]?.weight} onChange={e => seg(g.id, "weight", e.target.value)} />
                                      </td>
                                      <td style={{ padding: "6px 10px" }}>
                                        <input type="number" min="0" step="0.01" style={{ width: 110, textAlign: "right", background: "var(--card2)", border: "1px solid var(--border2)", borderRadius: 5, color: "var(--text)", padding: "5px 8px", fontSize: 13, fontFamily: "var(--font)" }}
                                          placeholder="0.00" value={editForm.grades[g.id]?.price} onChange={e => seg(g.id, "price", e.target.value)} />
                                      </td>
                                      <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "var(--mono)", fontSize: 12 }}>
                                        {row.weight > 0 && row.price > 0
                                          ? <span style={{ color: "var(--success)", fontWeight: 600 }}>{f2(row.value)}</span>
                                          : <span style={{ color: "var(--muted)" }}>—</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                                <tr style={{ background: `${GOLD}15`, borderTop: `1px solid ${GOLD}60` }}>
                                  <td style={{ padding: "8px 10px", fontWeight: 700, color: GOLD, fontSize: 13 }}>รวม</td>
                                  <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--mono)", fontWeight: 700, color: GOLD }}>{es.tw > 0 ? f2(es.tw) : "—"}</td>
                                  <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 11, color: "var(--muted)" }}>{es.tw > 0 ? `เฉลี่ย ${f2(es.avg)} ฿/กก.` : ""}</td>
                                  <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--mono)", fontWeight: 700, color: GOLD }}>{es.tv > 0 ? f2(es.tv) : "—"}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                            <div><label style={S.lbl}>ค่ารถ (฿/คัน)</label>
                              <input type="number" min="0" step="1" style={S.inp} placeholder="0" value={editForm.carCost} onChange={e => sef("carCost", e.target.value)} />
                              {es.tw > 0 && parseFloat(editForm.carCost) > 0 && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>= {f2(es.carKg)} ฿/กก.</div>}
                            </div>
                            <div><label style={S.lbl}>ค่าดำเนินการ (฿/กก.)</label>
                              <input type="number" min="0" step="0.01" style={S.inp} placeholder="0.00" value={editForm.handling} onChange={e => sef("handling", e.target.value)} />
                            </div>
                            <div><label style={S.lbl}>หมายเหตุ</label>
                              <input type="text" style={S.inp} placeholder="(ไม่บังคับ)" value={editForm.notes} onChange={e => sef("notes", e.target.value)} />
                            </div>
                          </div>
                          {es.tw > 0 && (
                            <div style={{ background: "#0D1B2E", border: `1px solid ${GOLD}`, borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
                              <span style={{ fontSize: 12, color: "#aac4e0" }}>ค่า RM <strong style={{ color: GOLD, fontFamily: "var(--mono)" }}>{f2(es.tv)} ฿</strong></span>
                              <span style={{ fontSize: 12, color: "#aac4e0" }}>+ ค่ารถ <strong style={{ color: GOLD, fontFamily: "var(--mono)" }}>{f2(es.car)} ฿</strong></span>
                              <span style={{ fontSize: 12, color: "#aac4e0" }}>+ ดำเนินการ <strong style={{ color: GOLD, fontFamily: "var(--mono)" }}>{f2(es.handTotal)} ฿</strong></span>
                              <span style={{ color: `${GOLD}60` }}>＝</span>
                              <span style={{ fontWeight: 700, color: GOLD, fontFamily: "var(--mono)", fontSize: 16 }}>{f2(es.totalPay)} ฿</span>
                              <span style={{ fontSize: 12, color: GOLD_L, fontFamily: "var(--mono)" }}>{f2(es.total)} ฿/กก.</span>
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => saveEdit(entry.id)} style={{ background: GOLD, color: "#0D1B2E", border: "none", borderRadius: 8, padding: "10px 28px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font)" }}>
                              <i className="ti ti-check" /> บันทึกการแก้ไข
                            </button>
                            <button onClick={cancelEdit} style={{ background: "none", border: "1px solid var(--border2)", color: "var(--muted)", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontFamily: "var(--font)" }}>
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                            <div style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}60`, borderRadius: 7, padding: "5px 14px", fontSize: 14, fontWeight: 700, color: GOLD, fontFamily: "var(--mono)", minWidth: 100, textAlign: "center", flexShrink: 0, alignSelf: "center" }}>
                              {entry.licensePlate || "—"}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, alignSelf: "center", minWidth: 110 }}>
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>ซื้อ <strong style={{ color: "var(--text)", fontWeight: 600 }}>{fd(entry.purchaseDate)}</strong></span>
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>ถึง <strong style={{ color: "var(--text)", fontWeight: 600 }}>{fd(entry.arrivalDate)}</strong></span>
                              {entry.notes && <span style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>{entry.notes}</span>}
                            </div>
                            <div style={{ flex: 1, minWidth: 200 }}>
                              <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontWeight: 600 }}>รายละเอียดเบอร์</div>
                              <table style={{ fontSize: 12, borderCollapse: "collapse", width: "100%" }}>
                                <thead>
                                  <tr style={{ borderBottom: `1px solid ${GOLD}30` }}>
                                    <th style={{ padding: "3px 8px", textAlign: "left", color: GOLD, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>เบอร์</th>
                                    <th style={{ padding: "3px 8px", textAlign: "right", color: GOLD, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>น้ำหนัก</th>
                                    <th style={{ padding: "3px 8px", textAlign: "right", color: GOLD, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>ราคา/กก.</th>
                                    <th style={{ padding: "3px 8px", textAlign: "right", color: GOLD, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>มูลค่า</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(entry.sum?.rows || []).filter(r => r.weight > 0).map(r => (
                                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                      <td style={{ padding: "4px 8px" }}>
                                        <span style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}40`, borderRadius: 3, padding: "1px 7px", fontWeight: 600, color: GOLD_L, fontSize: 11 }}>{r.label}</span>
                                      </td>
                                      <td style={{ padding: "4px 8px", textAlign: "right", fontFamily: "var(--mono)", fontWeight: 500, fontSize: 12 }}>{f2(r.weight, 0)} กก.</td>
                                      <td style={{ padding: "4px 8px", textAlign: "right", fontFamily: "var(--mono)", fontWeight: 600, color: GOLD, fontSize: 12 }}>{f2(r.price, 2)} ฿</td>
                                      <td style={{ padding: "4px 8px", textAlign: "right", fontFamily: "var(--mono)", fontSize: 12, color: "var(--success)" }}>{f2(r.value, 0)} ฿</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div style={{ display: "flex", gap: 14, textAlign: "right", flexShrink: 0, alignItems: "stretch", flexWrap: "wrap" }}>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>น้ำหนักรวม</div>
                                <div style={{ fontWeight: 700, fontFamily: "var(--mono)", fontSize: 14 }}>{f2(entry.sum?.tw || 0)} กก.</div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>ราคาเฉลี่ย</div>
                                <div style={{ fontWeight: 700, fontFamily: "var(--mono)", fontSize: 14, color: GOLD }}>{f2(entry.sum?.avg || 0)} ฿/กก.</div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>ต้นทุน/กก.</div>
                                <div style={{ fontWeight: 700, fontFamily: "var(--mono)", fontSize: 14, color: "var(--success)" }}>{f2(entry.sum?.total || 0)} ฿/กก.</div>
                              </div>
                              <div style={{ background: "#0D1B2E", borderRadius: 8, padding: "8px 16px", textAlign: "center", alignSelf: "center" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>ยอดที่ต้องจ่าย</div>
                                <div style={{ fontWeight: 700, fontFamily: "var(--mono)", fontSize: 16, color: GOLD }}>{f2(entry.sum?.totalPay || 0)} ฿</div>
                                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: GOLD_L, marginTop: 2 }}>{f2(entry.sum?.total || 0)} ฿/กก.</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "center", flexShrink: 0 }}>
                              <button onClick={ev => startEdit(entry, ev)} style={{ background: "none", border: `1px solid ${GOLD}60`, color: GOLD, borderRadius: 6, padding: "4px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font)" }}>
                                <i className="ti ti-pencil" style={{ fontSize: 13 }} /> แก้ไข
                              </button>
                              <i className={`ti ${exp === entry.id ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: 16, color: "var(--muted)" }} />
                              <button onClick={ev => { ev.stopPropagation(); del(entry.id); }} style={{ background: "none", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: 6, padding: "4px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font)" }}>
                                <i className="ti ti-trash" style={{ fontSize: 13 }} /> ลบ
                              </button>
                            </div>
                          </div>

                          {exp === entry.id && (
                            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                                <span>ค่ารถรวม: <strong style={{ color: "var(--text)", fontFamily: "var(--mono)" }}>{f2(entry.sum?.car || 0)} ฿</strong></span>
                                <span>ค่าดำเนินการ: <strong style={{ color: "var(--text)", fontFamily: "var(--mono)" }}>{f2(entry.sum?.hand || 0)} ฿/กก.</strong></span>
                                <span>ต้นทุน/กก.: <strong style={{ color: GOLD, fontFamily: "var(--mono)" }}>{f2(entry.sum?.total || 0)} ฿</strong></span>
                              </div>
                              <div style={{ background: "#0D1B2E", border: `1.5px solid ${GOLD}`, borderRadius: 10, padding: "14px 18px" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                                  <i className="ti ti-calculator" style={{ fontSize: 12 }} /> ยอดที่โรงงานต้องจ่าย
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "5px 14px", fontSize: 12, alignItems: "center" }}>
                                  <span style={{ color: "#aac4e0" }}>ค่าวัตถุดิบ (RM)</span>
                                  <span style={{ fontFamily: "var(--mono)", color: "#e8ecf1", textAlign: "right" }}>{f2(entry.sum?.tv || 0)} ฿</span>
                                  <span style={{ color: "#aac4e0" }}>ค่ารถ</span>
                                  <span style={{ fontFamily: "var(--mono)", color: "#e8ecf1", textAlign: "right" }}>+ {f2(entry.sum?.car || 0)} ฿</span>
                                  <span style={{ color: "#aac4e0" }}>ค่าดำเนินการ ({f2(entry.sum?.hand || 0, 2)} × {f2(entry.sum?.tw || 0)} กก.)</span>
                                  <span style={{ fontFamily: "var(--mono)", color: "#e8ecf1", textAlign: "right" }}>+ {f2(entry.sum?.handTotal || 0)} ฿</span>
                                  <div style={{ gridColumn: "1/-1", borderTop: `1px dashed ${GOLD}50`, margin: "6px 0" }} />
                                  <span style={{ fontWeight: 700, color: GOLD, fontSize: 13 }}>ยอดรวม</span>
                                  <div style={{ textAlign: "right" }}>
                                    <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: GOLD, fontSize: 15 }}>{f2(entry.sum?.totalPay || 0)} ฿</span>
                                    <span style={{ fontFamily: "var(--mono)", color: GOLD_L, fontSize: 12, marginLeft: 10 }}>{f2(entry.sum?.total || 0)} ฿/กก.</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
