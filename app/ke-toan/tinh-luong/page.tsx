import { getDb } from '@/lib/db'
import { PageHeader } from '@/components/layout/page-header'
import { SalaryCalculator } from '@/components/overtime/salary-calculator'

export default async function TinhLuongPage() {
  const db = getDb()
  const departments = db.prepare('SELECT id, name FROM departments ORDER BY name').all() as any[]
  const rules = db.prepare('SELECT * FROM overtime_rate_rules WHERE is_active = 1 ORDER BY day_type').all() as any[]

  return (
    <div>
      <PageHeader title="Tính lương tăng ca" description="Tính toán và xuất bảng lương tăng ca theo tháng" />
      <div className="p-6">
        <SalaryCalculator departments={departments} rateRules={rules} />
      </div>
    </div>
  )
}
