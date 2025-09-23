'use client'

import { X, ChevronRight, User, Settings, LogOut, HelpCircle, BookOpen, Trophy, BarChart3, GraduationCap, List, CreditCard, Brain, PenTool, RefreshCw, Calendar } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase/auth'
import { cn } from '@/lib/utils'

interface MobileMenuSheetProps {
  isOpen: boolean
  onClose: () => void
}

interface MenuItem {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  href?: string
  action?: () => void
  divider?: boolean
}

export default function MobileMenuSheet({ isOpen, onClose }: MobileMenuSheetProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push('/login')
      onClose()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const menuItems: MenuItem[] = [
    // Study Methods Section
    {
      id: 'study-list',
      label: '단어 목록',
      icon: List,
      href: '/study/list'
    },
    {
      id: 'study-flashcards',
      label: '플래시카드',
      icon: CreditCard,
      href: '/study/flashcards'
    },
    {
      id: 'study-quiz',
      label: '퀴즈',
      icon: Brain,
      href: '/study/quiz'
    },
    {
      id: 'study-typing',
      label: '타이핑 연습',
      icon: PenTool,
      href: '/study/typing'
    },
    {
      id: 'study-review',
      label: '복습',
      icon: RefreshCw,
      href: '/study/review'
    },
    {
      id: 'study-daily',
      label: '데일리 학습',
      icon: Calendar,
      href: '/study/daily'
    },
    {
      id: 'divider1',
      label: '',
      divider: true
    },
    // Features Section
    {
      id: 'study-stats',
      label: '학습 통계',
      icon: BarChart3,
      href: '/study/stats'
    },
    {
      id: 'achievements',
      label: '성취도',
      icon: Trophy,
      href: '/achievements'
    },
    {
      id: 'divider2',
      label: '',
      divider: true
    },
    // User Section
    {
      id: 'settings',
      label: '설정',
      icon: Settings,
      href: '/settings'
    },
    {
      id: 'help',
      label: '도움말',
      icon: HelpCircle,
      href: '/help'
    },
    {
      id: 'divider3',
      label: '',
      divider: true
    },
    {
      id: 'logout',
      label: '로그아웃',
      icon: LogOut,
      action: handleSignOut
    }
  ]

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        className={cn(
          "fixed inset-y-0 right-0 z-[61] w-full max-w-xs bg-white shadow-xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="px-4 pt-5 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold leading-6 text-gray-900">
                  메뉴
                </h2>
                {user && (
                  <p className="mt-1 text-sm text-gray-500">{user.email}</p>
                )}
              </div>
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={onClose}
              >
                <span className="sr-only">메뉴 닫기</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto py-4">
            {menuItems.map((item) => {
              if (item.divider) {
                return <div key={item.id} className="my-2 border-t border-gray-200" />
              }

              const Icon = item.icon
              const isActive = item.href && pathname === item.href

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.action) {
                      item.action()
                    } else if (item.href) {
                      router.push(item.href)
                      onClose()
                    }
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {Icon && <Icon className="h-5 w-5" />}
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {item.href && (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <p className="text-xs text-gray-500 text-center">
              SAT Vocabulary v2.0
            </p>
          </div>
        </div>
      </div>
    </>
  )
}