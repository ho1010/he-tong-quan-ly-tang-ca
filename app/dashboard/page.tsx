import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { getDb } from '@/lib/db'
import { OvertimeEntryTable } from '@/components/overtime/overtime-entry-table'
import { PageHeader } from '@/components/layout/page-header'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const db = getDb()
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(user.sub) as any
  if (!profile) redirect('/login')

  const departmentId = profile.department_id
  if (!departmentId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Tài khoản của bạn chưa được gán phòng ban. Vui lòng liên hệ quản trị viên.
        </div>
      </div>
    )
  }

  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(departmentId) as any
  const employees = db.prepare(
    'SELECT * FROM employees WHERE department_id = ? AND is_active = 1 ORDER BY employee_code'
  ).all(departmentId) as any[]

  const emps = employees.map(e => ({ ...e, is_active: e.is_active === 1 }))

  return (
    <div>
      <PageHeader title="Nhập tăng ca hôm nay" description={`Phòng ban: ${dept?.name ?? ''}`} />
      <div className="p-6">
        <OvertimeEntryTable employees={emps} departmentName={dept?.name ?? ''} userId={user.sub} />
      </div>
    </div>
  )
}
