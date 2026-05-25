import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import bcrypt from 'bcryptjs'

// In production (Railway), set DB_PATH env var to point to a persistent Volume
// e.g. DB_PATH=/data/overtime.db  (Railway Volume mounted at /data)
const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'overtime.db')

declare global {
  // eslint-disable-next-line no-var
  var _sqliteDb: Database.Database | undefined
}

// Module-level flag — resets on hot-reload so migration re-runs if needed
let _schemaInitialized = false

export function getDb(): Database.Database {
  if (!global._sqliteDb) {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    global._sqliteDb = db
  }
  // Run schema/migration on every hot-reload (idempotent checks inside)
  if (!_schemaInitialized) {
    initSchema(global._sqliteDb)
    _schemaInitialized = true
  }
  return global._sqliteDb
}

const NEW_DAY_TYPES = "'ot130','ot150','ot200','ot210','ot270','ot300','ot390'"

function initSchema(db: Database.Database) {
  // Create tables without strict CHECK on day_type (to allow migration)
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      employee_code TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      department_id TEXT REFERENCES departments(id),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL CHECK(role IN ('admin','accounting','department_head')),
      department_id TEXT REFERENCES departments(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS salary_settings (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      base_salary REAL NOT NULL,
      effective_from TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // Handle overtime_records (migrate if old constraint exists)
  const otTableDef = (db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='overtime_records'"
  ).get() as { sql: string } | undefined)?.sql ?? ''

  if (!otTableDef) {
    db.exec(`CREATE TABLE overtime_records (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      work_date TEXT NOT NULL,
      hours REAL NOT NULL,
      day_type TEXT NOT NULL,
      note TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(employee_id, work_date)
    )`)
  } else if (otTableDef.includes("'weekday'") || otTableDef.includes('"weekday"')) {
    // Migrate old 3-type to new 6-type — use step-by-step to avoid multi-statement issues
    db.pragma('foreign_keys = OFF')

    // Drop new table if previous migration failed halfway
    db.exec(`DROP TABLE IF EXISTS overtime_records_new`)

    db.exec(`CREATE TABLE overtime_records_new (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      work_date TEXT NOT NULL,
      hours REAL NOT NULL,
      day_type TEXT NOT NULL,
      note TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(employee_id, work_date)
    )`)

    db.prepare(`
      INSERT INTO overtime_records_new
        SELECT id, employee_id, work_date, hours,
          CASE day_type
            WHEN 'weekday' THEN 'ot150'
            WHEN 'weekend' THEN 'ot200'
            WHEN 'holiday' THEN 'ot300'
            ELSE day_type
          END,
          note, created_by, created_at, updated_at
        FROM overtime_records
    `).run()

    db.exec(`DROP TABLE overtime_records`)
    db.exec(`ALTER TABLE overtime_records_new RENAME TO overtime_records`)

    db.pragma('foreign_keys = ON')
  }

  // Handle overtime_rate_rules (migrate if old constraint exists)
  const rrTableDef = (db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='overtime_rate_rules'"
  ).get() as { sql: string } | undefined)?.sql ?? ''

  if (!rrTableDef) {
    db.exec(`CREATE TABLE overtime_rate_rules (
      id TEXT PRIMARY KEY,
      day_type TEXT NOT NULL UNIQUE,
      rule_name TEXT NOT NULL,
      multiplier REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`)
  } else if (rrTableDef.includes("'weekday'") || rrTableDef.includes('"weekday"')) {
    db.pragma('foreign_keys = OFF')
    db.exec(`DROP TABLE IF EXISTS overtime_rate_rules_new`)
    db.exec(`CREATE TABLE overtime_rate_rules_new (
      id TEXT PRIMARY KEY,
      day_type TEXT NOT NULL UNIQUE,
      rule_name TEXT NOT NULL,
      multiplier REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`)
    db.exec(`DROP TABLE overtime_rate_rules`)
    db.exec(`ALTER TABLE overtime_rate_rules_new RENAME TO overtime_rate_rules`)
    db.pragma('foreign_keys = ON')
    // Insert 6 new rules
    seedRateRules(db)
  }

  // Ensure 6 rate rules exist
  const ruleCount = (db.prepare('SELECT COUNT(*) as c FROM overtime_rate_rules').get() as { c: number }).c
  if (ruleCount < 7) {
    db.exec('DELETE FROM overtime_rate_rules')
    seedRateRules(db)
  }

  // Add effective_to to salary_settings if not exists
  const salaryTableDef = (db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='salary_settings'"
  ).get() as { sql: string } | undefined)?.sql ?? ''
  if (salaryTableDef && !salaryTableDef.includes('effective_to')) {
    db.exec('ALTER TABLE salary_settings ADD COLUMN effective_to TEXT')
  }

  const rowCount = (db.prepare('SELECT COUNT(*) as c FROM departments').get() as { c: number }).c
  if (rowCount === 0) seed(db)
}

function seedRateRules(db: Database.Database) {
  const insertRule = db.prepare('INSERT OR REPLACE INTO overtime_rate_rules (id, day_type, rule_name, multiplier) VALUES (?, ?, ?, ?)')
  insertRule.run('rule-01', 'ot130', 'Làm việc ban đêm (130%)', 1.3)
  insertRule.run('rule-02', 'ot150', 'Tăng ca ngày thường ban ngày (150%)', 1.5)
  insertRule.run('rule-03', 'ot200', 'Làm ngày chủ nhật ban ngày (200%)', 2.0)
  insertRule.run('rule-04', 'ot210', 'Tăng ca đêm ngày thường (210%)', 2.1)
  insertRule.run('rule-05', 'ot270', 'Làm ngày chủ nhật ban đêm (270%)', 2.7)
  insertRule.run('rule-06', 'ot300', 'Làm ngày lễ/Tết ban ngày (300%)', 3.0)
  insertRule.run('rule-07', 'ot390', 'Làm ngày lễ/Tết ban đêm (390%)', 3.9)
}

function seed(db: Database.Database) {
  const depts = [
    { id: 'dept-01', name: 'Phòng DAO PHẲNG' },
    { id: 'dept-02', name: 'Phòng DAO TRÒN' },
    { id: 'dept-03', name: 'Phòng SỬA DAO' },
    { id: 'dept-04', name: 'Phòng QC' },
    { id: 'dept-05', name: 'Phòng THIẾT KẾ' },
    { id: 'dept-06', name: 'Phòng KẾ TOÁN' },
  ]

  const insertDept = db.prepare('INSERT INTO departments (id, name) VALUES (?, ?)')
  for (const d of depts) insertDept.run(d.id, d.name)

  seedRateRules(db)

  const hash = bcrypt.hashSync('Admin@123', 10)
  const insertProfile = db.prepare('INSERT INTO profiles (id, email, password_hash, full_name, role, department_id) VALUES (?, ?, ?, ?, ?, ?)')
  insertProfile.run('profile-admin', 'admin@hytech.com', hash, 'Quản trị viên', 'admin', null)
  insertProfile.run('profile-ketoan', 'ketoan@hytech.com', hash, 'Kế toán trưởng', 'accounting', null)
}
