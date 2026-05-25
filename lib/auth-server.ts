import { cookies } from 'next/headers'
import { verifyJWT, SessionPayload } from './auth'

export async function getCurrentUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  return verifyJWT(token)
}
