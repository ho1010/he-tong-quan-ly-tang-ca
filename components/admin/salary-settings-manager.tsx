'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Search, Save, Pencil, Loader2, Calculator, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/format'
import type { Employee, Department, OvertimeRateRule } from '@/lib/types'
import { format, parseISO } from 'date-fns'

// Use local-time Date objects to avoid UTC midnight timezone issues
const DATE_MIN = new Date(2025, 0, 1)   // Jan 1 2025, local midnight
const DATE_MAX = new Date(2030, 11, 31) // Dec 31 2030, local midnight

interface SalaryPeriod {
  id: string
  employee_id: string
  base_salary: number
  effective_from: string
  effective_to: string | null
  created_at?: string
}

interface Props {
  employees: (Employee & { departments?: { name: string } | null })[]
  departments: Pick<Department, 'id' | 'name'>[]
  rateRules: OvertimeRateRule[]
  salaryPeriods: SalaryPeriod[]
}

// ── Shared save helper ────────────────────────────────────────────────────────
async function postSalary(
  inserts: { employee_id: string; base_salary: number; effective_from: string; effective_to: string | null }[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/salary-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inserts),
    })
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`
      try { const body = await res.json(); errMsg = body.error ?? errMsg } catch { /* ignore */ }
      return { ok: false, error: errMsg }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Lỗi kết nối' }
  }
}

export function SalarySettingsManager({
  employees,
  departments,
  rateRules: initRules,
  salaryPeriods: initPeriods,
}: Props) {
  const [activeTab, setActiveTab] = useState<'salary' | 'rules'>('salary')
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [rules, setRules] = useState(initRules)

  // ── Per-row input state ──────────────────────────────────────────────────
  const [rowFrom, setRowFrom] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    employees.forEach(e => {
      const latest = initPeriods
        .filter(p => p.employee_id === e.id)
        .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]
      init[e.id] = latest?.effective_from ?? ''
    })
    return init
  })

  const [rowTo, setRowTo] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    employees.forEach(e => {
      const latest = initPeriods
        .filter(p => p.employee_id === e.id)
        .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]
      init[e.id] = latest?.effective_to ?? ''
    })
    return init
  })

  const [salaryValues, setSalaryValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    employees.forEach(e => {
      const latest = initPeriods
        .filter(p => p.employee_id === e.id)
        .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]
      init[e.id] = latest ? String(latest.base_salary) : ''
    })
    return init
  })

  // ── Fetch fresh salary data from API (runs on mount + after save) ────────
  const refreshSalaries = useCallback(async () => {
    try {
      const res = await fetch('/api/salary-settings')
      if (!res.ok) return
      const periods: SalaryPeriod[] = await res.json()
      const newFrom: Record<string, string> = {}
      const newTo: Record<string, string> = {}
      const newSalary: Record<string, string> = {}
      employees.forEach(e => {
        const latest = periods
          .filter(p => p.employee_id === e.id)
          .sort((a, b) =>
            b.effective_from.localeCompare(a.effective_from) ||
            (b.created_at ?? '').localeCompare(a.created_at ?? '')
          )[0]
        newFrom[e.id] = latest?.effective_from ?? ''
        newTo[e.id] = latest?.effective_to ?? ''
        newSalary[e.id] = latest ? String(latest.base_salary) : ''
      })
      setRowFrom(newFrom)
      setRowTo(newTo)
      setSalaryValues(newSalary)
    } catch { /* ignore */ }
  }, [employees])

  // Refresh on every mount (fixes Next.js router-cache stale data)
  useEffect(() => { refreshSalaries() }, [refreshSalaries])

  // ── Save state ───────────────────────────────────────────────────────────
  const [savingBulk, setSavingBulk] = useState(false)
  const [savingEmpId, setSavingEmpId] = useState<string | null>(null)
  const [savedEmpIds, setSavedEmpIds] = useState<Set<string>>(new Set())

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => employees.filter(e => {
    const matchSearch =
      !search ||
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase())
    const matchDept = filterDept === 'all' || e.department_id === filterDept
    return matchSearch && matchDept
  }), [employees, search, filterDept])

  // ── Save all visible rows ────────────────────────────────────────────────
  async function handleSaveAll() {
    const inserts = filtered
      .filter(e => {
        const v = salaryValues[e.id]
        const from = rowFrom[e.id]
        return from && v && !isNaN(parseFloat(v)) && parseFloat(v) > 0
      })
      .map(e => ({
        employee_id: e.id,
        base_salary: parseFloat(salaryValues[e.id]),
        effective_from: rowFrom[e.id],
        effective_to: rowTo[e.id] || null,
      }))

    if (inserts.length === 0) {
      toast.error('Chưa có nhân viên nào đủ dữ liệu (cần: ngày bắt đầu + lương > 0)')
      return
    }

    setSavingBulk(true)
    const { ok, error } = await postSalary(inserts)
    setSavingBulk(false)

    if (!ok) {
      toast.error(`Lỗi khi lưu: ${error}`)
    } else {
      // Mark all saved rows as checkmarked briefly
      const savedIds = inserts.map(i => i.employee_id)
      setSavedEmpIds(prev => { const n = new Set(prev); savedIds.forEach(id => n.add(id)); return n })
      setTimeout(() => setSavedEmpIds(prev => { const n = new Set(prev); savedIds.forEach(id => n.delete(id)); return n }), 2500)
      toast.success(`Đã lưu lương cho ${inserts.length} nhân viên`)
    }
  }

  // ── Save single row ──────────────────────────────────────────────────────
  async function handleSaveRow(empId: string) {
    const from = rowFrom[empId]
    const v = salaryValues[empId]

    if (!from) { toast.error('Vui lòng chọn ngày bắt đầu hiệu lực'); return }
    if (!v || isNaN(parseFloat(v)) || parseFloat(v) <= 0) {
      toast.error('Vui lòng nhập lương hợp lệ (> 0)')
      return
    }

    setSavingEmpId(empId)
    const { ok, error } = await postSalary([{
      employee_id: empId,
      base_salary: parseFloat(v),
      effective_from: from,
      effective_to: rowTo[empId] || null,
    }])
    setSavingEmpId(null)

    if (!ok) {
      toast.error(`Lỗi khi lưu: ${error}`)
    } else {
      setSavedEmpIds(prev => { const n = new Set(prev); n.add(empId); return n })
      setTimeout(() => setSavedEmpIds(prev => { const n = new Set(prev); n.delete(empId); return n }), 2500)
      toast.success('Đã lưu')
    }
  }

  // ── Rate rules ───────────────────────────────────────────────────────────
  async function updateRule(id: string, multiplier: number) {
    try {
      const res = await fetch('/api/rate-rules', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, multiplier }),
      })
      if (!res.ok) { toast.error('Lỗi cập nhật'); return }
      const data = await res.json()
      setRules(prev => prev.map(r => r.id === id ? data : r))
      toast.success('Đã cập nhật hệ số')
    } catch { toast.error('Lỗi kết nối') }
  }

  function formatDate(d: string | null | undefined): string {
    if (!d) return '—'
    try { return format(parseISO(d), 'dd/MM/yyyy') } catch { return d ?? '—' }
  }

  const dayTypeLabel: Record<string, string> = {
    ot130: 'Làm việc ban đêm (130%)',
    ot150: 'Tăng ca ngày thường ban ngày (150%)',
    ot200: 'Làm ngày chủ nhật ban ngày (200%)',
    ot210: 'Tăng ca đêm ngày thường (210%)',
    ot270: 'Làm ngày chủ nhật ban đêm (270%)',
    ot300: 'Làm ngày lễ/Tết ban ngày (300%)',
    ot390: 'Làm ngày lễ/Tết ban đêm (390%)',
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['salary', 'rules'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'salary' ? 'Lương cơ bản nhân viên' : 'Hệ số tăng ca'}
          </button>
        ))}
      </div>

      {/* ── Lương cơ bản tab ── */}
      {activeTab === 'salary' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="bg-white rounded-xl border p-4 space-y-3">
            {/* Row 1: search + dept + save all */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm tên hoặc mã nhân viên..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterDept} onValueChange={v => { if (v) setFilterDept(v) }}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Phòng ban" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả phòng ban</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSaveAll}
                disabled={savingBulk}
                className="bg-blue-700 hover:bg-blue-800 gap-2 ml-auto"
              >
                {savingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu tất cả
              </Button>
            </div>

          </div>

          {/* Formula hint */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-sm text-blue-700 flex items-center gap-2">
            <Calculator className="w-4 h-4 shrink-0" />
            Công thức: Lương giờ tăng ca = Lương cơ bản ÷ (26 ngày × 8 giờ) × Hệ số
          </div>

          {/* Main table */}
          <div className="rounded-xl border bg-white overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 1080 }}>
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-center px-3 py-3 font-semibold text-gray-600 w-10">STT</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-600 w-20 whitespace-nowrap">Mã NV</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Họ và tên</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Phòng ban</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap w-64">
                    Kỳ hợp đồng
                    <div className="text-xs font-normal text-gray-400">Từ ngày → Đến ngày</div>
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap w-48">
                    Lương cơ bản (VND)
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap w-52">
                    Kỳ hiệu lực
                  </th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-600 w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">Không tìm thấy nhân viên</td>
                  </tr>
                ) : filtered.map((emp, idx) => {
                  const isSaving = savingEmpId === emp.id
                  const isSaved = savedEmpIds.has(emp.id)
                  const fromVal = rowFrom[emp.id] ?? ''
                  const toVal = rowTo[emp.id] ?? ''
                  const salaryVal = salaryValues[emp.id] ?? ''
                  const canSave = !!(fromVal && salaryVal && parseFloat(salaryVal) > 0)

                  return (
                    <tr
                      key={emp.id}
                      className={cn(
                        'border-b last:border-0 hover:bg-gray-50/50',
                        isSaved ? 'bg-green-50/30' : canSave ? 'bg-blue-50/10' : ''
                      )}
                    >
                      <td className="px-3 py-2.5 text-gray-400 text-center text-xs">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap">
                          {emp.employee_code}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-medium text-gray-900 whitespace-nowrap">
                        {emp.full_name}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                        {emp.departments?.name ?? '—'}
                      </td>

                      {/* Contract period date pickers */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 justify-center">
                          <DatePicker
                            value={fromVal}
                            onChange={v => setRowFrom(p => ({ ...p, [emp.id]: v }))}
                            placeholder="Từ ngày"
                            size="sm"
                            minDate={DATE_MIN}
                            maxDate={DATE_MAX}
                            yearRange={[2025,2026,2027,2028,2029,2030]}
                          />
                          <span className="text-gray-400 text-xs shrink-0">→</span>
                          <DatePicker
                            value={toVal}
                            onChange={v => setRowTo(p => ({ ...p, [emp.id]: v }))}
                            placeholder="Đến ngày"
                            size="sm"
                            minDate={DATE_MIN}
                            maxDate={DATE_MAX}
                            yearRange={[2025,2026,2027,2028,2029,2030]}
                          />
                        </div>
                      </td>

                      {/* Salary input */}
                      <td className="px-4 py-2">
                        <SalaryInput
                          value={salaryVal}
                          onChange={v => setSalaryValues(p => ({ ...p, [emp.id]: v }))}
                        />
                      </td>

                      {/* Kỳ hiệu lực: reflects current row input */}
                      <td className="px-4 py-2.5 text-center text-xs whitespace-nowrap">
                        {fromVal || salaryVal ? (
                          <div className="space-y-0.5">
                            {fromVal && (
                              <div className="text-gray-600 font-mono">
                                {formatDate(fromVal)}
                                {' → '}
                                {toVal
                                  ? formatDate(toVal)
                                  : <span className="text-green-600 font-semibold">Hiện tại</span>}
                              </div>
                            )}
                            {salaryVal && parseFloat(salaryVal) > 0 && (
                              <div className="text-blue-700 font-semibold">
                                {formatCurrency(parseFloat(salaryVal))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-orange-400 text-xs">Chưa nhập</span>
                        )}
                      </td>

                      {/* Per-row save button */}
                      <td className="px-3 py-2.5 text-center">
                        {isSaved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                            <Check className="w-3.5 h-3.5" />Đã lưu
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSaveRow(emp.id)}
                            disabled={isSaving || savingBulk}
                            className={cn(
                              'h-7 px-3 text-xs gap-1',
                              canSave
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-gray-400 hover:bg-gray-500'
                            )}
                          >
                            {isSaving
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Save className="w-3.5 h-3.5" />}
                            Lưu
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Hệ số tăng ca tab ── */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Loại ngày</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Tên quy tắc</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 w-36">Hệ số</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    label={dayTypeLabel[rule.day_type] ?? rule.day_type}
                    onSave={updateRule}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <strong>Lưu ý:</strong> Thay đổi hệ số sẽ áp dụng cho các tính toán mới.
          </div>
        </div>
      )}
    </div>
  )
}

// ── RuleRow ────────────────────────────────────────────────────────────────
function RuleRow({
  rule,
  label,
  onSave,
}: {
  rule: OvertimeRateRule
  label: string
  onSave: (id: string, multiplier: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(rule.multiplier))
  const [saving, setSaving] = useState(false)

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50/50">
      <td className="px-5 py-3 font-medium text-gray-900">{label}</td>
      <td className="px-5 py-3 text-gray-600">{rule.rule_name}</td>
      <td className="px-5 py-3 text-right">
        {editing ? (
          <Input
            type="number" min={1} max={10} step={0.1}
            value={value}
            onChange={e => setValue(e.target.value)}
            className="h-8 w-24 text-right ml-auto"
            autoFocus
          />
        ) : (
          <span className="font-bold text-blue-700 text-base">{rule.multiplier}x</span>
        )}
      </td>
      <td className="px-5 py-3 text-right">
        {editing ? (
          <div className="flex justify-end gap-1">
            <Button
              size="sm" className="h-8 bg-blue-700 hover:bg-blue-800" disabled={saving}
              onClick={async () => {
                setSaving(true)
                await onSave(rule.id, parseFloat(value))
                setSaving(false)
                setEditing(false)
              }}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Lưu'}
            </Button>
            <Button size="sm" variant="outline" className="h-8"
              onClick={() => { setValue(String(rule.multiplier)); setEditing(false) }}>
              Hủy
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="h-8 text-gray-400 hover:text-blue-600"
            onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </td>
    </tr>
  )
}

// ── SalaryInput ────────────────────────────────────────────────────────────
function SalaryInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false)

  const formatted =
    value && !isNaN(Number(value)) && Number(value) > 0
      ? Number(value).toLocaleString('en-US')
      : value

  return (
    <input
      type="text"
      inputMode="numeric"
      value={focused ? value : formatted}
      placeholder="0"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={e => {
        const raw = e.target.value.replace(/,/g, '')
        if (raw === '' || /^\d+$/.test(raw)) onChange(raw)
      }}
      className="h-8 w-full text-right font-mono text-sm border border-input rounded-lg px-3 bg-transparent focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
    />
  )
}
