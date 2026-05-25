'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calculator,
  Shield,
  LogOut,
  Clock,
  Users,
  Building2,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/lib/types'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const adminNav: NavItem[] = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/phong-ban', label: 'Quản lý phòng ban', icon: Building2 },
  { href: '/admin/nhan-vien', label: 'Quản lý nhân viên', icon: Users },
  { href: '/admin/tai-khoan', label: 'Quản lý tài khoản', icon: Shield },
]

const accountingNav: NavItem[] = [
  { href: '/ke-toan', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/ke-toan/chi-tiet', label: 'Chi tiết tăng ca', icon: Clock },
  { href: '/ke-toan/tinh-luong', label: 'Tính lương tăng ca', icon: Calculator },
  { href: '/ke-toan/cai-dat-luong', label: 'Cài đặt lương tăng ca', icon: Calculator },
]

const deptHeadNav: NavItem[] = [
  { href: '/dashboard', label: 'Nhập tăng ca', icon: Clock },
  { href: '/dashboard/tong-hop', label: 'Tổng hợp tháng', icon: LayoutDashboard },
]

interface SidebarProps {
  profile: Profile | null
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = profile?.role === 'admin'
    ? adminNav
    : profile?.role === 'accounting'
    ? accountingNav
    : deptHeadNav

  const roleLabel =
    profile?.role === 'admin' ? 'Quản trị viên' :
    profile?.role === 'accounting' ? 'Kế toán' :
    'Trưởng phòng'

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Đã đăng xuất')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-[#1e3a5f] text-white">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center font-bold text-lg">
          H
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">HY TECH</p>
          <p className="text-xs text-blue-200 leading-tight">Quản lý Tăng ca</p>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-500/30 flex items-center justify-center text-sm font-semibold">
            {profile?.full_name?.charAt(0) ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name ?? 'Người dùng'}</p>
            <p className="text-xs text-blue-200 truncate">{roleLabel}</p>
          </div>
        </div>
        {profile?.role === 'department_head' && (profile as any).departments && (
          <p className="text-xs text-blue-300 mt-1 pl-12 truncate">{(profile as any).departments.name}</p>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/admin' && item.href !== '/ke-toan' && item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          )
        })}
        <div className="pt-2 border-t border-white/10 mt-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </nav>
      <div className="h-4" />
    </aside>
  )
}
