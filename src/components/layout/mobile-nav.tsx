'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, BookOpen, Camera, User, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

const navItems: NavItem[] = [
  {
    id: 'home',
    label: '홈',
    icon: Home,
    href: '/dashboard'
  },
  {
    id: 'study',
    label: '학습',
    icon: BookOpen,
    href: '/study'
  },
  {
    id: 'photo',
    label: '사진',
    icon: Camera,
    href: '/study/photo-vocab'
  },
  {
    id: 'collections',
    label: '단어장',
    icon: FolderOpen,
    href: '/collections'
  },
  {
    id: 'profile',
    label: '프로필',
    icon: User,
    href: '/settings'
  }
]

export default function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()

  // 로그인 페이지나 일부 특수 페이지에서는 네비게이션 숨김
  const hideNav = pathname === '/login' || pathname === '/' || pathname.startsWith('/admin')

  if (hideNav) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 md:hidden">
      <nav className="grid grid-cols-5 h-16" role="navigation" aria-label="바로가기 네비게이션">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href) || 
                          (item.href === '/dashboard' && pathname === '/')
          
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 relative transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-md",
                isActive 
                  ? "text-blue-600" 
                  : "text-gray-500 hover:text-gray-700"
              )}
              aria-label={`${item.label} 페이지로 이동`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={cn(
                "h-5 w-5",
                isActive && "animate-in zoom-in-50 duration-200"
              )} />
              <span className="text-xs font-medium">{item.label}</span>
              
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-b-full" />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}