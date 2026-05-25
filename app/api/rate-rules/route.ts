import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM overtime_rate_rules ORDER BY day_type').all()
  return NextResponse.json(rows)
}

export async function PUT(req: NextRequest) {
  const { id, multiplier } = await req.json()
  const db = getDb()
  db.prepare("UPDATE overtime_rate_rules SET multiplier=?, updated_at=datetime('now') WHERE id=?").run(multiplier, id)
  const row = db.prepare('SELECT * FROM overtime_rate_rules WHERE id=?').get(id)
  return NextResponse.json(row)
}
