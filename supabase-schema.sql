-- ════════════════════════════════════════════════════════════
--  supabase-schema.sql
--  สคริปต์สร้างตารางสำหรับระบบบันทึกข้อมูลการจัดส่งทุเรียน FF Branch
--
--  วิธีใช้:  เปิด Supabase → เมนู SQL Editor → New query
--           วางสคริปต์นี้ทั้งหมด → กดปุ่ม "Run"
-- ════════════════════════════════════════════════════════════

-- 1) ตารางหลัก เก็บข้อมูลการจัดส่งแต่ละคัน
create table if not exists deliveries (
  id            text primary key,           -- รหัสรายการ (สร้างจากแอป)
  purchase_date date,                        -- วันที่ซื้อ
  arrival_date  date,                        -- วันที่ถึงโรงงาน
  license_plate text,                        -- ทะเบียนรถ
  car_cost      numeric default 0,           -- ค่ารถ (บาท/คัน)
  handling      numeric default 0,           -- ค่าดำเนินการ (บาท/กก.)
  notes         text    default '',          -- หมายเหตุ
  grades        jsonb   default '{}'::jsonb, -- น้ำหนัก/ราคา แต่ละเบอร์
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 2) เปิด Row Level Security
alter table deliveries enable row level security;

-- 3) นโยบายเข้าถึงแบบเปิด (ไม่มีระบบล็อกอิน — ใครมีลิงก์ก็ใช้ได้)
--    *ถ้าต้องการจำกัดเฉพาะคนในบริษัทภายหลัง ค่อยเพิ่มระบบล็อกอินแล้วแก้ตรงนี้*
drop policy if exists "public read"   on deliveries;
drop policy if exists "public insert" on deliveries;
drop policy if exists "public update" on deliveries;
drop policy if exists "public delete" on deliveries;

create policy "public read"   on deliveries for select using (true);
create policy "public insert" on deliveries for insert with check (true);
create policy "public update" on deliveries for update using (true) with check (true);
create policy "public delete" on deliveries for delete using (true);

-- 4) เปิด Realtime ให้ตารางนี้ (เครื่องอื่นเห็นการเปลี่ยนแปลงทันที)
alter publication supabase_realtime add table deliveries;

-- เสร็จแล้ว ✓  กลับไปที่แอป กรอก Project URL + anon key เพื่อเชื่อมต่อ
