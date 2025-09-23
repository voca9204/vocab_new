'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import MobileNav from './mobile-nav'
import { cn } from '@/lib/utils'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // localStorage에서 초기 상태 읽기
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed')
      return saved === 'true'
    }
    return false
  })

  // 사이드바를 숨길 경로들 (홈은 제외)
  const hideSidebarPaths = ['/login']
  const shouldHideSidebar = hideSidebarPaths.includes(pathname)

  useEffect(() => {
    const handleSidebarToggle = (event: CustomEvent) => {
      console.log('[AppLayout] Sidebar toggle event:', event.detail.isCollapsed)
      setIsCollapsed(event.detail.isCollapsed)
    }

    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener)
    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener)
    }
  }, [])

  if (shouldHideSidebar) {
    return <>{children}</>
  }

  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className={cn(
          "flex-1 transition-all duration-300 ease-in-out pb-16 md:pb-0",
          isCollapsed ? "md:ml-10" : "md:ml-48"  // 사이드바 폭과 동일하게 설정
        )}>
          <div className="w-full px-1 md:px-2 py-2 md:py-3">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </>
  )
}