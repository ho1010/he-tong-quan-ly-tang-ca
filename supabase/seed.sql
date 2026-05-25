-- ============================================
-- HY TECH - Seed Data
-- Run AFTER schema.sql
-- ============================================

-- ---- Departments ----
INSERT INTO departments (id, name) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Phòng Kỹ thuật'),
  ('d1000000-0000-0000-0000-000000000002', 'Phòng Sản xuất'),
  ('d1000000-0000-0000-0000-000000000003', 'Phòng Kinh doanh'),
  ('d1000000-0000-0000-0000-000000000004', 'Phòng Kế toán'),
  ('d1000000-0000-0000-0000-000000000005', 'Phòng Hành chính'),
  ('d1000000-0000-0000-0000-000000000006', 'Phòng QA/QC');

-- ---- Employees: Phòng Kỹ thuật (10) ----
INSERT INTO employees (employee_code, full_name, department_id) VALUES
  ('HY001', 'Nguyễn Văn An', 'd1000000-0000-0000-0000-000000000001'),
  ('HY002', 'Trần Thị Bình', 'd1000000-0000-0000-0000-000000000001'),
  ('HY003', 'Lê Văn Cường', 'd1000000-0000-0000-0000-000000000001'),
  ('HY004', 'Phạm Thị Dung', 'd1000000-0000-0000-0000-000000000001'),
  ('HY005', 'Hoàng Văn Em', 'd1000000-0000-0000-0000-000000000001'),
  ('HY006', 'Đặng Thị Phương', 'd1000000-0000-0000-0000-000000000001'),
  ('HY007', 'Bùi Văn Giang', 'd1000000-0000-0000-0000-000000000001'),
  ('HY008', 'Ngô Thị Hoa', 'd1000000-0000-0000-0000-000000000001'),
  ('HY009', 'Vũ Văn Inh', 'd1000000-0000-0000-0000-000000000001'),
  ('HY010', 'Đinh Thị Khánh', 'd1000000-0000-0000-0000-000000000001');

-- ---- Employees: Phòng Sản xuất (20) ----
INSERT INTO employees (employee_code, full_name, department_id) VALUES
  ('HY011', 'Trương Văn Long', 'd1000000-0000-0000-0000-000000000002'),
  ('HY012', 'Lý Thị Mai', 'd1000000-0000-0000-0000-000000000002'),
  ('HY013', 'Phan Văn Nam', 'd1000000-0000-0000-0000-000000000002'),
  ('HY014', 'Tô Thị Oanh', 'd1000000-0000-0000-0000-000000000002'),
  ('HY015', 'Huỳnh Văn Phúc', 'd1000000-0000-0000-0000-000000000002'),
  ('HY016', 'Dương Thị Quỳnh', 'd1000000-0000-0000-0000-000000000002'),
  ('HY017', 'Võ Văn Rồng', 'd1000000-0000-0000-0000-000000000002'),
  ('HY018', 'Châu Thị Sen', 'd1000000-0000-0000-0000-000000000002'),
  ('HY019', 'Mạc Văn Tài', 'd1000000-0000-0000-0000-000000000002'),
  ('HY020', 'Lưu Thị Uyên', 'd1000000-0000-0000-0000-000000000002'),
  ('HY021', 'Cù Văn Việt', 'd1000000-0000-0000-0000-000000000002'),
  ('HY022', 'Thiều Thị Xuân', 'd1000000-0000-0000-0000-000000000002'),
  ('HY023', 'Đoàn Văn Yên', 'd1000000-0000-0000-0000-000000000002'),
  ('HY024', 'Liêu Thị Zung', 'd1000000-0000-0000-0000-000000000002'),
  ('HY025', 'Nguyễn Văn Bảo', 'd1000000-0000-0000-0000-000000000002'),
  ('HY026', 'Trần Thị Cẩm', 'd1000000-0000-0000-0000-000000000002'),
  ('HY027', 'Lê Văn Dũng', 'd1000000-0000-0000-0000-000000000002'),
  ('HY028', 'Phạm Thị Elly', 'd1000000-0000-0000-0000-000000000002'),
  ('HY029', 'Hoàng Văn Phi', 'd1000000-0000-0000-0000-000000000002'),
  ('HY030', 'Đặng Thị Gấm', 'd1000000-0000-0000-0000-000000000002');

-- ---- Employees: Phòng Kinh doanh (8) ----
INSERT INTO employees (employee_code, full_name, department_id) VALUES
  ('HY031', 'Bùi Văn Hải', 'd1000000-0000-0000-0000-000000000003'),
  ('HY032', 'Ngô Thị Iris', 'd1000000-0000-0000-0000-000000000003'),
  ('HY033', 'Vũ Văn Khôi', 'd1000000-0000-0000-0000-000000000003'),
  ('HY034', 'Đinh Thị Lan', 'd1000000-0000-0000-0000-000000000003'),
  ('HY035', 'Trương Văn Minh', 'd1000000-0000-0000-0000-000000000003'),
  ('HY036', 'Lý Thị Nga', 'd1000000-0000-0000-0000-000000000003'),
  ('HY037', 'Phan Văn Oanh', 'd1000000-0000-0000-0000-000000000003'),
  ('HY038', 'Tô Thị Phượng', 'd1000000-0000-0000-0000-000000000003');

-- ---- Employees: Phòng Kế toán (5) ----
INSERT INTO employees (employee_code, full_name, department_id) VALUES
  ('HY039', 'Huỳnh Văn Quang', 'd1000000-0000-0000-0000-000000000004'),
  ('HY040', 'Dương Thị Rạng', 'd1000000-0000-0000-0000-000000000004'),
  ('HY041', 'Võ Văn Sang', 'd1000000-0000-0000-0000-000000000004'),
  ('HY042', 'Châu Thị Tuyết', 'd1000000-0000-0000-0000-000000000004'),
  ('HY043', 'Mạc Văn Uynh', 'd1000000-0000-0000-0000-000000000004');

-- ---- Employees: Phòng Hành chính (7) ----
INSERT INTO employees (employee_code, full_name, department_id) VALUES
  ('HY044', 'Lưu Thị Vân', 'd1000000-0000-0000-0000-000000000005'),
  ('HY045', 'Cù Văn Wen', 'd1000000-0000-0000-0000-000000000005'),
  ('HY046', 'Thiều Thị Xuân', 'd1000000-0000-0000-0000-000000000005'),
  ('HY047', 'Đoàn Văn Yên', 'd1000000-0000-0000-0000-000000000005'),
  ('HY048', 'Liêu Thị Zuri', 'd1000000-0000-0000-0000-000000000005'),
  ('HY049', 'Nguyễn Thị Ánh', 'd1000000-0000-0000-0000-000000000005'),
  ('HY050', 'Trần Văn Bắc', 'd1000000-0000-0000-0000-000000000005');

-- ---- Employees: Phòng QA/QC (10) ----
INSERT INTO employees (employee_code, full_name, department_id) VALUES
  ('HY051', 'Lê Thị Châu', 'd1000000-0000-0000-0000-000000000006'),
  ('HY052', 'Phạm Văn Đức', 'd1000000-0000-0000-0000-000000000006'),
  ('HY053', 'Hoàng Thị Em', 'd1000000-0000-0000-0000-000000000006'),
  ('HY054', 'Đặng Văn Phát', 'd1000000-0000-0000-0000-000000000006'),
  ('HY055', 'Bùi Thị Giang', 'd1000000-0000-0000-0000-000000000006'),
  ('HY056', 'Ngô Văn Hải', 'd1000000-0000-0000-0000-000000000006'),
  ('HY057', 'Vũ Thị Hương', 'd1000000-0000-0000-0000-000000000006'),
  ('HY058', 'Đinh Văn Khải', 'd1000000-0000-0000-0000-000000000006'),
  ('HY059', 'Trương Thị Lan', 'd1000000-0000-0000-0000-000000000006'),
  ('HY060', 'Lý Văn Minh', 'd1000000-0000-0000-0000-000000000006');

-- ---- Default overtime rate rules ----
INSERT INTO overtime_rate_rules (rule_name, day_type, multiplier, is_active) VALUES
  ('Ngày thường', 'weekday', 1.5, true),
  ('Ngày nghỉ tuần', 'weekend', 2.0, true),
  ('Ngày lễ', 'holiday', 3.0, true);

-- ============================================
-- NOTE: User accounts must be created via
-- Supabase Auth Dashboard or API, then update
-- profiles table with correct roles.
--
-- Test accounts to create:
-- admin@hytech.com / password123 → role: admin
-- ketoan@hytech.com / password123 → role: accounting
-- tp.kythuat@hytech.com / password123 → role: department_head, dept: Phòng Kỹ thuật
-- tp.sanxuat@hytech.com / password123 → role: department_head, dept: Phòng Sản xuất
--
-- After creating via Auth, run:
-- UPDATE profiles SET role='admin', full_name='Quản trị viên' WHERE id='<admin-uuid>';
-- UPDATE profiles SET role='accounting', full_name='Kế toán viên' WHERE id='<ketoan-uuid>';
-- UPDATE profiles SET role='department_head', full_name='Trưởng phòng Kỹ thuật',
--   department_id='d1000000-0000-0000-0000-000000000001' WHERE id='<tp-kt-uuid>';
-- UPDATE profiles SET role='department_head', full_name='Trưởng phòng Sản xuất',
--   department_id='d1000000-0000-0000-0000-000000000002' WHERE id='<tp-sx-uuid>';
-- ============================================
