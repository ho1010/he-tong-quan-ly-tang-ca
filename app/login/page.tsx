import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-700 to-green-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-white text-2xl font-bold">HY TECH</h1>
          <p className="text-green-200 text-sm mt-1">Hệ thống Quản lý Tăng ca</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Đăng nhập</h2>
          <p className="text-sm text-gray-500 mb-6">Nhập thông tin tài khoản để tiếp tục</p>
          <LoginForm />
        </div>

        <p className="text-center text-green-200 text-xs mt-6">
          © 2026 HY TECH. All rights reserved.
        </p>
      </div>
    </div>
  )
}
