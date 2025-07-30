'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { cn } from '@/lib/utils'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const handleSidebarToggle = (event: CustomEvent) => {
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
        "flex-1 transition-all duration-300",
        isCollapsed ? "lg:ml-16" : "lg:ml-64"
      )}>
        <div className="pt-16 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  )
}