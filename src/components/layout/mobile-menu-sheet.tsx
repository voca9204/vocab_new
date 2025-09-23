'use client'

import { X, ChevronRight, User, Settings, LogOut, HelpCircle, Bell, Moon, Globe, Palette, Shield, Database } from 'lucide-react'
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
    // User Settings Section
    {
      id: 'profile',
      label: '프로필 설정',
      icon: User,
      href: '/profile'
    },
    {
      id: 'notifications',
      label: '알림 설정',
      icon: Bell,
      href: '/settings/notifications'
    },
    {
      id: 'divider1',
      label: '',
      divider: true
    },
    // App Settings Section
    {
      id: 'theme',
      label: '테마 설정',
      icon: Palette,
      href: '/settings/theme'
    },
    {
      id: 'dark-mode',
      label: '다크 모드',
      icon: Moon,
      href: '/settings/appearance'
    },
    {
      id: 'language',
      label: '언어 설정',
      icon: Globe,
      href: '/settings/language'
    },
    {
      id: 'divider2',
      label: '',
      divider: true
    },
    // Data & Privacy Section
    {
      id: 'data',
      label: '데이터 관리',
      icon: Database,
      href: '/settings/data'
    },
    {
      id: 'privacy',
      label: '개인정보 보호',
      icon: Shield,
      href: '/settings/privacy'
    },
    {
      id: 'divider3',
      label: '',
      divider: true
    },
    // Support Section
    {
      id: 'help',
      label: '도움말',
      icon: HelpCircle,
      href: '/help'
    },
    {
      id: 'divider4',
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
                  설정
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
                <span className="sr-only">설정 메뉴 닫기</span>
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