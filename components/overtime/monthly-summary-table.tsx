'use client'

import { useState, useEffect, useRef } from 'react'
import { getMonthStart, getMonthEnd } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Search, X, ChevronLeft, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DAY_TYPES, DAY_TYPE_LABELS } from '@/lib/types'
import type { DayType } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

interface SummaryRow {
  employee_code: string
  full_name: string
  byType: Record<DayType, number>
  total_hours: number
}

interface RawRecord {
  employee_code: string
  full_name: string
  work_date: string
  day_type: DayType
  hours: number
  note: string | null
}

interface Props {
  departmentId: string
  departmentName: string
}

const TYPE_HEADER: Record<DayType, { pct: string; sub: string; color: string; bg: string; badge: string }> = {
  ot150:  { pct: '150%', sub: 'Ngày thường', color: 'text-blue-700',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700' },
  ot200:  { pct: '200%', sub: 'CN ban ngày', color: 'text-orange-700', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
  ot200n: { pct: '200%', sub: 'Đêm thường', color: 'text-cyan-700',   bg: 'bg-cyan-50',   badge: 'bg-cyan-100 text-cyan-700' },
  ot210:  { pct: '210%', sub: 'Đêm HC',     color: 'text-purple-700', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
  ot270:  { pct: '270%', sub: 'Đêm CN',     color: 'text-pink-700',   bg: 'bg-pink-50',   badge: 'bg-pink-100 text-pink-700' },
  ot300:  { pct: '300%', sub: 'Ngày lễ',    color: 'text-red-700',    bg: 'bg-red-50',    badge: 'bg-red-100 text-red-700' },
  ot390:  { pct: '390%', sub: 'Đêm lễ',     color: 'text-rose-800',   bg: 'bg-rose-50',   badge: 'bg-rose-200 text-rose-800' },
}

function emptyByType(): Record<DayType, number> {
  return { ot150: 0, ot200: 0, ot200n: 0, ot210: 0, ot270: 0, ot300: 0, ot390: 0 }
}

export function MonthlySummaryTable({ departmentId }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rows, setRows] = useState<SummaryRow[]>([])
  const [rawData, setRawData] = useState<RawRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [selectedEmp, setSelectedEmp] = useState<SummaryRow | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    setSelectedEmp(null)
    const from = getMonthStart(year, month)
    const to = getMonthEnd(year, month)
    const res = await fetch(`/api/overtime?from=${from}&to=${to}&deptId=${departmentId}&noPage=1`)
    const { data } = await res.json()

    const map: Record<string, SummaryRow> = {}
    ;(data ?? []).forEach((r: any) => {
      const key = r.employee_code
      if (!map[key]) map[key] = { employee_code: r.employee_code, full_name: r.full_name, byType: emptyByType(), total_hours: 0 }
      const dt = r.day_type as DayType
      if (DAY_TYPES.includes(dt)) map[key].byType[dt] += r.hours
      map[key].total_hours += r.hours
    })

    setRows(Object.values(map).sort((a, b) => a.employee_code.localeCompare(b.employee_code)))
    setRawData(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [year, month, departmentId])

  // Auto-select when search narrows to exactly 1 result
  const filteredRows = searchName.trim()
    ? rows.filter(r =>
        r.full_name.toLowerCase().includes(searchName.toLowerCase()) ||
        r.employee_code.toLowerCase().includes(searchName.toLowerCase())
      )
    : rows

  useEffect(() => {
    if (filteredRows.length === 1 && searchName.trim()) {
      setSelectedEmp(filteredRows[0])
    } else if (filteredRows.length !== 1) {
      setSelectedEmp(null)
    }
  }, [filteredRows.length, searchName])

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const totalHours = rows.reduce((s, r) => s + r.total_hours, 0)
  const COL_SPAN = 3 + DAY_TYPES.length + 1

  // Daily records for selected employee
  const empDailyRecords = selectedEmp
    ? rawData
        .filter(r => r.employee_code === selectedEmp.employee_code)
        .sort((a, b) => a.work_date.localeCompare(b.work_date))
    : []

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Tháng:</span>
        <Select value={String(month)} onValueChange={v => { if (v) { setMonth(Number(v)); setSearchName(''); setSelectedEmp(null) } }}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{months.map(m => <SelectItem key={m} value={String(m)}>Tháng {m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => { if (v) { setYear(Number(v)); setSearchName(''); setSelectedEmp(null) } }}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tải lại'}
        </Button>

        {/* Name search */}
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <Input
            ref={searchRef}
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            placeholder="Tìm tên hoặc mã NV..."
            className="pl-8 pr-8 h-9 w-56 text-sm"
          />
          {searchName && (
            <button className="absolute right-2 text-gray-400 hover:text-gray-600" onClick={() => { setSearchName(''); setSelectedEmp(null) }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="ml-auto flex gap-3 text-sm">
          <div className="bg-blue-50 rounded-lg px-4 py-2 text-center">
            <p className="font-bold text-blue-700 text-lg">{rows.length}</p>
            <p className="text-blue-600 text-xs">Nhân viên tăng ca</p>
          </div>
          <div className="bg-green-50 rounded-lg px-4 py-2 text-center">
            <p className="font-bold text-green-700 text-lg">{totalHours.toFixed(1)}</p>
            <p className="text-green-600 text-xs">Tổng giờ</p>
          </div>
        </div>
      </div>

      {/* ── DETAIL VIEW (single employee) ── */}
      {selectedEmp ? (
        <div className="space-y-3">
          {/* Back + Employee header */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3 mb-4">
              <button
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-700 transition-colors"
                onClick={() => { setSelectedEmp(null); setSearchName('') }}
              >
                <ChevronLeft className="w-4 h-4" />Quay lại danh sách
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">{selectedEmp.full_name}</p>
                  <p className="text-xs text-gray-500 font-mono">{selectedEmp.employee_code}</p>
                </div>
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                {DAY_TYPES.filter(t => selectedEmp.byType[t] > 0).map(t => (
                  <div key={t} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium', TYPE_HEADER[t].badge)}>
                    <span className="font-bold">{TYPE_HEADER[t].pct}</span>
                    <span className="opacity-70">{TYPE_HEADER[t].sub}</span>
                    <span className="font-bold ml-1">{selectedEmp.byType[t].toFixed(1)}h</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-800 text-white">
                  Tổng: {selectedEmp.total_hours.toFixed(1)}h
                </div>
              </div>
            </div>
          </div>

          {/* Daily breakdown table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">
                Chi tiết tăng ca tháng {month}/{year}
              </span>
              <span className="text-xs text-gray-400">({empDailyRecords.length} ngày)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-center px-3 py-3 font-semibold text-gray-600 w-12">STT</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 w-32">Ngày</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-600 w-20">Thứ</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Loại tăng ca</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 w-24">Số giờ</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {empDailyRecords.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">Không có dữ liệu</td></tr>
                  ) : empDailyRecords.map((rec, idx) => {
                    const dateObj = parseISO(rec.work_date)
                    const th = TYPE_HEADER[rec.day_type]
                    return (
                      <tr key={idx} className="border-b last:border-0 hover:bg-gray-50/50">
                        <td className="px-3 py-2.5 text-center text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-center font-mono text-xs text-gray-700">
                          {format(dateObj, 'dd/MM/yyyy')}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-gray-500">
                          {format(dateObj, 'EEEE', { locale: vi }).replace('thứ ', 'Thứ ')}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', th.badge)}>
                            {th.pct} — {DAY_TYPE_LABELS[rec.day_type]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn('font-bold text-base', th.color)}>{rec.hours}</span>
                          <span className="text-xs text-gray-400 ml-1">giờ</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{rec.note ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
                {empDailyRecords.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t font-semibold">
                      <td colSpan={4} className="px-4 py-3 text-right text-gray-600">Tổng cộng:</td>
                      <td className="px-4 py-3 text-center text-blue-700 text-base font-bold">
                        {selectedEmp.total_hours.toFixed(1)}
                        <span className="text-xs font-normal ml-1">giờ</span>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

      ) : (
        /* ── SUMMARY TABLE (all employees) ── */
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 860 }}>
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-center px-3 py-3 font-semibold text-gray-600 whitespace-nowrap w-12">STT</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600 whitespace-nowrap w-28">Mã NV</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Họ và tên</th>
                {DAY_TYPES.map(t => (
                  <th key={t} className={cn('text-center px-3 py-2 whitespace-nowrap w-20', TYPE_HEADER[t].bg)}>
                    <div className={cn('font-bold text-sm', TYPE_HEADER[t].color)}>{TYPE_HEADER[t].pct}</div>
                    <div className="text-gray-400 font-normal text-xs">{TYPE_HEADER[t].sub}</div>
                  </th>
                ))}
                <th className="text-center px-3 py-3 font-semibold text-gray-600 whitespace-nowrap w-20 bg-gray-100">
                  Tổng giờ
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COL_SPAN} className="text-center py-10 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Đang tải...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={COL_SPAN} className="text-center py-10 text-gray-400">
                    {searchName ? `Không tìm thấy "${searchName}"` : 'Không có dữ liệu tăng ca trong tháng này'}
                  </td>
                </tr>
              ) : filteredRows.map((row, idx) => (
                <tr
                  key={row.employee_code}
                  className="border-b last:border-0 hover:bg-blue-50/40 cursor-pointer transition-colors"
                  onClick={() => setSelectedEmp(row)}
                  title="Nhấn để xem chi tiết"
                >
                  <td className="px-3 py-2.5 text-center text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap">
                      {row.employee_code}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap text-center">{row.full_name}</td>
                  {DAY_TYPES.map(t => {
                    const val = row.byType[t]
                    return (
                      <td key={t} className={cn('px-3 py-2.5 text-center text-sm', val > 0 ? TYPE_HEADER[t].bg : '')}>
                        {val > 0
                          ? <span className={cn('font-semibold', TYPE_HEADER[t].color)}>{val.toFixed(1)}</span>
                          : <span className="text-gray-200">—</span>}
                      </td>
                    )
                  })}
                  <td className={cn('px-3 py-2.5 text-center font-bold bg-gray-50', row.total_hours > 0 ? 'text-blue-700' : 'text-gray-300')}>
                    {row.total_hours.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="bg-gray-100 border-t font-semibold">
                  <td colSpan={3} className="px-4 py-3 text-right text-gray-600 text-xs">Tổng cộng:</td>
                  {DAY_TYPES.map(t => {
                    const sum = filteredRows.reduce((s, r) => s + r.byType[t], 0)
                    return (
                      <td key={t} className="px-3 py-3 text-center">
                        {sum > 0
                          ? <span className={cn('font-bold', TYPE_HEADER[t].color)}>{sum.toFixed(1)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                    )
                  })}
                  <td className="px-3 py-3 text-center font-bold text-blue-700">
                    {filteredRows.reduce((s, r) => s + r.total_hours, 0).toFixed(1)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
