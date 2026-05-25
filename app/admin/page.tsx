import { getDb } from '@/lib/db'
import { PageHeader } from '@/components/layout/page-header'
import { Building2, Users, Shield, Clock } from 'lucide-react'
import Link from 'next/link'

export default async function AdminPage() {
  const db = getDb()
  const deptCount = (db.prepare('SELECT COUNT(*) as c FROM departments').get() as { c: number }).c
  const empCount = (db.prepare('SELECT COUNT(*) as c FROM employees WHERE is_active = 1').get() as { c: number }).c
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM profiles').get() as { c: number }).c
  const recordCount = (db.prepare('SELECT COUNT(*) as c FROM overtime_records').get() as { c: number }).c

  const cards = [
    { href: '/admin/phong-ban', icon: Building2, label: 'Phòng ban', value: deptCount, color: 'blue', desc: 'Quản lý phòng ban' },
    { href: '/admin/nhan-vien', icon: Users, label: 'Nhân viên', value: empCount, color: 'green', desc: 'Nhân viên đang hoạt động' },
    { href: '/admin/tai-khoan', icon: Shield, label: 'Tài khoản', value: userCount, color: 'purple', desc: 'Tài khoản hệ thống' },
    { href: '/ke-toan/chi-tiet', icon: Clock, label: 'Bản ghi tăng ca', value: recordCount, color: 'orange', desc: 'Tổng số bản ghi' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
  }

  return (
    <div>
      <PageHeader title="Tổng quan hệ thống" description="Quản trị viên HY TECH" />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(card => {
            const Icon = card.icon
            return (
              <Link key={card.href} href={card.href}
                className="bg-white rounded-xl border p-5 hover:border-blue-300 hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[card.color]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString('vi-VN')}</p>
                    <p className="text-sm text-gray-500">{card.desc}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium text-blue-700 group-hover:underline">{card.label} →</p>
              </Link>
            )
          })}
        </div>

        <div className="mt-6 bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Thao tác nhanh</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/admin/phong-ban', label: 'Thêm phòng ban mới' },
              { href: '/admin/nhan-vien', label: 'Thêm nhân viên mới' },
              { href: '/admin/tai-khoan', label: 'Tạo tài khoản' },
              { href: '/admin/luong', label: 'Cài đặt lương' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="text-center py-3 px-4 bg-gray-50 hover:bg-blue-50 border hover:border-blue-300 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-700 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
