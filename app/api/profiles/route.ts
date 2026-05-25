import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  const db = getDb()
  const rows = db.prepare(`
    SELECT p.id, p.email, p.full_name, p.role, p.department_id, p.created_at,
           d.name as dept_name
    FROM profiles p
    LEFT JOIN departments d ON p.department_id = d.id
    ORDER BY p.role, p.full_name
  `).all()
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { email, password, full_name, role, department_id } = await req.json()
  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }
  const db = getDb()
  const exists = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email)
  if (exists) return NextResponse.json({ error: 'Email đã tồn tại' }, { status: 400 })

  const id = crypto.randomUUID()
  const hash = bcrypt.hashSync(password, 10)
  db.prepare('INSERT INTO profiles (id, email, password_hash, full_name, role, department_id) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, email, hash, full_name, role, department_id || null
  )
  const row = db.prepare(`
    SELECT p.id, p.email, p.full_name, p.role, p.department_id, d.name as dept_name
    FROM profiles p LEFT JOIN departments d ON p.department_id = d.id WHERE p.id = ?
  `).get(id)
  return NextResponse.json(row, { status: 201 })
}
