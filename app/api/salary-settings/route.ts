import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const empIds = searchParams.get('empIds')?.split(',').filter(Boolean) ?? []
  const before = searchParams.get('before')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const db = getDb()

  let sql = 'SELECT * FROM salary_settings WHERE 1=1'
  const args: unknown[] = []

  if (empIds.length > 0) {
    const placeholders = empIds.map(() => '?').join(',')
    sql += ` AND employee_id IN (${placeholders})`
    args.push(...empIds)
  }

  // Legacy: get periods with effective_from <= some date
  if (before) {
    sql += ' AND effective_from <= ?'
    args.push(before)
  }

  // New: get all periods overlapping [from, to] date range
  if (from && to) {
    // overlaps if: starts before/on end AND (no end date OR ends after/on start)
    sql += ' AND effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)'
    args.push(to, from)
  }

  sql += ' ORDER BY effective_from DESC, created_at DESC'

  const rows = db.prepare(sql).all(...args)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const inserts: {
    employee_id: string
    base_salary: number
    effective_from: string
    effective_to?: string | null
  }[] = Array.isArray(body) ? body : [body]

  const db = getDb()
  const deleteStmt = db.prepare('DELETE FROM salary_settings WHERE employee_id = ?')
  const insertStmt = db.prepare(
    'INSERT INTO salary_settings (id, employee_id, base_salary, effective_from, effective_to) VALUES (?, ?, ?, ?, ?)'
  )

  const insertedIds: string[] = []
  const tx = db.transaction(() => {
    for (const item of inserts) {
      // Replace existing record for this employee (prevent duplicate/stale records)
      deleteStmt.run(item.employee_id)
      const id = crypto.randomUUID()
      insertedIds.push(id)
      insertStmt.run(id, item.employee_id, item.base_salary, item.effective_from, item.effective_to ?? null)
    }
  })

  try {
    tx()
  } catch (err: any) {
    console.error('[POST /api/salary-settings] DB error:', err)
    return NextResponse.json({ ok: false, error: err?.message ?? 'DB error' }, { status: 500 })
  }

  const placeholders = insertedIds.map(() => '?').join(',')
  const records = db.prepare(`SELECT * FROM salary_settings WHERE id IN (${placeholders})`).all(...insertedIds)
  return NextResponse.json({ ok: true, records })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 })

  const db = getDb()
  db.prepare('DELETE FROM salary_settings WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
