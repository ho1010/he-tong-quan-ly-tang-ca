import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-server'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { full_name, role, department_id, new_password } = await req.json()
  const db = getDb()
  if (new_password) {
    if (new_password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu tối thiểu 6 ký tự' }, { status: 400 })
    }
    const hash = bcrypt.hashSync(new_password, 10)
    db.prepare(`
      UPDATE profiles SET full_name=?, role=?, department_id=?, password_hash=?, updated_at=datetime('now') WHERE id=?
    `).run(full_name, role, role === 'department_head' ? department_id || null : null, hash, params.id)
  } else {
    db.prepare(`
      UPDATE profiles SET full_name=?, role=?, department_id=?, updated_at=datetime('now') WHERE id=?
    `).run(full_name, role, role === 'department_head' ? department_id || null : null, params.id)
  }
  const row = db.prepare(`
    SELECT p.id, p.email, p.full_name, p.role, p.department_id, d.name as dept_name
    FROM profiles p LEFT JOIN departments d ON p.department_id = d.id WHERE p.id = ?
  `).get(params.id)
  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  }
  // Prevent self-deletion
  if (currentUser.sub === params.id) {
    return NextResponse.json({ error: 'Không thể xoá tài khoản đang đăng nhập' }, { status: 400 })
  }
  const db = getDb()
  const existing = db.prepare('SELECT id FROM profiles WHERE id = ?').get(params.id)
  if (!existing) {
    return NextResponse.json({ error: 'Tài khoản không tồn tại' }, { status: 404 })
  }
  db.prepare('DELETE FROM profiles WHERE id = ?').run(params.id)
  return NextResponse.json({ success: true })
}
