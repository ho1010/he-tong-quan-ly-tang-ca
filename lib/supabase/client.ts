import { createBrowserClient } from '@supabase/ssr'

function getSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  let url: string
  try {
    new URL(rawUrl)
    url = rawUrl
  } catch {
    url = 'http://localhost:54321'
  }

  const key = rawKey.startsWith('eyJ') ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTc1NzY4MDAwMH0.placeholder-sig'

  return { url, key }
}

export function createClient() {
  const { url, key } = getSupabaseConfig()
  return createBrowserClient(url, key)
}
