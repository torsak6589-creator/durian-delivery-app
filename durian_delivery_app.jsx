import { useState, useEffect } from "react";

const GRADES = [
  { id: "abc",     label: "ABC" },
  { id: "ab",      label: "AB" },
  { id: "toksai",  label: "ตกไซ" },
  { id: "hongyen", label: "ห้องเย็น" },
  { id: "sudtai",  label: "สุดท้าย" },
  { id: "boe",     label: "โบ้" },
  { id: "lek",     label: "เล็ก" },
];

const GOLD = "#C8982A";
const GOLD_LIGHT = "#e8b540";
const STORAGE_KEY = "durian-delivery-v2";

function initGrades() {
  return Object.fromEntries(GRADES.map((g) => [g.id, { weight: "", price: "" }]));
}

const emptyForm = () => ({
  purchaseDate: new Date().toISOString().slice(0, 10),
  arrivalDate: new Date().toISOString().slice(0, 10),
  licensePlate: "",
  grades: initGrades(),
  carCost: "",
  handling: "",
  notes: "",
});

function calcSummary(form) {
  let totalWeight = 0, totalValue = 0;
  const gradeRows = GRADES.map((g) => {
    const w = parseFloat(form.grades[g.id]?.weight) || 0;
    const p = parseFloat(form.grades[g.id]?.price) || 0;
    totalWeight += w;
    totalValue += w * p;
    return { ...g, weight: w, price: p, value: w * p };
  });
  const avgPrice = totalWeight > 0 ? totalValue / totalWeight : 0;
  const carCost = parseFloat(form.carCost) || 0;
  const handling = parseFloat(form.handling) || 0;
  const carPerKg = totalWeight > 0 ? carCost / totalWeight : 0;
  const totalCostPerKg = avgPrice + carPerKg + handling;
  return { totalWeight, totalValue, avgPrice, carCost, handling, carPerKg, totalCostPerKg, gradeRows };
}

const fmt = (n, d = 2) =>
  (typeof n === "number" ? n : 0).toLocaleString("th-TH", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const fmtDate = (s) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "-";

const inputSt = {
  background: "var(--color-background-secondary)",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: 6,
  color: "var(--color-text-primary)",
  padding: "7px 10px",
  fontSize: 14,
  width: "100%",
  outline: "none",
  fontFamily: "'Noto Sans Thai', sans-serif",
  boxSizing: "border-box",
};

const labelSt = {
  color: "var(--color-text-secondary)",
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.06em",
  marginBottom: 5,
  textTransform: "uppercase",
  display: "block",
};

const cardSt = {
  background: "var(--color-background-primary)",
  border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: 12,
  padding: "18px 20px",
  marginBottom: 14,
};

export default function App() {
  const [form, setForm] = useState(emptyForm());
  const [entries, setEntries] = useState([]);
  const [tab, setTab] = useState("form");
  const [flash, setFlash] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r?.value) setEntries(JSON.parse(r.value));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const sum = calcSummary(form);

  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function setGrade(id, field, v) {
    setForm((f) => ({ ...f, grades: { ...f.grades, [id]: { ...f.grades[id], [field]: v } } }));
  }

  function showFlash(type, msg) {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 2800);
  }

  async function handleSave() {
    const errs = {};
    if (!form.licensePlate.trim()) errs.licensePlate = true;
    if (sum.totalWeight === 0) errs.grades = true;
    if (Object.keys(errs).length) {
      setErrors(errs);
      showFlash("error", "กรุณากรอกทะเบียนรถ และน้ำหนักอย่างน้อย 1 เบอร์");
      return;
    }
    setErrors({});
    const entry = { id: Date.now(), ...form, summary: calcSummary(form), savedAt: new Date().toISOString() };
    const updated = [entry, ...entries];
    setEntries(updated);
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(updated)); } catch {}
    setForm(emptyForm());
    showFlash("success", `บันทึกสำเร็จ — ${entry.licensePlate}`);
    setTab("history");
  }

  async function deleteEntry(id) {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(updated)); } catch {}
    showFlash("success", "ลบข้อมูลแล้ว");
    setExpanded(null);
  }

  function copyCSV() {
    const header = ["ทะเบียนรถ","วันที่ซื้อ","วันที่ถึงโรงงาน","น้ำหนักรวม(กก)","ราคาเฉลี่ย(฿/กก)","ค่ารถ(฿)","ค่าดำเนินการ(฿/กก)","ต้นทุนรวม(฿/กก)","หมายเหตุ"];
    const rows = entries.map((e) => [
      e.licensePlate,
      e.purchaseDate,
      e.arrivalDate,
      (e.summary?.totalWeight || 0).toFixed(2),
      (e.summary?.avgPrice || 0).toFixed(2),
      (e.summary?.carCost || 0).toFixed(2),
      (e.summary?.handling || 0).toFixed(2),
      (e.summary?.totalCostPerKg || 0).toFixed(2),
      e.notes || "",
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    navigator.clipboard.writeText(csv);
    showFlash("success", "คัดลอก CSV แล้ว");
  }

  const aggWeight = entries.reduce((s, e) => s + (e.summary?.totalWeight || 0), 0);
  const aggValue = entries.reduce((s, e) => s + (e.summary?.totalValue || 0), 0);
  const aggAvg = aggWeight > 0 ? aggValue / aggWeight : 0;

  return (
    <div style={{ fontFamily: "'Noto Sans Thai', 'DM Sans', sans-serif", paddingBottom: 40 }}>
      <h2 className="sr-only">ระบบบันทึกข้อมูลการจัดส่งทุเรียน FF Branch</h2>

      {/* ── Header ── */}
      <div style={{
        borderBottom: `2px solid ${GOLD}`,
        padding: "14px 24px",
        display: "flex", alignItems: "center", gap: 12,
        background: "var(--color-background-primary)",
        marginBottom: 0,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8, background: GOLD,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          flexShrink: 0,
        }}>
          <i className="ti ti-leaf" style={{ color: "#0D1B2E", fontSize: 20 }} aria-hidden="true" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: GOLD, lineHeight: 1.2 }}>
            บันทึกข้อมูลการจัดส่งทุเรียน
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 1 }}>
            FF Branch · บริษัท ห้องเย็นโชติวัฒน์หาดใหญ่ จำกัด (มหาชน)
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "var(--color-text-secondary)" }}>
          {entries.length} รายการ
        </div>
      </div>

      {/* ── Flash ── */}
      {flash && (
        <div style={{
          padding: "10px 24px", fontSize: 13, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 8,
          background: flash.type === "error" ? "var(--color-background-danger)" : "var(--color-background-success)",
          color: flash.type === "error" ? "var(--color-text-danger)" : "var(--color-text-success)",
          borderBottom: `0.5px solid ${flash.type === "error" ? "var(--color-border-danger)" : "var(--color-border-success)"}`,
        }}>
          <i className={`ti ${flash.type === "error" ? "ti-alert-triangle" : "ti-check"}`} aria-hidden="true" />
          {flash.msg}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{
        display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)",
        padding: "0 24px", background: "var(--color-background-primary)",
      }}>
        {[
          { id: "form",    icon: "ti-edit",     label: "บันทึกข้อมูล" },
          { id: "history", icon: "ti-archive",  label: `ประวัติการจัดส่ง (${entries.length})` },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "11px 18px", fontSize: 13, fontWeight: 500,
            color: tab === t.id ? GOLD : "var(--color-text-secondary)",
            borderBottom: tab === t.id ? `2px solid ${GOLD}` : "2px solid transparent",
            marginBottom: -1, display: "flex", alignItems: "center", gap: 6,
            fontFamily: "'Noto Sans Thai', sans-serif",
          }}>
            <i className={`ti ${t.icon}`} aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 860, margin: "0 auto" }}>

        {/* ════════════════ FORM TAB ════════════════ */}
        {tab === "form" && (
          <div>
            {/* Basic Info */}
            <div style={cardSt}>
              <div style={{ fontSize: 11, fontWeight: 500, color: GOLD, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-truck-delivery" aria-hidden="true" />
                ข้อมูลการจัดส่ง
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelSt}>วันที่ซื้อ</label>
                  <input type="date" style={inputSt} value={form.purchaseDate}
                    onChange={(e) => setField("purchaseDate", e.target.value)} />
                </div>
                <div>
                  <label style={labelSt}>วันที่ถึงโรงงาน</label>
                  <input type="date" style={inputSt} value={form.arrivalDate}
                    onChange={(e) => setField("arrivalDate", e.target.value)} />
                </div>
                <div>
                  <label style={labelSt}>ทะเบียนรถ *</label>
                  <input type="text" style={{ ...inputSt, borderColor: errors.licensePlate ? "var(--color-border-danger)" : undefined }}
                    placeholder="เช่น กข-1234 หรือ 80-2345"
                    value={form.licensePlate}
                    onChange={(e) => { setField("licensePlate", e.target.value); setErrors((p) => ({ ...p, licensePlate: false })); }} />
                </div>
              </div>
            </div>

            {/* Grade Table */}
            <div style={{ ...cardSt, border: errors.grades ? "0.5px solid var(--color-border-danger)" : cardSt.border }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: GOLD, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-table" aria-hidden="true" />
                น้ำหนักและราคาแต่ละเบอร์ *
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${GOLD}30` }}>
                      {["เบอร์ทุเรียน", "น้ำหนัก (กก.)", "ราคา (฿/กก.)", "มูลค่า (฿)"].map((h, i) => (
                        <th key={h} style={{
                          padding: "9px 12px",
                          textAlign: i === 0 ? "left" : "right",
                          color: GOLD, fontWeight: 500, fontSize: 11,
                          textTransform: "uppercase", letterSpacing: "0.06em",
                          background: `${GOLD}12`,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {GRADES.map((g, i) => {
                      const row = sum.gradeRows[i];
                      const hasData = row.weight > 0 || row.price > 0;
                      return (
                        <tr key={g.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", background: hasData ? `${GOLD}06` : undefined }}>
                          <td style={{ padding: "7px 12px" }}>
                            <span style={{
                              display: "inline-block",
                              background: `${GOLD}20`,
                              border: `0.5px solid ${GOLD}60`,
                              borderRadius: 5, padding: "2px 10px",
                              fontSize: 12, fontWeight: 500, color: GOLD_LIGHT,
                            }}>{g.label}</span>
                          </td>
                          <td style={{ padding: "7px 12px" }}>
                            <input type="number" min="0" step="0.1"
                              style={{ ...inputSt, textAlign: "right", width: 120 }}
                              placeholder="0.0"
                              value={form.grades[g.id]?.weight}
                              onChange={(e) => { setGrade(g.id, "weight", e.target.value); setErrors((p) => ({ ...p, grades: false })); }} />
                          </td>
                          <td style={{ padding: "7px 12px" }}>
                            <input type="number" min="0" step="0.01"
                              style={{ ...inputSt, textAlign: "right", width: 120 }}
                              placeholder="0.00"
                              value={form.grades[g.id]?.price}
                              onChange={(e) => setGrade(g.id, "price", e.target.value)} />
                          </td>
                          <td style={{ padding: "7px 12px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                            {row.weight > 0 && row.price > 0 ? (
                              <span style={{ color: "var(--color-text-success)", fontWeight: 500 }}>{fmt(row.value)}</span>
                            ) : <span style={{ color: "var(--color-text-secondary)" }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Totals */}
                    <tr style={{ background: `${GOLD}15`, borderTop: `1px solid ${GOLD}50` }}>
                      <td style={{ padding: "10px 12px", fontWeight: 500, color: GOLD, fontSize: 13 }}>รวมทั้งหมด</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 500, color: GOLD }}>
                        {sum.totalWeight > 0 ? fmt(sum.totalWeight) : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, color: "var(--color-text-secondary)" }}>
                        {sum.totalWeight > 0 ? `เฉลี่ย ${fmt(sum.avgPrice)} ฿/กก.` : ""}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 500, color: GOLD }}>
                        {sum.totalValue > 0 ? fmt(sum.totalValue) : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cost Additions */}
            <div style={cardSt}>
              <div style={{ fontSize: 11, fontWeight: 500, color: GOLD, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-receipt" aria-hidden="true" />
                ต้นทุนเพิ่มเติม
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelSt}>ค่ารถ (฿ / คัน รวม)</label>
                  <input type="number" min="0" step="1" style={inputSt}
                    placeholder="0" value={form.carCost}
                    onChange={(e) => setField("carCost", e.target.value)} />
                  {sum.totalWeight > 0 && parseFloat(form.carCost) > 0 && (
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                      = {fmt(sum.carPerKg)} ฿/กก.
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelSt}>ค่าดำเนินการ (฿ / กก.)</label>
                  <input type="number" min="0" step="0.01" style={inputSt}
                    placeholder="0.00" value={form.handling}
                    onChange={(e) => setField("handling", e.target.value)} />
                  {sum.totalWeight > 0 && parseFloat(form.handling) > 0 && (
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                      รวม = {fmt(parseFloat(form.handling) * sum.totalWeight)} ฿
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelSt}>หมายเหตุ</label>
                  <input type="text" style={inputSt} placeholder="(ไม่บังคับ)"
                    value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Live Summary Cards */}
            {sum.totalWeight > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "น้ำหนักรวม", value: `${fmt(sum.totalWeight)}`, unit: "กก.", hi: false },
                  { label: "มูลค่า RM", value: `${fmt(sum.totalValue, 0)}`, unit: "฿", hi: false },
                  { label: "ราคาเฉลี่ย", value: `${fmt(sum.avgPrice)}`, unit: "฿/กก.", hi: false },
                  { label: "ค่ารถ/กก.", value: `${fmt(sum.carPerKg)}`, unit: "฿/กก.", hi: false },
                  { label: "ต้นทุนรวม/กก.", value: `${fmt(sum.totalCostPerKg)}`, unit: "฿/กก.", hi: true },
                ].map((c) => (
                  <div key={c.label} style={{
                    background: c.hi ? `${GOLD}18` : "var(--color-background-secondary)",
                    border: `0.5px solid ${c.hi ? GOLD + "80" : "var(--color-border-tertiary)"}`,
                    borderRadius: 10, padding: "12px 14px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.3 }}>{c.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: c.hi ? GOLD : "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>{c.value}</div>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2 }}>{c.unit}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Save Button */}
            <button onClick={handleSave} style={{
              background: GOLD, color: "#0D1B2E",
              border: "none", borderRadius: 10,
              padding: "13px 32px", fontSize: 15, fontWeight: 500, cursor: "pointer",
              width: "100%", letterSpacing: "0.04em",
              fontFamily: "'Noto Sans Thai', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <i className="ti ti-device-floppy" style={{ fontSize: 18 }} aria-hidden="true" />
              บันทึกข้อมูล
            </button>
          </div>
        )}

        {/* ════════════════ HISTORY TAB ════════════════ */}
        {tab === "history" && (
          <div>
            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: "var(--color-text-secondary)" }}>
                <i className="ti ti-loader-2" style={{ fontSize: 32 }} aria-hidden="true" />
                <div style={{ marginTop: 8 }}>กำลังโหลด...</div>
              </div>
            ) : entries.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "var(--color-text-secondary)" }}>
                <i className="ti ti-package" style={{ fontSize: 40, color: GOLD }} aria-hidden="true" />
                <div style={{ marginTop: 12, fontSize: 14 }}>ยังไม่มีข้อมูลการจัดส่ง</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>กรุณาบันทึกข้อมูลในแท็บ "บันทึกข้อมูล"</div>
              </div>
            ) : (
              <>
                {/* Aggregate KPI */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 18 }}>
                  {[
                    { label: "จำนวนรถ", value: entries.length + " คัน", icon: "ti-truck" },
                    { label: "น้ำหนักรวม", value: fmt(aggWeight, 0) + " กก.", icon: "ti-weight" },
                    { label: "มูลค่า RM รวม", value: fmt(aggValue, 0) + " ฿", icon: "ti-cash" },
                    { label: "ราคาเฉลี่ยรวม", value: fmt(aggAvg) + " ฿/กก.", icon: "ti-chart-line" },
                  ].map((c) => (
                    <div key={c.label} style={{
                      background: "var(--color-background-secondary)",
                      border: "0.5px solid var(--color-border-tertiary)",
                      borderRadius: 10, padding: "12px 14px", textAlign: "center",
                    }}>
                      <i className={`ti ${c.icon}`} style={{ fontSize: 18, color: GOLD }} aria-hidden="true" />
                      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "6px 0 4px" }}>{c.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 500, color: GOLD, fontFamily: "var(--font-mono)" }}>{c.value}</div>
                    </div>
                  ))}
                </div>

                {/* Export */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                  <button onClick={copyCSV} style={{
                    background: "none", border: `0.5px solid ${GOLD}60`, borderRadius: 7,
                    color: GOLD, padding: "7px 16px", cursor: "pointer", fontSize: 12,
                    fontFamily: "'Noto Sans Thai', sans-serif", display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <i className="ti ti-copy" style={{ fontSize: 14 }} aria-hidden="true" />
                    คัดลอก CSV
                  </button>
                </div>

                {/* Entry Cards */}
                {entries.map((entry) => (
                  <div key={entry.id} style={{
                    ...cardSt,
                    marginBottom: 10, cursor: "pointer",
                    borderColor: expanded === entry.id ? `${GOLD}60` : "var(--color-border-tertiary)",
                  }} onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
                    
                    {/* Row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      {/* License plate */}
                      <div style={{
                        background: `${GOLD}18`, border: `0.5px solid ${GOLD}60`,
                        borderRadius: 7, padding: "5px 14px",
                        fontSize: 14, fontWeight: 500, color: GOLD,
                        fontFamily: "var(--font-mono)", minWidth: 100, textAlign: "center",
                        flexShrink: 0,
                      }}>{entry.licensePlate || "—"}</div>

                      {/* Dates */}
                      <div style={{ flex: 1, display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                          ซื้อ <strong style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{fmtDate(entry.purchaseDate)}</strong>
                        </span>
                        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                          ถึง <strong style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{fmtDate(entry.arrivalDate)}</strong>
                        </span>
                        {entry.notes && (
                          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontStyle: "italic" }}>{entry.notes}</span>
                        )}
                      </div>

                      {/* KPIs */}
                      <div style={{ display: "flex", gap: 20, textAlign: "right", flexShrink: 0 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>น้ำหนักรวม</div>
                          <div style={{ fontWeight: 500, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-primary)" }}>{fmt(entry.summary?.totalWeight || 0)} กก.</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>ราคาเฉลี่ย</div>
                          <div style={{ fontWeight: 500, fontFamily: "var(--font-mono)", fontSize: 13, color: GOLD }}>{fmt(entry.summary?.avgPrice || 0)} ฿</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>ต้นทุน/กก.</div>
                          <div style={{ fontWeight: 500, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-success)" }}>{fmt(entry.summary?.totalCostPerKg || 0)} ฿</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <i className={`ti ${expanded === entry.id ? "ti-chevron-up" : "ti-chevron-down"}`}
                          style={{ fontSize: 16, color: "var(--color-text-secondary)" }} aria-hidden="true" />
                        <button onClick={(ev) => { ev.stopPropagation(); deleteEntry(entry.id); }} style={{
                          background: "none", border: "0.5px solid var(--color-border-danger)",
                          color: "var(--color-text-danger)", borderRadius: 6,
                          padding: "4px 10px", cursor: "pointer", fontSize: 12,
                          fontFamily: "'Noto Sans Thai', sans-serif",
                          display: "flex", alignItems: "center", gap: 4,
                        }}>
                          <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden="true" />
                          ลบ
                        </button>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {expanded === entry.id && (
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: `${GOLD}10` }}>
                              {["เบอร์", "น้ำหนัก (กก.)", "ราคา (฿/กก.)", "มูลค่า (฿)"].map((h, i) => (
                                <th key={h} style={{
                                  padding: "7px 12px", fontWeight: 500, color: GOLD,
                                  textAlign: i === 0 ? "left" : "right",
                                  borderBottom: `0.5px solid ${GOLD}30`,
                                }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(entry.summary?.gradeRows || []).filter((r) => r.weight > 0).map((r) => (
                              <tr key={r.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                                <td style={{ padding: "6px 12px" }}>
                                  <span style={{ background: `${GOLD}15`, borderRadius: 4, padding: "1px 8px", color: GOLD_LIGHT, fontSize: 12 }}>{r.label}</span>
                                </td>
                                <td style={{ padding: "6px 12px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmt(r.weight)}</td>
                                <td style={{ padding: "6px 12px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmt(r.price)}</td>
                                <td style={{ padding: "6px 12px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--color-text-success)" }}>{fmt(r.value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ display: "flex", gap: 24, marginTop: 12, paddingTop: 10, borderTop: "0.5px solid var(--color-border-tertiary)", flexWrap: "wrap", fontSize: 12, color: "var(--color-text-secondary)" }}>
                          <span>ค่ารถรวม: <strong style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>{fmt(entry.summary?.carCost || 0)} ฿</strong></span>
                          <span>ค่าดำเนินการ: <strong style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>{fmt(entry.summary?.handling || 0)} ฿/กก.</strong></span>
                          <span>ค่ารถ/กก.: <strong style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>{fmt(entry.summary?.carPerKg || 0)} ฿</strong></span>
                          <span>ต้นทุนรวม/กก.: <strong style={{ color: GOLD, fontFamily: "var(--font-mono)" }}>{fmt(entry.summary?.totalCostPerKg || 0)} ฿</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
