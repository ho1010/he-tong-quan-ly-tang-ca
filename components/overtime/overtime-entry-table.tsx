'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, Loader2, Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDayType } from '@/lib/utils/format'
import { toast } from 'sonner'
import type { Employee, DayType } from '@/lib/types'

interface EntryRow {
  employee: Employee
  hours: string
  day_type: DayType
  note: string
}

interface Props {
  employees: Employee[]
  departmentName: string
  userId: string
}

export function OvertimeEntryTable({ employees, departmentName, userId }: Props) {
  const [date, setDate] = useState<Date>(new Date())
  const [rows, setRows] = useState<EntryRow[]>([])
  const [saving, setSaving] = useState(false)
  const [savingIdx, setSavingIdx] = useState<number | null>(null)
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null)
  const [loadingRecords, setLoadingRecords] = useState(false)
  // Track which employee_ids have saved records in DB
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set())

  const loadRecords = useCallback(async (d: Date) => {
    if (employees.length === 0) { setRows([]); return }
    setLoadingRecords(true)
    try {
      const dateStr = format(d, 'yyyy-MM-dd')
      const res = await fetch(`/api/overtime?from=${dateStr}&to=${dateStr}&noPage=1`)
      const { data } = await res.json()
      const dayT = getDayType(d)
      const saved = new Set<string>()
      const newRows: EntryRow[] = employees.map(emp => {
        const rec = data?.find((r: any) => r.employee_id === emp.id)
        if (rec) saved.add(emp.id)
        return { employee: emp, hours: rec ? String(rec.hours) : '', day_type: rec ? rec.day_type : dayT, note: rec?.note ?? '' }
      })
      setRows(newRows)
      setSavedSet(saved)
    } catch (err) {
      console.error('loadRecords error:', err)
      const dayT = getDayType(d)
      setRows(employees.map(emp => ({ employee: emp, hours: '', day_type: dayT, note: '' })))
      setSavedSet(new Set())
    } finally {
      setLoadingRecords(false)
    }
  }, [employees])

  useEffect(() => { loadRecords(date) }, [date, loadRecords])

  function updateRow(idx: number, field: keyof Omit<EntryRow, 'employee'>, value: string) {
    setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [field]: value } as EntryRow; return next })
  }

  // Save a single row
  async function handleSaveRow(idx: number) {
    const row = rows[idx]
    const dateStr = format(date, 'yyyy-MM-dd')
    setSavingIdx(idx)
    try {
      const hours = parseFloat(row.hours)
      const res = await fetch('/api/overtime', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upserts: (!row.hours || hours <= 0) ? [] : [{ employee_id: row.employee.id, work_date: dateStr, hours, day_type: row.day_type, note: row.note || null, created_by: userId }],
          deletes: { employee_ids: (!row.hours || hours <= 0) ? [row.employee.id] : [], work_date: dateStr },
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error ?? 'Lỗi lưu')
      if (!row.hours || hours <= 0) {
        setSavedSet(prev => { const s = new Set(prev); s.delete(row.employee.id); return s })
        toast.success(`Đã xoá tăng ca của ${row.employee.full_name}`)
      } else {
        setSavedSet(prev => new Set(prev).add(row.employee.id))
        toast.success(`Đã lưu tăng ca của ${row.employee.full_name}`)
      }
    } catch (err: any) {
      toast.error('Lỗi: ' + (err.message ?? 'Vui lòng thử lại'))
    } finally {
      setSavingIdx(null)
    }
  }

  // Delete a single row with confirmation
  async function handleDeleteRow(idx: number) {
    const row = rows[idx]
    const dateStr = format(date, 'yyyy-MM-dd')
    toast(`Xoá tăng ca của "${row.employee.full_name}"?`, {
      action: {
        label: 'Xoá',
        onClick: async () => {
          setDeletingIdx(idx)
          try {
            const res = await fetch('/api/overtime', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ upserts: [], deletes: { employee_ids: [row.employee.id], work_date: dateStr } }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json?.error ?? 'Lỗi xoá')
            const dayT = getDayType(date)
            setRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], hours: '', day_type: dayT, note: '' }; return next })
            setSavedSet(prev => { const s = new Set(prev); s.delete(row.employee.id); return s })
            toast.success(`Đã xoá tăng ca của ${row.employee.full_name}`)
          } catch (err: any) {
            toast.error('Lỗi khi xoá: ' + (err.message ?? ''))
          } finally {
            setDeletingIdx(null)
          }
        },
      },
      cancel: { label: 'Huỷ', onClick: () => {} },
    })
  }

  // Save all rows at once
  async function handleSave() {
    setSaving(true)
    const dateStr = format(date, 'yyyy-MM-dd')
    const upserts = rows
      .filter(row => row.hours !== '' && parseFloat(row.hours) > 0)
      .map(row => ({ employee_id: row.employee.id, work_date: dateStr, hours: parseFloat(row.hours), day_type: row.day_type, note: row.note || null, created_by: userId }))
    const deleteEmpIds = rows.filter(row => row.hours === '' || parseFloat(row.hours) === 0).map(row => row.employee.id)
    try {
      const res = await fetch('/api/overtime', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upserts, deletes: { employee_ids: deleteEmpIds, work_date: dateStr } }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error ?? 'Lỗi lưu dữ liệu')
      // Update savedSet
      const newSaved = new Set<string>()
      rows.forEach(row => { if (row.hours !== '' && parseFloat(row.hours) > 0) newSaved.add(row.employee.id) })
      setSavedSet(newSaved)
      toast.success(`Đã lưu tăng ca ngày ${format(date, 'dd/MM/yyyy')} thành công!`)
    } catch (err: any) {
      toast.error('Lỗi khi lưu: ' + (err.message ?? 'Vui lòng thử lại'))
    } finally {
      setSaving(false)
    }
  }

  const totalHours = rows.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0)
  const countWithOT = rows.filter(r => parseFloat(r.hours) > 0).length

  return (
    <div className="space-y-4">
      {/* Date picker + stats */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Ngày tăng ca:</span>
          <DatePicker
            value={format(date, 'yyyy-MM-dd')}
            onChange={v => { if (v) setDate(new Date(v + 'T00:00:00')) }}
            placeholder="Chọn ngày"
            showWeekday
            yearRange={Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i)}
          />
        </div>
        <div className="flex gap-3 ml-auto items-center text-sm">
          <div className="bg-blue-50 rounded-lg px-4 py-2 text-center">
            <p className="font-bold text-blue-700 text-lg">{countWithOT}</p>
            <p className="text-blue-600 text-xs">Nhân viên tăng ca</p>
          </div>
          <div className="bg-green-50 rounded-lg px-4 py-2 text-center">
            <p className="font-bold text-green-700 text-lg">{totalHours.toFixed(1)}</p>
            <p className="text-green-600 text-xs">Tổng giờ tăng ca</p>
          </div>
          <Button onClick={handleSave} disabled={saving || loadingRecords} className="bg-blue-700 hover:bg-blue-800 px-6">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang lưu...</> : <><Save className="w-4 h-4 mr-2" />Lưu tất cả</>}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 920 }}>
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-center px-3 py-3 font-semibold text-gray-600 whitespace-nowrap w-12">STT</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600 whitespace-nowrap w-28">Mã NV</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap w-44">Họ và tên</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Loại tăng ca</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap w-32">Số giờ tăng ca</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap w-48">Ghi chú</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600 whitespace-nowrap w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loadingRecords ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Đang tải dữ liệu...
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Không có nhân viên nào trong phòng ban</td></tr>
              ) : rows.map((row, idx) => {
                const hasSaved = savedSet.has(row.employee.id)
                const isSavingThis = savingIdx === idx
                const isDeletingThis = deletingIdx === idx
                return (
                  <tr key={row.employee.id} className={cn(
                    'border-b last:border-0 hover:bg-gray-50/50 transition-colors',
                    hasSaved && 'bg-blue-50/30'
                  )}>
                    <td className="px-3 py-2.5 text-center text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap">
                        {row.employee.employee_code}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-900">{row.employee.full_name}</span>
                        {hasSaved && <span className="inline-flex items-center gap-0.5 text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full whitespace-nowrap"><Check className="w-3 h-3" />Đã lưu</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Select value={row.day_type} onValueChange={v => { if (v) updateRow(idx, 'day_type', v) }}>
                        <SelectTrigger className="h-8 text-xs w-full min-w-[260px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ot130">Làm việc ban đêm (130%)</SelectItem>
                          <SelectItem value="ot150">Tăng ca ngày thường ban ngày (150%)</SelectItem>
                          <SelectItem value="ot200">Làm ngày chủ nhật ban ngày (200%)</SelectItem>
                          <SelectItem value="ot210">Tăng ca đêm ngày thường (210%)</SelectItem>
                          <SelectItem value="ot270">Làm ngày chủ nhật ban đêm (270%)</SelectItem>
                          <SelectItem value="ot300">Làm ngày lễ/Tết ban ngày (300%)</SelectItem>
                          <SelectItem value="ot390">Làm ngày lễ/Tết ban đêm (390%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2.5">
                      <Input
                        type="number" min={0} max={24} step={0.5}
                        value={row.hours}
                        onChange={e => updateRow(idx, 'hours', e.target.value)}
                        placeholder="0"
                        className="h-8 w-24 text-center mx-auto block"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <Input value={row.note} onChange={e => updateRow(idx, 'note', e.target.value)} placeholder="Ghi chú (tuỳ chọn)" className="h-8 min-w-[160px]" />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        {/* Save row */}
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleSaveRow(idx)}
                          disabled={isSavingThis || isDeletingThis || saving}
                          title="Lưu hàng này"
                        >
                          {isSavingThis
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Save className="w-3.5 h-3.5" />}
                        </Button>
                        {/* Delete row — only if record exists in DB */}
                        {hasSaved && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteRow(idx)}
                            disabled={isDeletingThis || isSavingThis || saving}
                            title="Xoá bản ghi"
                          >
                            {isDeletingThis
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-right text-gray-600">Tổng:</td>
                  <td className="px-4 py-3 text-center text-blue-700">{totalHours.toFixed(1)} giờ</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

    </div>
  )
}
