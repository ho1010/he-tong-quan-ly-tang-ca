import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { signJWT } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Thiếu thông tin đăng nhập' }, { status: 400 })
  }

  const db = getDb()
  const profile = db.prepare(`
    SELECT p.*, d.name as dept_name
    FROM profiles p
    LEFT JOIN departments d ON p.department_id = d.id
    WHERE p.email = ?
  `).get(email) as any

  if (!profile || !bcrypt.compareSync(password, profile.password_hash)) {
    return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
  }

  const token = await signJWT({
    sub: profile.id,
    email: profile.email,
    role: profile.role,
    deptId: profile.department_id ?? null,
    fullName: profile.full_name ?? null,
  })

  const res = NextResponse.json({ role: profile.role })
  res.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
