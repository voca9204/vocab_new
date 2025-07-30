'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { cn } from '@/lib/utils'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // localStorage에서 초기 상태 읽기
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed')
      return saved === 'true'
    }
    return false
  })

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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        isCollapsed ? "lg:ml-16" : "lg:ml-64"
      )}>
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}