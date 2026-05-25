import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Tên không được để trống' }, { status: 400 })
  const db = getDb()
  db.prepare("UPDATE departments SET name = ?, updated_at = datetime('now') WHERE id = ?").run(name.trim(), params.id)
  const row = db.prepare('SELECT * FROM departments WHERE id = ?').get(params.id)
  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const count = (db.prepare('SELECT COUNT(*) as c FROM employees WHERE department_id = ? AND is_active = 1').get(params.id) as { c: number }).c
  if (count > 0) return NextResponse.json({ error: 'Phòng ban còn nhân viên đang làm việc' }, { status: 400 })
  db.prepare('DELETE FROM departments WHERE id = ?').run(params.id)
  return NextResponse.json({ ok: true })
}
