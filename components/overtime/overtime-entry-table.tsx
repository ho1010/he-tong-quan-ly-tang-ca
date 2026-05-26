'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, Loader2, Trash2, Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDayType } from '@/lib/utils/format'
import { toast } from 'sonner'
import type { Employee, DayType } from '@/lib/types'

const OT_TYPES: { value: DayType; label: string }[] = [
  { value: 'ot130', label: 'Làm việc ban đêm (130%)' },
  { value: 'ot150', label: 'Tăng ca ngày thường ban ngày (150%)' },
  { value: 'ot200', label: 'Làm ngày chủ nhật ban ngày (200%)' },
  { value: 'ot210', label: 'Tăng ca đêm ngày thường (210%)' },
  { value: 'ot270', label: 'Làm ngày chủ nhật ban đêm (270%)' },
  { value: 'ot300', label: 'Làm ngày lễ/Tết ban ngày (300%)' },
  { value: 'ot390', label: 'Làm ngày lễ/Tết ban đêm (390%)' },
]

interface EntryItem {
  localId: string
  recordId?: string
  day_type: DayType
  hours: string
  note: string
  inDb: boolean
}

interface Props {
  employees: Employee[]
  departmentName: string
  userId: string
}

export function OvertimeEntryTable({ employees, departmentName, userId }: Props) {
  const [date, setDate] = useState<Date>(new Date())
  const [entries, setEntries] = useState<Record<string, EntryItem[]>>({})
  const [saving, setSaving] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [loadingRecords, setLoadingRecords] = useState(false)

  function makeEmpty(dayT: DayType): EntryItem {
    return { localId: crypto.randomUUID(), day_type: dayT, hours: '', note: '', inDb: false }
  }

  const loadRecords = useCallback(async (d: Date) => {
    if (employees.length === 0) { setEntries({}); return }
    setLoadingRecords(true)
    try {
      const dateStr = format(d, 'yyyy-MM-dd')
      const res = await fetch(`/api/overtime?from=${dateStr}&to=${dateStr}&noPage=1`)
      const { data } = await res.json()
      const dayT = getDayType(d)
      const map: Record<string, EntryItem[]> = {}
      employees.forEach(emp => {
        const recs = (data ?? []).filter((r: any) => r.employee_id === emp.id)
        if (recs.length > 0) {
          map[emp.id] = recs.map((r: any) => ({
            localId: r.id, recordId: r.id,
            day_type: r.day_type as DayType,
            hours: String(r.hours), note: r.note ?? '', inDb: true,
          }))
        } else {
          map[emp.id] = [makeEmpty(dayT)]
        }
      })
      setEntries(map)
    } catch {
      const dayT = getDayType(d)
      const fallback: Record<string, EntryItem[]> = {}
      employees.forEach(emp => { fallback[emp.id] = [makeEmpty(dayT)] })
      setEntries(fallback)
    } finally {
      setLoadingRecords(false)
    }
  }, [employees])

  useEffect(() => { loadRecords(date) }, [date, loadRecords])

  function updateEntry(empId: string, localId: string, field: 'day_type' | 'hours' | 'note', value: string) {
    setEntries(prev => ({
      ...prev,
      [empId]: prev[empId].map(e => e.localId === localId ? { ...e, [field]: value } : e),
    }))
  }

  function addEntry(empId: string) {
    const usedTypes = entries[empId]?.map(e => e.day_type) ?? []
    const nextType = OT_TYPES.find(t => !usedTypes.includes(t.value))?.value ?? OT_TYPES[0].value
    setEntries(prev => ({
      ...prev,
      [empId]: [...(prev[empId] ?? []), makeEmpty(nextType)],
    }))
  }

  function removeLocalEntry(empId: string, localId: string) {
    setEntries(prev => {
      const remaining = prev[empId].filter(e => e.localId !== localId)
      return { ...prev, [empId]: remaining.length > 0 ? remaining : [makeEmpty(getDayType(date))] }
    })
  }

  async function handleSaveEntry(empId: string, localId: string) {
    const entry = entries[empId]?.find(e => e.localId === localId)
    if (!entry) return
    const dateStr = format(date, 'yyyy-MM-dd')
    const key = `${empId}:${localId}`
    setSavingKey(key)
    try {
      const hours = parseFloat(entry.hours)
      if (!entry.hours || hours <= 0) {
        if (entry.inDb && entry.recordId) {
          const res = await fetch('/api/overtime', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ upserts: [], deletes: { ids: [entry.recordId] } }),
          })
          if (!res.ok) throw new Error('Lỗi xoá')
          removeLocalEntry(empId, localId)
          toast.success('Đã xoá bản ghi')
        } else {
          toast.error('Nhập số giờ tăng ca (> 0)')
        }
        return
      }
      const res = await fetch('/api/overtime', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upserts: [{ employee_id: empId, work_date: dateStr, hours, day_type: entry.day_type, note: entry.note || null, created_by: userId }],
          deletes: {},
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error ?? 'Lỗi lưu')
      setEntries(prev => ({
        ...prev,
        [empId]: prev[empId].map(e => e.localId === localId ? { ...e, inDb: true } : e),
      }))
      const emp = employees.find(e => e.id === empId)
      toast.success(`Đã lưu: ${emp?.full_name} — ${OT_TYPES.find(t => t.value === entry.day_type)?.label}`)
    } catch (err: any) {
      toast.error('Lỗi: ' + (err.message ?? 'Vui lòng thử lại'))
    } finally {
      setSavingKey(null)
    }
  }

  async function handleDeleteEntry(empId: string, localId: string) {
    const entry = entries[empId]?.find(e => e.localId === localId)
    if (!entry) return
    if (!entry.inDb || !entry.recordId) { removeLocalEntry(empId, localId); return }
    const emp = employees.find(e => e.id === empId)
    toast(`Xoá "${OT_TYPES.find(t => t.value === entry.day_type)?.label}" của ${emp?.full_name}?`, {
      action: {
        label: 'Xoá',
        onClick: async () => {
          const key = `${empId}:${localId}`
          setDeletingKey(key)
          try {
            const res = await fetch('/api/overtime', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ upserts: [], deletes: { ids: [entry.recordId] } }),
            })
            if (!res.ok) throw new Error('Lỗi xoá')
            removeLocalEntry(empId, localId)
            toast.success('Đã xoá')
          } catch (err: any) {
            toast.error('Lỗi: ' + (err.message ?? ''))
          } finally {
            setDeletingKey(null)
          }
        },
      },
      cancel: { label: 'Huỷ', onClick: () => {} },
    })
  }

  async function handleSaveAll() {
    setSaving(true)
    const dateStr = format(date, 'yyyy-MM-dd')
    const upserts: any[] = []
    for (const [empId, empEntries] of Object.entries(entries)) {
      for (const entry of empEntries) {
        const hours = parseFloat(entry.hours)
        if (entry.hours && hours > 0) {
          upserts.push({ employee_id: empId, work_date: dateStr, hours, day_type: entry.day_type, note: entry.note || null, created_by: userId })
        }
      }
    }
    try {
      const res = await fetch('/api/overtime', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upserts,
          deletes: { employee_ids: employees.map(e => e.id), work_date: dateStr },
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error ?? 'Lỗi lưu dữ liệu')
      await loadRecords(date)
      toast.success(`Đã lưu tăng ca ngày ${format(date, 'dd/MM/yyyy')}!`)
    } catch (err: any) {
      toast.error('Lỗi: ' + (err.message ?? 'Vui lòng thử lại'))
    } finally {
      setSaving(false)
    }
  }

  const totalHours = Object.values(entries).flat().reduce((s, e) => s + (parseFloat(e.hours) || 0), 0)
  const countWithOT = employees.filter(emp => entries[emp.id]?.some(e => parseFloat(e.hours) > 0)).length

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
          <Button onClick={handleSaveAll} disabled={saving || loadingRecords} className="bg-blue-700 hover:bg-blue-800 px-6">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang lưu...</> : <><Save className="w-4 h-4 mr-2" />Lưu tất cả</>}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 960 }}>
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-center px-3 py-3 font-semibold text-gray-600 w-10">STT</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600 w-24">Mã NV</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-40">Họ và tên</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Loại tăng ca</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 w-28">Số giờ</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-44">Ghi chú</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600 w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loadingRecords ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Đang tải dữ liệu...
                </td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Không có nhân viên nào trong phòng ban</td></tr>
              ) : employees.map((emp, idx) => {
                const empEntries = entries[emp.id] ?? [makeEmpty(getDayType(date))]
                const hasInDb = empEntries.some(e => e.inDb)
                const canAddMore = empEntries.length < OT_TYPES.length
                const rowSpan = empEntries.length + 1

                const entryRows = empEntries.map((entry, eIdx) => {
                  const key = `${emp.id}:${entry.localId}`
                  const isSavingThis = savingKey === key
                  const isDeletingThis = deletingKey === key
                  const otherUsed = empEntries.filter(e => e.localId !== entry.localId).map(e => e.day_type)

                  return (
                    <tr key={entry.localId} className={cn('border-b hover:bg-gray-50/40 transition-colors', entry.inDb && 'bg-blue-50/20')}>
                      {eIdx === 0 && (
                        <>
                          <td rowSpan={rowSpan} className="px-3 py-2.5 text-center text-gray-400 text-xs border-r border-gray-100 align-middle">
                            {idx + 1}
                          </td>
                          <td rowSpan={rowSpan} className="px-3 py-2.5 border-r border-gray-100 align-middle">
                            <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap">
                              {emp.employee_code}
                            </span>
                          </td>
                          <td rowSpan={rowSpan} className="px-4 py-2.5 border-r border-gray-100 align-middle">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-gray-900 whitespace-nowrap">{emp.full_name}</span>
                              {hasInDb && (
                                <span className="inline-flex items-center gap-0.5 text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full w-fit whitespace-nowrap">
                                  <Check className="w-3 h-3" />Đã lưu
                                </span>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="px-4 py-2">
                        <Select value={entry.day_type} onValueChange={v => updateEntry(emp.id, entry.localId, 'day_type', v as DayType)}>
                          <SelectTrigger className="h-8 text-xs w-full min-w-[260px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {OT_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value} disabled={otherUsed.includes(t.value)}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number" min={0} max={24} step={0.5}
                          value={entry.hours}
                          onChange={e => updateEntry(emp.id, entry.localId, 'hours', e.target.value)}
                          placeholder="0"
                          className="h-8 w-20 text-center mx-auto block"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input value={entry.note} onChange={e => updateEntry(emp.id, entry.localId, 'note', e.target.value)} placeholder="Ghi chú (tuỳ chọn)" className="h-8 min-w-[140px]" />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleSaveEntry(emp.id, entry.localId)}
                            disabled={isSavingThis || isDeletingThis || saving} title="Lưu">
                            {isSavingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => entry.inDb ? handleDeleteEntry(emp.id, entry.localId) : removeLocalEntry(emp.id, entry.localId)}
                            disabled={isDeletingThis || isSavingThis || saving} title={entry.inDb ? 'Xoá bản ghi' : 'Bỏ dòng'}>
                            {isDeletingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })

                const addRow = (
                  <tr key={`${emp.id}-add`} className="border-b bg-gray-50/50">
                    <td colSpan={4} className="px-4 py-1.5">
                      {canAddMore ? (
                        <button onClick={() => addEntry(emp.id)} disabled={saving || loadingRecords}
                          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium disabled:opacity-40 transition-colors">
                          <Plus className="w-3.5 h-3.5" />Thêm loại tăng ca
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Đã chọn tất cả loại tăng ca</span>
                      )}
                    </td>
                  </tr>
                )

                return [...entryRows, addRow]
              })}
            </tbody>
            {employees.length > 0 && (
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
