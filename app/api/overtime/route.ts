import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const deptId = searchParams.get('deptId')
  const empId = searchParams.get('empId')
  const dayType = searchParams.get('dayType')
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20')
  const sortField = searchParams.get('sort') === 'hours' ? 'r.hours' : 'r.work_date'
  const sortDir = searchParams.get('dir') === 'asc' ? 'ASC' : 'DESC'
  const noPage = searchParams.get('noPage') === '1'

  const db = getDb()
  let where = 'WHERE 1=1'
  const args: unknown[] = []

  if (from) { where += ' AND r.work_date >= ?'; args.push(from) }
  if (to) { where += ' AND r.work_date <= ?'; args.push(to) }
  if (empId && empId !== 'all') { where += ' AND r.employee_id = ?'; args.push(empId) }
  if (deptId && deptId !== 'all') { where += ' AND e.department_id = ?'; args.push(deptId) }
  if (dayType && dayType !== 'all') { where += ' AND r.day_type = ?'; args.push(dayType) }

  const baseSQL = `
    FROM overtime_records r
    INNER JOIN employees e ON r.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    ${where}
  `

  const total = (db.prepare(`SELECT COUNT(*) as c ${baseSQL}`).get(...args) as { c: number }).c

  let dataSQL = `
    SELECT r.*, e.employee_code, e.full_name, e.department_id,
           d.name as dept_name
    ${baseSQL}
    ORDER BY ${sortField} ${sortDir}
  `
  if (!noPage) {
    dataSQL += ` LIMIT ? OFFSET ?`
    args.push(pageSize, (page - 1) * pageSize)
  }

  const rows = db.prepare(dataSQL).all(...args)
  return NextResponse.json({ data: rows, total })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { upserts, deletes } = body as {
    upserts: { employee_id: string; work_date: string; hours: number; day_type: string; note: string | null; created_by: string }[]
    deletes: { employee_ids: string[]; work_date: string }
  }

  const db = getDb()

  const upsertStmt = db.prepare(`
    INSERT INTO overtime_records (id, employee_id, work_date, hours, day_type, note, created_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(employee_id, work_date) DO UPDATE SET
      hours=excluded.hours, day_type=excluded.day_type,
      note=excluded.note, updated_at=datetime('now')
  `)

  const deleteStmt = db.prepare('DELETE FROM overtime_records WHERE employee_id = ? AND work_date = ?')

  const tx = db.transaction(() => {
    for (const u of (upserts ?? [])) {
      upsertStmt.run(crypto.randomUUID(), u.employee_id, u.work_date, u.hours, u.day_type, u.note ?? null, u.created_by)
    }
    if (deletes?.employee_ids?.length && deletes.work_date) {
      for (const eid of deletes.employee_ids) {
        deleteStmt.run(eid, deletes.work_date)
      }
    }
  })

  try {
    tx()
  } catch (err: any) {
    console.error('[POST /api/overtime] DB error:', err)
    return NextResponse.json({ ok: false, error: err?.message ?? 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
