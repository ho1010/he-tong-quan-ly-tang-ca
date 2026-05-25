import { type NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('session')?.value

  const user = token ? await verifyJWT(token) : null

  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL(getDefaultRoute(user.role), request.url))
    }
    return NextResponse.next()
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/admin') && user.role !== 'admin') {
    return NextResponse.redirect(new URL(getDefaultRoute(user.role), request.url))
  }
  if (pathname.startsWith('/ke-toan') && user.role !== 'accounting' && user.role !== 'admin') {
    return NextResponse.redirect(new URL(getDefaultRoute(user.role), request.url))
  }
  if (pathname.startsWith('/dashboard') && user.role !== 'department_head' && user.role !== 'admin') {
    return NextResponse.redirect(new URL(getDefaultRoute(user.role), request.url))
  }

  return NextResponse.next()
}

function getDefaultRoute(role: string): string {
  switch (role) {
    case 'admin': return '/admin'
    case 'accounting': return '/ke-toan'
    case 'department_head': return '/dashboard'
    default: return '/login'
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
