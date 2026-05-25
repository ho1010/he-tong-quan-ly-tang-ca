'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, parseISO } from 'date-fns'
import { Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMonthStart, getMonthEnd } from '@/lib/utils/format'
import { exportOvertimeToExcel } from '@/lib/excel-export'
import type { Department, Employee, DayType } from '@/lib/types'
import { DAY_TYPE_LABELS, DAY_TYPES } from '@/lib/types'

const PAGE_SIZE = 20

interface Props {
  departments: Pick<Department, 'id' | 'name'>[]
  employees: Pick<Employee, 'id' | 'full_name' | 'employee_code' | 'department_id'>[]
}

export function OvertimeDetailTable({ departments, employees }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [deptId, setDeptId] = useState('all')
  const [empId, setEmpId] = useState('all')
  const [dayType, setDayType] = useState('all')
  const [page, setPage] = useState(1)
  const [records, setRecords] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sortField, setSortField] = useState<'work_date' | 'hours'>('work_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filteredEmployees = deptId === 'all' ? employees : employees.filter(e => e.department_id === deptId)

  const buildParams = useCallback(() => {
    const from = getMonthStart(year, month)
    const to = getMonthEnd(year, month)
    const params = new URLSearchParams({ from, to, sort: sortField, dir: sortDir, page: String(page), pageSize: String(PAGE_SIZE) })
    if (deptId !== 'all') params.set('deptId', deptId)
    if (empId !== 'all') params.set('empId', empId)
    if (dayType !== 'all') params.set('dayType', dayType)
    return params.toString()
  }, [year, month, deptId, empId, dayType, page, sortField, sortDir])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/overtime?${buildParams()}`)
    const { data, total: t } = await res.json()
    setRecords(data ?? [])
    setTotal(t ?? 0)
    setLoading(false)
  }, [buildParams])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const totalHours = records.reduce((s, r) => s + r.hours, 0)

  function handleSort(field: 'work_date' | 'hours') {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
    setPage(1)
  }

  async function handleExport() {
    const params = new URLSearchParams(buildParams())
    params.delete('page'); params.delete('pageSize'); params.set('noPage', '1')
    const res = await fetch(`/api/overtime?${params.toString()}`)
    const { data } = await res.json()
    exportOvertimeToExcel(data ?? [], `${month}/${year}`)
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Tháng/Năm:</span>
            <Select value={String(month)} onValueChange={v => { if (v) { setMonth(Number(v)); setPage(1) } }}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{months.map(m => <SelectItem key={m} value={String(m)}>Tháng {m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={v => { if (v) { setYear(Number(v)); setPage(1) } }}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-gray-600">Phòng ban:</span>
            <Select value={deptId} onValueChange={v => { if (v) { setDeptId(v); setEmpId('all'); setPage(1) } }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-gray-600">Nhân viên:</span>
            <Select value={empId} onValueChange={v => { if (v) { setEmpId(v); setPage(1) } }}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {filteredEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.employee_code} - {e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Loại tăng ca:</span>
            <Select value={dayType} onValueChange={v => { if (v) { setDayType(v); setPage(1) } }}>
              <SelectTrigger className="w-80"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {DAY_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{DAY_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleExport} className="bg-green-700 hover:bg-green-800 text-white gap-2 ml-auto">
            <Download className="w-4 h-4" />Xuất Excel
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-12">STT</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-blue-700 w-28 select-none" onClick={() => handleSort('work_date')}>
                  Ngày {sortField === 'work_date' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-24">Mã NV</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Họ và tên</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Phòng ban</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-28">Loại tăng ca</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-blue-700 w-24 select-none" onClick={() => handleSort('hours')}>
                  Số giờ {sortField === 'hours' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Đang tải...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Không có dữ liệu phù hợp</td></tr>
              ) : records.map((r, idx) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-500">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="px-4 py-2.5 text-gray-700 font-mono text-xs">{format(parseISO(r.work_date), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-2.5"><span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono">{r.employee_code}</span></td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{r.full_name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.dept_name}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                      r.day_type === 'ot130' ? 'bg-gray-100 text-gray-600' :
                      r.day_type === 'ot150' ? 'bg-blue-100 text-blue-700' :
                      r.day_type === 'ot200' ? 'bg-orange-100 text-orange-700' :
                      r.day_type === 'ot210' ? 'bg-purple-100 text-purple-700' :
                      r.day_type === 'ot270' ? 'bg-pink-100 text-pink-700' :
                      r.day_type === 'ot300' ? 'bg-red-100 text-red-700' :
                      'bg-rose-200 text-rose-800')}>
                      {DAY_TYPE_LABELS[r.day_type as keyof typeof DAY_TYPE_LABELS] ?? r.day_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{r.hours}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{r.note ?? '-'}</td>
                </tr>
              ))}
            </tbody>
            {records.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t font-semibold">
                  <td colSpan={6} className="px-4 py-3 text-right text-gray-600">Tổng trang này ({records.length} bản ghi):</td>
                  <td className="px-4 py-3 text-right text-blue-700">{totalHours.toFixed(1)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total} bản ghi</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-sm text-gray-700">Trang {page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
