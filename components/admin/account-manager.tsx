'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile, Department, UserRole } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'

type ProfileWithDept = Omit<Profile, 'departments'> & {
  email: string
  departments?: { name: string } | null
}

interface Props {
  profiles: ProfileWithDept[]
  departments: Pick<Department, 'id' | 'name'>[]
}

const roleBadgeColor: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700',
  accounting: 'bg-blue-100 text-blue-700',
  department_head: 'bg-green-100 text-green-700',
}

export function AccountManager({ profiles: initProfiles, departments }: Props) {
  const [profiles, setProfiles] = useState(initProfiles)
  const [isOpen, setIsOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editing, setEditing] = useState<ProfileWithDept | null>(null)
  const [role, setRole] = useState<UserRole>('department_head')
  const [deptId, setDeptId] = useState('')
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('department_head')
  const [newDeptId, setNewDeptId] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProfileWithDept | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openEdit(p: ProfileWithDept) {
    setEditing(p); setRole(p.role); setDeptId(p.department_id ?? ''); setFullName(p.full_name ?? ''); setNewPw(''); setIsOpen(true)
  }

  function openDelete(p: ProfileWithDept) {
    setDeleteTarget(p); setDeleteId(p.id)
  }

  async function handleUpdateProfile() {
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch(`/api/profiles/${editing.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, role, department_id: deptId || null, new_password: newPw || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const formatted = { ...data, departments: data.dept_name ? { name: data.dept_name } : null }
      setProfiles(prev => prev.map(p => p.id === editing.id ? formatted : p))
      toast.success('Đã cập nhật tài khoản')
      setIsOpen(false)
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate() {
    if (!newEmail || !newPassword || !newName) { toast.error('Vui lòng nhập đầy đủ thông tin'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword, full_name: newName, role: newRole, department_id: newRole === 'department_head' ? newDeptId || null : null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const formatted = { ...data, departments: data.dept_name ? { name: data.dept_name } : null }
      setProfiles(prev => [...prev, formatted])
      toast.success('Đã tạo tài khoản thành công')
      setIsCreateOpen(false)
      setNewEmail(''); setNewPassword(''); setNewName(''); setNewRole('department_head'); setNewDeptId('')
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/profiles/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProfiles(prev => prev.filter(p => p.id !== deleteId))
      toast.success('Đã xoá tài khoản')
      setDeleteId(null)
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setNewEmail(''); setNewPassword(''); setNewName(''); setNewRole('department_head'); setNewDeptId(''); setIsCreateOpen(true) }}
          className="bg-blue-700 hover:bg-blue-800 gap-2">
          <Plus className="w-4 h-4" />Tạo tài khoản
        </Button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-12">STT</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Họ và tên</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-28">Vai trò</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Phòng ban</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 w-28">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {profiles.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Chưa có tài khoản nào</td></tr>
            ) : profiles.map((p, idx) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-gray-500">{idx + 1}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      {(p.full_name ?? '?').charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900">{p.full_name ?? '(Chưa có tên)'}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{p.email}</td>
                <td className="px-4 py-2.5">
                  <Badge className={`${roleBadgeColor[p.role]} border-0`}>{ROLE_LABELS[p.role]}</Badge>
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {p.role === 'department_head' ? (p.departments?.name ?? <span className="text-orange-500">Chưa gán</span>) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600" onClick={() => openEdit(p)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600" onClick={() => openDelete(p)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Chỉnh sửa tài khoản</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Họ và tên</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mật khẩu mới <span className="text-gray-400 font-normal text-xs">(để trống nếu không đổi)</span></Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Tối thiểu 6 ký tự" />
            </div>
            <div className="space-y-2">
              <Label>Vai trò</Label>
              <Select value={role} onValueChange={v => setRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Quản trị viên</SelectItem>
                  <SelectItem value="accounting">Kế toán</SelectItem>
                  <SelectItem value="department_head">Trưởng phòng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === 'department_head' && (
              <div className="space-y-2">
                <Label>Phòng ban</Label>
                <Select value={deptId} onValueChange={v => { if (v) setDeptId(v) }}>
                  <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
            <Button onClick={handleUpdateProfile} disabled={saving} className="bg-blue-700 hover:bg-blue-800">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tạo tài khoản mới</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Họ và tên <span className="text-red-500">*</span></Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nguyễn Văn A" />
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@hytech.com" />
            </div>
            <div className="space-y-2">
              <Label>Mật khẩu <span className="text-red-500">*</span></Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" />
            </div>
            <div className="space-y-2">
              <Label>Vai trò</Label>
              <Select value={newRole} onValueChange={v => setNewRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Quản trị viên</SelectItem>
                  <SelectItem value="accounting">Kế toán</SelectItem>
                  <SelectItem value="department_head">Trưởng phòng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newRole === 'department_head' && (
              <div className="space-y-2">
                <Label>Phòng ban</Label>
                <Select value={newDeptId} onValueChange={v => { if (v) setNewDeptId(v) }}>
                  <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-blue-700 hover:bg-blue-800">
              {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Tạo tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={open => { if (!open) { setDeleteId(null); setDeleteTarget(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Xác nhận xoá tài khoản</DialogTitle></DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-gray-600">
              Bạn có chắc chắn muốn xoá tài khoản này không?
            </p>
            {deleteTarget && (
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1">
                <div><span className="text-gray-500">Họ tên:</span> <span className="font-medium">{deleteTarget.full_name}</span></div>
                <div><span className="text-gray-500">Email:</span> <span className="font-medium">{deleteTarget.email}</span></div>
                <div><span className="text-gray-500">Vai trò:</span> <Badge className={`${roleBadgeColor[deleteTarget.role]} border-0 ml-1`}>{ROLE_LABELS[deleteTarget.role]}</Badge></div>
              </div>
            )}
            <p className="text-xs text-red-500">Hành động này không thể hoàn tác.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteId(null); setDeleteTarget(null) }}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Xoá tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
