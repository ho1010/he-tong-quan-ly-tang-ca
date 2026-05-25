-- ============================================
-- HY TECH - Overtime Work Manager
-- Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('admin', 'accounting', 'department_head');
CREATE TYPE day_type AS ENUM ('weekday', 'weekend', 'holiday');

-- ============================================
-- TABLE: departments
-- ============================================
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: employees
-- ============================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  employee_code VARCHAR(20) UNIQUE NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: profiles (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  role user_role NOT NULL DEFAULT 'department_head',
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: overtime_records
-- ============================================
CREATE TABLE overtime_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours DECIMAL(4,2) NOT NULL DEFAULT 0 CHECK (hours >= 0 AND hours <= 12),
  day_type day_type NOT NULL DEFAULT 'weekday',
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, work_date)
);

-- ============================================
-- TABLE: salary_settings
-- ============================================
CREATE TABLE salary_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  base_salary DECIMAL(15,0) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: overtime_rate_rules
-- ============================================
CREATE TABLE overtime_rate_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name VARCHAR(255) NOT NULL,
  day_type day_type NOT NULL UNIQUE,
  multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.5,
  is_active BOOLEAN DEFAULT TRUE,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRIGGER: auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER overtime_records_updated_at
  BEFORE UPDATE ON overtime_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TRIGGER: auto-create profile on user signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'department_head');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_rate_rules ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get current user department
CREATE OR REPLACE FUNCTION get_user_department()
RETURNS UUID AS $$
  SELECT department_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- departments policies ----
CREATE POLICY "Anyone authenticated can view departments"
  ON departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admin can insert departments"
  ON departments FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Only admin can update departments"
  ON departments FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Only admin can delete departments"
  ON departments FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ---- employees policies ----
CREATE POLICY "Anyone authenticated can view employees"
  ON employees FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admin can insert employees"
  ON employees FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Only admin can update employees"
  ON employees FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Only admin can delete employees"
  ON employees FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ---- profiles policies ----
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "Admin can insert profiles"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

-- ---- overtime_records policies ----
-- Admin: full access
CREATE POLICY "Admin full access to overtime_records"
  ON overtime_records FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

-- Accounting: SELECT only, all departments
CREATE POLICY "Accounting can view all overtime_records"
  ON overtime_records FOR SELECT TO authenticated
  USING (get_user_role() = 'accounting');

-- Department head: full access to own department only
CREATE POLICY "Department head can view own dept overtime"
  ON overtime_records FOR SELECT TO authenticated
  USING (
    get_user_role() = 'department_head' AND
    employee_id IN (
      SELECT id FROM employees WHERE department_id = get_user_department()
    )
  );

CREATE POLICY "Department head can insert own dept overtime"
  ON overtime_records FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'department_head' AND
    employee_id IN (
      SELECT id FROM employees WHERE department_id = get_user_department()
    )
  );

CREATE POLICY "Department head can update own dept overtime"
  ON overtime_records FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'department_head' AND
    employee_id IN (
      SELECT id FROM employees WHERE department_id = get_user_department()
    )
  );

CREATE POLICY "Department head can delete own dept overtime"
  ON overtime_records FOR DELETE TO authenticated
  USING (
    get_user_role() = 'department_head' AND
    employee_id IN (
      SELECT id FROM employees WHERE department_id = get_user_department()
    )
  );

-- ---- salary_settings policies ----
CREATE POLICY "Admin full access to salary_settings"
  ON salary_settings FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Accounting can view salary_settings"
  ON salary_settings FOR SELECT TO authenticated
  USING (get_user_role() = 'accounting');

-- ---- overtime_rate_rules policies ----
CREATE POLICY "Anyone authenticated can view rate rules"
  ON overtime_rate_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admin can manage rate rules"
  ON overtime_rate_rules FOR ALL TO authenticated
  USING (get_user_role() = 'admin');
