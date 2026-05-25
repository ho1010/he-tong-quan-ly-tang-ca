import { getDb } from '@/lib/db'
import { PageHeader } from '@/components/layout/page-header'
import { AccountManager } from '@/components/admin/account-manager'

export default async function TaiKhoanPage() {
  const db = getDb()
  const profiles = db.prepare(`
    SELECT p.id, p.email, p.full_name, p.role, p.department_id, d.name as dept_name
    FROM profiles p LEFT JOIN departments d ON p.department_id = d.id ORDER BY p.role
  `).all() as any[]

  const departments = db.prepare('SELECT id, name FROM departments ORDER BY name').all() as any[]

  const profilesFormatted = profiles.map(p => ({
    ...p,
    departments: p.dept_name ? { name: p.dept_name } : null,
  }))

  return (
    <div>
      <PageHeader title="Quản lý tài khoản" description="Tạo và quản lý tài khoản người dùng" />
      <div className="p-6">
        <AccountManager profiles={profilesFormatted} departments={departments} />
      </div>
    </div>
  )
}
