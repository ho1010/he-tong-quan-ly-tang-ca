import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { getDb } from '@/lib/db'
import { PageHeader } from '@/components/layout/page-header'
import { MonthlySummaryTable } from '@/components/overtime/monthly-summary-table'

export default async function TongHopPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const db = getDb()
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(user.sub) as any
  if (!profile?.department_id) redirect('/dashboard')

  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(profile.department_id) as any

  return (
    <div>
      <PageHeader title="Tổng hợp tháng" description={`Phòng ban: ${dept?.name ?? ''}`} />
      <div className="p-6">
        <MonthlySummaryTable departmentId={profile.department_id} departmentName={dept?.name ?? ''} />
      </div>
    </div>
  )
}
