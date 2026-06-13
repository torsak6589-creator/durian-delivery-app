/* ───────────────────────────────────────────────────────────
   helpers.js — ค่าคงที่และฟังก์ชันคำนวณที่ใช้ร่วมกันทุกไฟล์
   (pure JS, แนบไว้ที่ window.Helpers)
   ─────────────────────────────────────────────────────────── */
(function () {
  const GRADES = [
    { id: "abc",     label: "ABC" },
    { id: "ab",      label: "AB" },
    { id: "toksai",  label: "ตกไซ" },
    { id: "hongyen", label: "ห้องเย็น" },
    { id: "sudtai",  label: "สุดท้าย" },
    { id: "boe",     label: "โบ้" },
    { id: "lek",     label: "เล็ก" },
    { id: "rubare",  label: "รูแบร์" },
  ];

  const GOLD = "#C8982A";
  const GOLD_L = "#e8b540";

  const initG = () => Object.fromEntries(GRADES.map(g => [g.id, { weight: "", price: "" }]));

  const emptyForm = () => ({
    purchaseDate: new Date().toISOString().slice(0, 10),
    arrivalDate:  new Date().toISOString().slice(0, 10),
    licensePlate: "", grades: initG(), carCost: "", handling: "", notes: "",
  });

  function calc(form) {
    let tw = 0, tv = 0;
    const rows = GRADES.map(g => {
      const w = parseFloat(form.grades?.[g.id]?.weight) || 0;
      const p = parseFloat(form.grades?.[g.id]?.price) || 0;
      tw += w; tv += w * p;
      return { ...g, weight: w, price: p, value: w * p };
    });
    const avg   = tw > 0 ? tv / tw : 0;
    const car   = parseFloat(form.carCost) || 0;
    const hand  = parseFloat(form.handling) || 0;
    const carKg = tw > 0 ? car / tw : 0;
    const handTotal = hand * tw;
    const totalPay  = tv + car + handTotal;
    return { tw, tv, avg, car, hand, carKg, handTotal, totalPay, total: avg + carKg + hand, rows };
  }

  const f2 = (n, d = 2) =>
    (typeof n === "number" ? n : 0).toLocaleString("th-TH", { minimumFractionDigits: d, maximumFractionDigits: d });

  const fd = s =>
    s ? new Date(s + "T00:00:00").toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "-";

  const newId = () =>
    (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + "-" + Math.random().toString(36).slice(2));

  window.Helpers = { GRADES, GOLD, GOLD_L, initG, emptyForm, calc, f2, fd, newId };
})();
