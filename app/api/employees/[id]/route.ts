import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { full_name, employee_code, department_id, is_active } = await req.json()
  const db = getDb()
  db.prepare(`
    UPDATE employees SET full_name=?, employee_code=?, department_id=?, is_active=?, updated_at=datetime('now')
    WHERE id=?
  `).run(full_name.trim(), employee_code.trim().toUpperCase(), department_id || null, is_active ? 1 : 0, params.id)
  const row = db.prepare(`
    SELECT e.*, d.name as dept_name FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id WHERE e.id = ?
  `).get(params.id)
  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  db.prepare('DELETE FROM employees WHERE id = ?').run(params.id)
  return NextResponse.json({ ok: true })
}
