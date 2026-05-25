import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM departments ORDER BY name').all()
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Tên không được để trống' }, { status: 400 })
  const db = getDb()
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO departments (id, name) VALUES (?, ?)').run(id, name.trim())
  const row = db.prepare('SELECT * FROM departments WHERE id = ?').get(id)
  return NextResponse.json(row, { status: 201 })
}
