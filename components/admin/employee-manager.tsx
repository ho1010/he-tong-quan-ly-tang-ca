'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Employee, Department } from '@/lib/types'

type EmpWithDept = Omit<Employee, 'departments'> & {
  departments?: { name: string } | null
}

interface Props {
  employees: EmpWithDept[]
  departments: Pick<Department, 'id' | 'name'>[]
}

interface FormState {
  full_name: string
  employee_code: string
  department_id: string | null
  is_active: boolean
}

const EMPTY: FormState = { full_name: '', employee_code: '', department_id: null, is_active: true }

export function EmployeeManager({ employees: initEmployees, departments }: Props) {
  const [employees, setEmployees] = useState(initEmployees)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<EmpWithDept | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => employees.filter(e => {
    const matchSearch = !search || e.full_name.toLowerCase().includes(search.toLowerCase()) || e.employee_code.toLowerCase().includes(search.toLowerCase())
    const matchDept = filterDept === 'all' || e.department_id === filterDept
    return matchSearch && matchDept
  }), [employees, search, filterDept])

  function openAdd() { setEditing(null); setForm(EMPTY); setIsOpen(true) }
  function openEdit(e: EmpWithDept) {
    setEditing(e)
    setForm({ full_name: e.full_name, employee_code: e.employee_code, department_id: e.department_id ?? null, is_active: e.is_active })
    setIsOpen(true)
  }

  async function handleSave() {
    if (!form.full_name.trim() || !form.employee_code.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc'); return
    }
    setSaving(true)
    try {
      const payload = { full_name: form.full_name.trim(), employee_code: form.employee_code.trim(), department_id: form.department_id || null, is_active: form.is_active }
      if (editing) {
        const res = await fetch(`/api/employees/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        const formatted = { ...data, is_active: data.is_active === 1, departments: data.dept_name ? { name: data.dept_name } : null }
        setEmployees(prev => prev.map(e => e.id === editing.id ? formatted : e))
        toast.success('Đã cập nhật nhân viên')
      } else {
        const res = await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        const formatted = { ...data, is_active: data.is_active === 1, departments: data.dept_name ? { name: data.dept_name } : null }
        setEmployees(prev => [...prev, formatted])
        toast.success('Đã thêm nhân viên mới')
      }
      setIsOpen(false)
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/employees/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Xoá thất bại')
      setEmployees(prev => prev.filter(e => e.id !== deleteId))
      toast.success('Đã xoá nhân viên')
      setDeleteId(null)
    } catch (err: any) {
      toast.error('Lỗi khi xoá: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Tìm kiếm tên, mã nhân viên..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterDept} onValueChange={v => { if (v) setFilterDept(v) }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Phòng ban" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả phòng ban</SelectItem>
            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button onClick={openAdd} className="bg-blue-700 hover:bg-blue-800 gap-2">
            <Plus className="w-4 h-4" />Thêm nhân viên
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-12">STT</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-24">Mã NV</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Họ và tên</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Phòng ban</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-28">Trạng thái</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Không tìm thấy nhân viên</td></tr>
            ) : filtered.map((emp, idx) => (
              <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-gray-500">{idx + 1}</td>
                <td className="px-4 py-2.5"><span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono">{emp.employee_code}</span></td>
                <td className="px-4 py-2.5 font-medium text-gray-900">{emp.full_name}</td>
                <td className="px-4 py-2.5 text-gray-600">{emp.departments?.name ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={emp.is_active ? 'default' : 'secondary'}
                    className={emp.is_active ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                    {emp.is_active ? 'Đang làm' : 'Đã nghỉ'}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600" onClick={() => openEdit(emp)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600" onClick={() => setDeleteId(emp.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-500">
          Hiển thị {filtered.length} / {employees.length} nhân viên
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Họ và tên <span className="text-red-500">*</span></Label>
              <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Nguyễn Văn A" />
            </div>
            <div className="space-y-2">
              <Label>Mã nhân viên <span className="text-red-500">*</span></Label>
              <Input value={form.employee_code} onChange={e => setForm(p => ({ ...p, employee_code: e.target.value }))} placeholder="HY001" />
            </div>
            <div className="space-y-2">
              <Label>Phòng ban</Label>
              <Select value={form.department_id ?? ''} onValueChange={v => setForm(p => ({ ...p, department_id: v || null }))}>
                <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="is_active" checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: !!v }))} />
              <Label htmlFor="is_active">Đang làm việc</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-700 hover:bg-blue-800">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Xác nhận xoá</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Bạn có chắc chắn muốn xoá nhân viên này? Tất cả dữ liệu tăng ca liên quan cũng sẽ bị xoá.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
