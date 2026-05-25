import { getDb } from '@/lib/db'
import { PageHeader } from '@/components/layout/page-header'
import { OvertimeDetailTable } from '@/components/overtime/overtime-detail-table'

export default async function ChiTietPage() {
  const db = getDb()
  const departments = db.prepare('SELECT id, name FROM departments ORDER BY name').all() as any[]
  const employees = db.prepare(
    'SELECT id, full_name, employee_code, department_id FROM employees WHERE is_active = 1 ORDER BY employee_code'
  ).all() as any[]

  return (
    <div>
      <PageHeader title="Chi tiết tăng ca" description="Xem và lọc dữ liệu tăng ca tất cả phòng ban" />
      <div className="p-6">
        <OvertimeDetailTable departments={departments} employees={employees} />
      </div>
    </div>
  )
}
