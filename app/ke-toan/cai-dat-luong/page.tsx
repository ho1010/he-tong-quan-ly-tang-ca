import { getDb } from '@/lib/db'
import { PageHeader } from '@/components/layout/page-header'
import { SalarySettingsManager } from '@/components/admin/salary-settings-manager'

// Always fetch fresh data from DB on every visit
export const dynamic = 'force-dynamic'

export default async function CaiDatLuongPage() {
  const db = getDb()

  const employees = db.prepare(`
    SELECT e.*, d.name as dept_name FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id WHERE e.is_active = 1 ORDER BY e.employee_code
  `).all() as any[]

  const departments = db.prepare('SELECT id, name FROM departments ORDER BY name').all() as any[]
  const rules = db.prepare('SELECT * FROM overtime_rate_rules ORDER BY day_type').all() as any[]

  // Fetch ALL salary periods, sorted newest-first per employee
  const salaryPeriods = db.prepare(
    'SELECT * FROM salary_settings ORDER BY employee_id, effective_from DESC'
  ).all() as any[]

  const empsFormatted = employees.map(e => ({
    ...e,
    is_active: e.is_active === 1,
    departments: e.dept_name ? { name: e.dept_name } : null,
  }))

  return (
    <div>
      <PageHeader title="Cài đặt lương tăng ca" description="Thiết lập lương cơ bản và hệ số tăng ca" />
      <div className="p-6">
        <SalarySettingsManager
          employees={empsFormatted}
          departments={departments}
          rateRules={rules}
          salaryPeriods={salaryPeriods}
        />
      </div>
    </div>
  )
}
