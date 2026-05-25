import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const deptId = searchParams.get('deptId')
  const activeOnly = searchParams.get('active') !== 'false'

  const db = getDb()
  let sql = `
    SELECT e.*, d.name as dept_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE 1=1
  `
  const args: unknown[] = []

  if (deptId) { sql += ' AND e.department_id = ?'; args.push(deptId) }
  if (activeOnly) { sql += ' AND e.is_active = 1' }
  sql += ' ORDER BY e.employee_code'

  const rows = db.prepare(sql).all(...args)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { full_name, employee_code, department_id, is_active } = await req.json()
  if (!full_name?.trim() || !employee_code?.trim()) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }
  const db = getDb()
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO employees (id, employee_code, full_name, department_id, is_active) VALUES (?, ?, ?, ?, ?)').run(
    id,
    employee_code.trim().toUpperCase(),
    full_name.trim(),
    department_id || null,
    is_active !== false ? 1 : 0
  )
  const row = db.prepare(`
    SELECT e.*, d.name as dept_name FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id WHERE e.id = ?
  `).get(id)
  return NextResponse.json(row, { status: 201 })
}
