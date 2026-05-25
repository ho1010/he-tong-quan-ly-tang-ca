import { getDb } from '@/lib/db'
import { PageHeader } from '@/components/layout/page-header'
import { EmployeeManager } from '@/components/admin/employee-manager'

export default async function NhanVienPage() {
  const db = getDb()
  const employees = db.prepare(`
    SELECT e.*, d.name as dept_name FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id ORDER BY e.employee_code
  `).all() as any[]

  const departments = db.prepare('SELECT id, name FROM departments ORDER BY name').all() as any[]

  const empsFormatted = employees.map(e => ({
    ...e,
    is_active: e.is_active === 1,
    departments: e.dept_name ? { name: e.dept_name } : null,
  }))

  return (
    <div>
      <PageHeader title="Quản lý nhân viên" description="Thêm, sửa, xoá thông tin nhân viên" />
      <div className="p-6">
        <EmployeeManager employees={empsFormatted} departments={departments} />
      </div>
    </div>
  )
}
