'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, Plus, Building2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Department } from '@/lib/types'

interface Props {
  departments: Department[]
  employeeCountMap: Record<string, number>
}

export function DepartmentManager({ departments: initialDepts, employeeCountMap }: Props) {
  const [depts, setDepts] = useState(initialDepts)
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openAdd() { setEditing(null); setName(''); setIsOpen(true) }
  function openEdit(d: Department) { setEditing(d); setName(d.name); setIsOpen(true) }

  async function handleSave() {
    if (!name.trim()) { toast.error('Vui lòng nhập tên phòng ban'); return }
    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/departments/${editing.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setDepts(prev => prev.map(d => d.id === editing.id ? data : d))
        toast.success('Đã cập nhật phòng ban')
      } else {
        const res = await fetch('/api/departments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setDepts(prev => [...prev, data])
        toast.success('Đã thêm phòng ban mới')
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
      const res = await fetch(`/api/departments/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDepts(prev => prev.filter(d => d.id !== deleteId))
      toast.success('Đã xoá phòng ban')
      setDeleteId(null)
    } catch (err: any) {
      toast.error('Lỗi khi xoá: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} className="bg-blue-700 hover:bg-blue-800 gap-2">
          <Plus className="w-4 h-4" />Thêm phòng ban
        </Button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-5 py-3 font-semibold text-gray-600 w-12">STT</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Tên phòng ban</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600 w-32">Số nhân viên</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600 w-28">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {depts.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">Chưa có phòng ban nào</td></tr>
            ) : depts.map((dept, idx) => (
              <tr key={dept.id} className="border-b last:border-0 hover:bg-gray-50/50">
                <td className="px-5 py-3 text-gray-500">{idx + 1}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900">{dept.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <Badge variant="secondary">{employeeCountMap[dept.id] ?? 0} nhân viên</Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600" onClick={() => openEdit(dept)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                      onClick={() => setDeleteId(dept.id)}
                      disabled={(employeeCountMap[dept.id] ?? 0) > 0}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Chỉnh sửa phòng ban' : 'Thêm phòng ban mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tên phòng ban</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Phòng Kỹ thuật"
                onKeyDown={e => e.key === 'Enter' && handleSave()} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-700 hover:bg-blue-800">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xác nhận xoá</DialogTitle></DialogHeader>
          <p className="text-gray-600 text-sm">Bạn có chắc chắn muốn xoá phòng ban này không?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
