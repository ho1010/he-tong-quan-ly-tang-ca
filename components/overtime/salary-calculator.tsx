'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, Loader2, Eye } from 'lucide-react'
import { getMonthStart, getMonthEnd, formatCurrency, calcOvertimePay } from '@/lib/utils/format'
import { exportSalaryToExcel, exportEmployeeDetailToExcel, type SalaryExportRow } from '@/lib/excel-export'
import { parseISO, format } from 'date-fns'
import { DAY_TYPE_LABELS, DAY_TYPES, DAY_TYPE_MULTIPLIERS } from '@/lib/types'
import type { Department, OvertimeRateRule, DayType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TypeStat { hours: number; pay: number }

interface SalaryRow {
  employee_id: string
  employee_code: string
  full_name: string
  department: string
  base_salary: number
  byType: Record<DayType, TypeStat>
  total_hours: number
  total_pay: number
}

interface DetailRow {
  work_date: string
  hours: number
  day_type: DayType
  hourly_rate: number
  multiplier: number
  pay: number
}

interface Props {
  departments: Pick<Department, 'id' | 'name'>[]
  rateRules: OvertimeRateRule[]
}

const TYPE_COLORS: Record<DayType, string> = {
  ot130: 'bg-gray-100 text-gray-600',
  ot150: 'bg-blue-100 text-blue-700',
  ot200: 'bg-orange-100 text-orange-700',
  ot210: 'bg-purple-100 text-purple-700',
  ot270: 'bg-pink-100 text-pink-700',
  ot300: 'bg-red-100 text-red-700',
  ot390: 'bg-rose-200 text-rose-800',
}

const TYPE_BG: Record<DayType, string> = {
  ot130: 'bg-gray-50/40',
  ot150: 'bg-blue-50/40',
  ot200: 'bg-orange-50/40',
  ot210: 'bg-purple-50/40',
  ot270: 'bg-pink-50/40',
  ot300: 'bg-red-50/40',
  ot390: 'bg-rose-50/40',
}

function emptyByType(): Record<DayType, TypeStat> {
  return Object.fromEntries(DAY_TYPES.map(t => [t, { hours: 0, pay: 0 }])) as Record<DayType, TypeStat>
}

// Period-aware salary lookup for a specific work date.
// Priority 1: exact period match (effective_from ≤ date AND (no end OR effective_to ≥ date))
// Priority 2: most recent period that started on or before the date (covers expired contracts)
function getSalaryForDate(salaries: any[], empId: string, workDate: string): number {
  const empSalaries = salaries
    .filter(s => s.employee_id === empId)
    .sort((a: any, b: any) => b.effective_from.localeCompare(a.effective_from))

  // Exact period match
  const exact = empSalaries.find(s =>
    s.effective_from <= workDate &&
    (s.effective_to == null || s.effective_to >= workDate)
  )
  if (exact) return exact.base_salary

  // Fallback: latest period that started on or before this date
  const fallback = empSalaries.find(s => s.effective_from <= workDate)
  if (fallback) return fallback.base_salary

  // Last resort: earliest available salary for this employee
  return empSalaries[empSalaries.length - 1]?.base_salary ?? 0
}

export function SalaryCalculator({ departments, rateRules }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [deptId, setDeptId] = useState('all')
  const [rows, setRows] = useState<SalaryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<SalaryRow | null>(null)
  const [detailRows, setDetailRows] = useState<DetailRow[]>([])
  // Store fetched salary periods so openDetail can reuse them
  const [storedSalaries, setStoredSalaries] = useState<any[]>([])

  const getMultiplier = (dt: DayType) =>
    rateRules.find(r => r.day_type === dt)?.multiplier ?? DAY_TYPE_MULTIPLIERS[dt] ?? 1.5

  const load = useCallback(async () => {
    setLoading(true)
    const from = getMonthStart(year, month)
    const to = getMonthEnd(year, month)
    const params = new URLSearchParams({ from, to, noPage: '1' })
    if (deptId !== 'all') params.set('deptId', deptId)

    const [overtimeRes, salaryRes] = await Promise.all([
      fetch(`/api/overtime?${params}`),
      // Fetch all salary periods that started on or before end of month
      // (covers expired contracts via fallback in getSalaryForDate)
      fetch(`/api/salary-settings?before=${to}`),
    ])
    const { data: records } = await overtimeRes.json()
    const salaries: any[] = await salaryRes.json()
    setStoredSalaries(salaries)

    if (!records) { setRows([]); setLoading(false); return }

    const empMap: Record<string, SalaryRow> = {}
    records.forEach((r: any) => {
      const id = r.employee_id
      // Period-aware: find salary valid on this specific work_date
      const salary = getSalaryForDate(salaries, id, r.work_date)
      if (!empMap[id]) empMap[id] = {
        employee_id: id, employee_code: r.employee_code, full_name: r.full_name,
        department: r.dept_name ?? '', base_salary: salary,
        byType: emptyByType(), total_hours: 0, total_pay: 0,
      }
      const dt = r.day_type as DayType
      const multiplier = getMultiplier(dt)
      const pay = calcOvertimePay(salary, r.hours, multiplier)
      empMap[id].byType[dt].hours += r.hours
      empMap[id].byType[dt].pay += pay
      empMap[id].total_hours += r.hours
      empMap[id].total_pay += pay
    })

    // For the "Lương CB" display column, show the most recent salary this month
    Object.values(empMap).forEach(row => {
      const latest = salaries
        .filter(s => s.employee_id === row.employee_id)
        .sort((a: any, b: any) => b.effective_from.localeCompare(a.effective_from))[0]
      if (latest) row.base_salary = latest.base_salary
    })

    setRows(Object.values(empMap).sort((a, b) => a.employee_code.localeCompare(b.employee_code)))
    setLoading(false)
  }, [year, month, deptId, rateRules])

  useEffect(() => { load() }, [load])

  async function openDetail(row: SalaryRow) {
    setSelectedRow(row)
    const from = getMonthStart(year, month)
    const to = getMonthEnd(year, month)
    const res = await fetch(`/api/overtime?from=${from}&to=${to}&empId=${row.employee_id}&noPage=1&sort=work_date&dir=asc`)
    const { data } = await res.json()
    const details: DetailRow[] = (data ?? []).map((r: any) => {
      const dt = r.day_type as DayType
      const multiplier = getMultiplier(dt)
      // Use period-aware salary for each individual work date
      const salary = getSalaryForDate(storedSalaries, row.employee_id, r.work_date) || row.base_salary
      return {
        work_date: r.work_date, hours: r.hours, day_type: dt,
        hourly_rate: salary / (26 * 8),
        multiplier,
        pay: calcOvertimePay(salary, r.hours, multiplier),
      }
    })
    setDetailRows(details)
    setDetailOpen(true)
  }

  // Only show types that have data in current result
  const activeTypes = DAY_TYPES.filter(t => rows.some(r => r.byType[t].hours > 0))

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const totals = rows.reduce((acc, r) => {
    DAY_TYPES.forEach(t => {
      acc.byType[t].hours += r.byType[t].hours
      acc.byType[t].pay += r.byType[t].pay
    })
    acc.total_hours += r.total_hours
    acc.total_pay += r.total_pay
    return acc
  }, { byType: emptyByType(), total_hours: 0, total_pay: 0 })

  // Export helper — pass all 6-type data and only active columns
  function handleExport() {
    const exportData: SalaryExportRow[] = rows.map(r => ({
      employee_code: r.employee_code,
      full_name: r.full_name,
      department: r.department,
      base_salary: r.base_salary,
      byType: r.byType,
      total_pay: r.total_pay,
    }))
    exportSalaryToExcel(exportData, activeTypes, `${month}/${year}`)
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium text-gray-600">Tháng/Năm:</span>
          <Select value={String(month)} onValueChange={v => { if (v) setMonth(Number(v)) }}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m} value={String(m)}>Tháng {m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => { if (v) setYear(Number(v)) }}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium text-gray-600">Phòng ban:</span>
          <Select value={deptId} onValueChange={v => { if (v) setDeptId(v) }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <Button onClick={handleExport} className="bg-green-700 hover:bg-green-800 text-white gap-2">
            <Download className="w-4 h-4" />Xuất Excel
          </Button>
        </div>
      </div>

      {/* Rate info */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-600 rounded-t-xl">
          <span className="text-white font-semibold text-sm tracking-wide">Bảng hệ số tăng ca</span>
          <span className="text-blue-100 text-xs">Lương giờ = Lương CB ÷ (26 × 8) × Hệ số</span>
        </div>
        {/* Rate cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 divide-x divide-y border-t">
          {rateRules.map((r, idx) => {
            const dt = r.day_type as DayType
            const colorMap: Record<DayType, { bg: string; badge: string; mul: string }> = {
              ot130: { bg: 'bg-gray-50',    badge: 'bg-gray-200 text-gray-700',       mul: 'text-gray-700' },
              ot150: { bg: 'bg-blue-50',    badge: 'bg-blue-200 text-blue-800',       mul: 'text-blue-700' },
              ot200: { bg: 'bg-orange-50',  badge: 'bg-orange-200 text-orange-800',   mul: 'text-orange-600' },
              ot210: { bg: 'bg-purple-50',  badge: 'bg-purple-200 text-purple-800',   mul: 'text-purple-700' },
              ot270: { bg: 'bg-pink-50',    badge: 'bg-pink-200 text-pink-800',       mul: 'text-pink-700' },
              ot300: { bg: 'bg-red-50',     badge: 'bg-red-200 text-red-800',         mul: 'text-red-600' },
              ot390: { bg: 'bg-rose-50',    badge: 'bg-rose-200 text-rose-900',       mul: 'text-rose-700' },
            }
            const c = colorMap[dt] ?? { bg: 'bg-white', badge: 'bg-gray-100 text-gray-600', mul: 'text-gray-700' }
            return (
              <div key={r.id} className={cn('flex flex-col items-center justify-center gap-1.5 px-3 py-3 text-center', c.bg)}>
                <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', c.badge)}>
                  {r.multiplier}x
                </span>
                <span className="text-xs text-gray-600 leading-tight">{r.rule_name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main table */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 700 }}>
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-3 py-3 font-semibold text-gray-600 w-10 whitespace-nowrap">STT</th>
              <th className="text-left px-3 py-3 font-semibold text-gray-600 w-20 whitespace-nowrap">Mã NV</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Họ và tên</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Phòng ban</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Lương CB</th>
              {activeTypes.map(t => (
                <th key={t} className={cn('text-right px-3 py-3 font-semibold text-gray-600 whitespace-nowrap w-24', TYPE_BG[t])}>
                  {t.toUpperCase()} ({DAY_TYPE_MULTIPLIERS[t]}x)
                </th>
              ))}
              <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap w-24">Tổng giờ</th>
              <th className="text-right px-4 py-3 font-semibold text-green-700 whitespace-nowrap w-32 bg-green-50/50">Tổng tiền TC</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8 + activeTypes.length} className="text-center py-10 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Đang tính toán...
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8 + activeTypes.length} className="text-center py-10 text-gray-400">
                Không có dữ liệu tăng ca trong tháng này
              </td></tr>
            ) : rows.map((row, idx) => (
              <tr key={row.employee_id} className="border-b last:border-0 hover:bg-gray-50/50">
                <td className="px-3 py-2.5 text-gray-400 text-center text-xs">{idx + 1}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap">{row.employee_code}</span>
                </td>
                <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{row.full_name}</td>
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">{row.department}</td>
                <td className="px-4 py-2.5 text-right text-gray-600 text-xs whitespace-nowrap">
                  {row.base_salary > 0 ? formatCurrency(row.base_salary) : <span className="text-red-400">Chưa có</span>}
                </td>
                {activeTypes.map(t => (
                  <td key={t} className={cn('px-3 py-2.5 text-right text-xs', TYPE_BG[t])}>
                    {row.byType[t].hours > 0 ? (
                      <div>
                        <div className="font-semibold text-gray-700">{row.byType[t].hours.toFixed(1)}h</div>
                        <div className="text-gray-500">{formatCurrency(row.byType[t].pay)}</div>
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right font-semibold text-gray-700">{row.total_hours.toFixed(1)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-green-700 text-xs bg-green-50/30 whitespace-nowrap">
                  {formatCurrency(row.total_pay)}
                </td>
                <td className="px-3 py-2.5">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600" onClick={() => openDetail(row)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t font-bold">
                <td colSpan={5} className="px-4 py-3 text-right text-gray-600">Tổng cộng:</td>
                {activeTypes.map(t => (
                  <td key={t} className={cn('px-3 py-3 text-right text-xs', TYPE_BG[t])}>
                    <div>{totals.byType[t].hours.toFixed(1)}h</div>
                    <div>{formatCurrency(totals.byType[t].pay)}</div>
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-gray-700">{totals.total_hours.toFixed(1)}</td>
                <td className="px-4 py-3 text-right text-green-700 bg-green-50/50 text-xs">{formatCurrency(totals.total_pay)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4 pr-6">
              <DialogTitle>Chi tiết tăng ca: {selectedRow?.full_name} — Tháng {month}/{year}</DialogTitle>
              {selectedRow && (
                <Button
                  size="sm"
                  onClick={() => exportEmployeeDetailToExcel(
                    {
                      employee_code: selectedRow.employee_code,
                      full_name: selectedRow.full_name,
                      department: selectedRow.department,
                      base_salary: selectedRow.base_salary,
                      total_hours: selectedRow.total_hours,
                      total_pay: selectedRow.total_pay,
                    },
                    detailRows,
                    `${month}/${year}`
                  )}
                  className="bg-green-700 hover:bg-green-800 text-white gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />Xuất Excel
                </Button>
              )}
            </div>
          </DialogHeader>
          {selectedRow && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 text-sm grid grid-cols-3 gap-2">
                <div><span className="text-gray-500">Lương CB:</span> <strong>{formatCurrency(selectedRow.base_salary)}</strong></div>
                <div><span className="text-gray-500">Lương giờ:</span> <strong>{formatCurrency(Math.round(selectedRow.base_salary / (26 * 8)))}</strong></div>
                <div><span className="text-gray-500">Tổng tăng ca:</span> <strong className="text-green-700">{formatCurrency(selectedRow.total_pay)}</strong></div>
              </div>
              {/* Per-date breakdown */}
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 560 }}>
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Ngày</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Giờ</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Loại tăng ca</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Lương giờ</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Hệ số</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map((d, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{format(parseISO(d.work_date), 'dd/MM/yyyy')}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">{d.hours}</td>
                        <td className="px-4 py-2">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs whitespace-nowrap', TYPE_COLORS[d.day_type])}>
                            {DAY_TYPE_LABELS[d.day_type]}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-xs text-gray-600 whitespace-nowrap">{formatCurrency(Math.round(d.hourly_rate))}</td>
                        <td className="px-4 py-2 text-right font-semibold whitespace-nowrap">{d.multiplier}x</td>
                        <td className="px-4 py-2 text-right font-semibold text-green-700 text-xs whitespace-nowrap">{formatCurrency(d.pay)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t font-bold">
                      <td colSpan={5} className="px-4 py-2.5 text-right text-gray-700">Tổng cộng:</td>
                      <td className="px-4 py-2.5 text-right text-green-700 text-xs">{formatCurrency(detailRows.reduce((s, d) => s + d.pay, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
