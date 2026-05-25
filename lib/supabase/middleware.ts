import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Skip middleware if Supabase env vars are not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey || supabaseUrl.startsWith('your_')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (pathname === '/login') {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile) {
        return NextResponse.redirect(new URL(getDefaultRoute(profile.role), request.url))
      }
    }
    return supabaseResponse
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/admin') && profile.role !== 'admin') {
    return NextResponse.redirect(new URL(getDefaultRoute(profile.role), request.url))
  }
  if (pathname.startsWith('/ke-toan') && profile.role !== 'accounting' && profile.role !== 'admin') {
    return NextResponse.redirect(new URL(getDefaultRoute(profile.role), request.url))
  }
  if (pathname.startsWith('/dashboard') && profile.role !== 'department_head' && profile.role !== 'admin') {
    return NextResponse.redirect(new URL(getDefaultRoute(profile.role), request.url))
  }

  return supabaseResponse
}

function getDefaultRoute(role: string): string {
  switch (role) {
    case 'admin': return '/admin'
    case 'accounting': return '/ke-toan'
    case 'department_head': return '/dashboard'
    default: return '/login'
  }
}
