import { getDb } from '@/lib/db'
import { PageHeader } from '@/components/layout/page-header'
import { KeToanOverview } from '@/components/overtime/ke-toan-overview'

export default async function KeToanPage() {
  const db = getDb()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const records = db.prepare(`
    SELECT r.employee_id, r.hours, r.day_type, e.department_id, d.name as dept_name
    FROM overtime_records r
    INNER JOIN employees e ON r.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE r.work_date >= ? AND r.work_date <= ?
  `).all(monthStart, monthEnd) as any[]

  const deptSummary: Record<string, { name: string; hours: number; count: number }> = {}
  const empSet = new Set<string>()

  records.forEach(r => {
    empSet.add(r.employee_id)
    const key = r.department_id ?? 'other'
    const name = r.dept_name ?? 'Khác'
    if (!deptSummary[key]) deptSummary[key] = { name, hours: 0, count: 0 }
    deptSummary[key].hours += r.hours
    deptSummary[key].count++
  })

  const totalHours = records.reduce((s, r) => s + r.hours, 0)

  return (
    <div>
      <PageHeader title="Tổng quan tăng ca" description={`Tháng ${month}/${year}`} />
      <div className="p-6">
        <KeToanOverview
          totalHours={totalHours}
          totalEmployees={empSet.size}
          deptSummary={Object.values(deptSummary)}
          monthLabel={`${month}/${year}`}
        />
      </div>
    </div>
  )
}
