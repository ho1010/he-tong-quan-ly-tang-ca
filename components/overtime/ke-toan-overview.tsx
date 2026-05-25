import { Clock, Users, Building2 } from 'lucide-react'

interface DeptSummary {
  name: string
  hours: number
  count: number
}

interface Props {
  totalHours: number
  totalEmployees: number
  deptSummary: DeptSummary[]
  monthLabel: string
}

export function KeToanOverview({ totalHours, totalEmployees, deptSummary, monthLabel }: Props) {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
            <p className="text-sm text-gray-500">Tổng giờ tăng ca tháng {monthLabel}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
            <p className="text-sm text-gray-500">Nhân viên có tăng ca</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-purple-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{deptSummary.length}</p>
            <p className="text-sm text-gray-500">Phòng ban có tăng ca</p>
          </div>
        </div>
      </div>

      {/* Department breakdown */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Tổng hợp theo phòng ban</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Phòng ban</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600">Số lượt</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600">Tổng giờ</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600">TB giờ/lượt</th>
            </tr>
          </thead>
          <tbody>
            {deptSummary.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  Không có dữ liệu tăng ca trong tháng này
                </td>
              </tr>
            ) : (
              deptSummary
                .sort((a, b) => b.hours - a.hours)
                .map(dept => (
                  <tr key={dept.name} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-900">{dept.name}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{dept.count}</td>
                    <td className="px-5 py-3 text-right font-semibold text-blue-700">{dept.hours.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right text-gray-600">
                      {dept.count > 0 ? (dept.hours / dept.count).toFixed(1) : '-'}
                    </td>
                  </tr>
                ))
            )}
          </tbody>
          {deptSummary.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t font-semibold">
                <td className="px-5 py-3 text-gray-700">Tổng cộng</td>
                <td className="px-5 py-3 text-right text-gray-700">
                  {deptSummary.reduce((s, d) => s + d.count, 0)}
                </td>
                <td className="px-5 py-3 text-right text-blue-700">
                  {totalHours.toFixed(1)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
