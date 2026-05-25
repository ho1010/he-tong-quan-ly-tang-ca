import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { getDb } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import type { Profile } from '@/lib/types'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const db = getDb()
  const profile = db.prepare(`
    SELECT p.*, d.name as dept_name FROM profiles p
    LEFT JOIN departments d ON p.department_id = d.id WHERE p.id = ?
  `).get(user.sub) as any

  if (!profile) redirect('/login')

  const profileWithDept = {
    ...profile,
    departments: profile.dept_name ? { name: profile.dept_name } : null,
  }

  return <AppLayout profile={profileWithDept as unknown as Profile}>{children}</AppLayout>
}
