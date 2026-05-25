import { Sidebar } from './sidebar'
import type { Profile } from '@/lib/types'

interface AppLayoutProps {
  children: React.ReactNode
  profile: Profile | null
}

export function AppLayout({ children, profile }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
