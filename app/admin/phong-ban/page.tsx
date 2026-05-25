import { getDb } from '@/lib/db'
import { PageHeader } from '@/components/layout/page-header'
import { DepartmentManager } from '@/components/admin/department-manager'

export default async function PhongBanPage() {
  const db = getDb()
  const departments = db.prepare('SELECT * FROM departments ORDER BY name').all() as any[]
  const empRows = db.prepare('SELECT department_id FROM employees WHERE is_active = 1 AND department_id IS NOT NULL').all() as { department_id: string }[]

  const countMap: Record<string, number> = {}
  empRows.forEach(e => { countMap[e.department_id] = (countMap[e.department_id] ?? 0) + 1 })

  return (
    <div>
      <PageHeader title="Quản lý phòng ban" description="Thêm, sửa, xoá phòng ban" />
      <div className="p-6">
        <DepartmentManager departments={departments} employeeCountMap={countMap} />
      </div>
    </div>
  )
}
