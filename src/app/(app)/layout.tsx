import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-5"
          style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  )
}
