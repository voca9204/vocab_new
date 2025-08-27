'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { 
  BookOpen, 
  FileText, 
  User, 
  LogOut,
  Home,
  Upload,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  BookText,
  Brain,
  CreditCard,
  PenTool,
  Calendar,
  RefreshCw,
  BarChart,
  FileUp,
  List,
  Shield,
  FolderOpen
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  children?: NavItem[]
}

export function Sidebar() {
  const { user, signOut, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // localStorage에서 사이드바 상태 읽기
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed')
      return saved === 'true'
    }
    return false
  })
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // 사이드바 상태를 부모 컴포넌트에 전달하기 위한 이벤트
  useEffect(() => {
    const event = new CustomEvent('sidebar-toggle', { 
      detail: { isCollapsed } 
    })
    window.dispatchEvent(event)
    
    // localStorage에 상태 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', isCollapsed.toString())
    }
  }, [isCollapsed])

  // ESC 키로 모바일 메뉴 닫기
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false)
      }
    }

    if (isMobileOpen) {
      document.addEventListener('keydown', handleEscKey)
      // 모바일 메뉴 열릴 때 body 스크롬 비활성화
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
      document.body.style.overflow = 'unset'
    }
  }, [isMobileOpen])

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  const navItems: NavItem[] = [
    {
      title: '홈',
      href: '/',
      icon: <Home className="h-4 w-4" />
    },
    {
      title: '대시보드',
      href: '/unified-dashboard',
      icon: <BarChart className="h-4 w-4" />
    },
    {
      title: '단어장 관리',
      href: '/wordbooks',
      icon: <BookText className="h-4 w-4" />
    },
    {
      title: '단어장 탐색',
      href: '/collections',
      icon: <FolderOpen className="h-4 w-4" />
    },
    {
      title: '학습',
      href: '/study',
      icon: <BookOpen className="h-4 w-4" />,
      children: [
        {
          title: '단어 목록',
          href: '/study/list',
          icon: <List className="h-4 w-4" />
        },
        {
          title: '플래시카드',
          href: '/study/flashcards',
          icon: <CreditCard className="h-4 w-4" />
        },
        {
          title: '퀴즈',
          href: '/study/quiz',
          icon: <Brain className="h-4 w-4" />
        },
        {
          title: '타이핑 연습',
          href: '/study/typing',
          icon: <PenTool className="h-4 w-4" />
        },
        {
          title: '일일 학습',
          href: '/study/daily',
          icon: <Calendar className="h-4 w-4" />
        },
        {
          title: '복습',
          href: '/study/review',
          icon: <RefreshCw className="h-4 w-4" />
        }
      ]
    },
    ...(isAdmin ? [
      {
        title: '관리자',
        href: '/admin',
        icon: <Shield className="h-4 w-4" />,
        children: [
          {
            title: '단어장 관리',
            href: '/admin/collections',
            icon: <FolderOpen className="h-4 w-4" />
          },
          {
            title: 'PDF 업로드',
            href: '/pdf-extract',
            icon: <FileUp className="h-4 w-4" />
          }
        ]
      }
    ] : []),
    {
      title: '설정',
      href: '/settings',
      icon: <Settings className="h-4 w-4" />
    }
  ]

  const isActiveRoute = (href: string) => {
    if (href === '/') return pathname === href
    return pathname.startsWith(href)
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const toggleMobileSidebar = () => {
    console.log('[Sidebar] Toggle mobile sidebar:', !isMobileOpen)
    setIsMobileOpen(!isMobileOpen)
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileSidebar}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-gray-200 shadow-sm md:hidden focus:ring-2 focus:ring-blue-500 focus:outline-none"
        aria-label={isMobileOpen ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={isMobileOpen}
        aria-controls="mobile-sidebar-menu"
        type="button"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Toggle Button for Collapsed State */}
      {isCollapsed && (
        <button
          onClick={toggleSidebar}
          className="fixed left-16 top-4 z-50 p-2 rounded-r-lg bg-white border border-l-0 border-gray-200 shadow-sm hidden lg:block hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen border-r border-gray-200 transition-all duration-300 shadow-lg",
          // Mobile: show/hide based on isMobileOpen, always full width
          isMobileOpen ? "z-50 w-64 block bg-white" : "hidden",
          // Desktop: always visible, width based on collapsed state
          "md:block md:z-40 md:bg-white",
          isCollapsed ? "md:w-16" : "md:w-64"
        )}
        id="mobile-sidebar-menu"
        role="navigation"
        aria-label="주 네비게이션 메뉴"
        data-mobile-open={isMobileOpen}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Link 
              href="/" 
              className={cn(
                "transition-all duration-300",
                isCollapsed ? "flex items-center justify-center w-full" : "font-bold text-xl"
              )}
            >
              {isCollapsed ? (
                <BookText className="h-6 w-6" />
              ) : (
                'SAT Vocabulary'
              )}
            </Link>
            {!isCollapsed && (
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg hover:bg-gray-100 hidden lg:block"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {user ? (
              <ul className="space-y-1 px-3">
                {navItems.map((item) => (
                  <li key={item.href}>
                    {item.children ? (
                      <details open={!isCollapsed}>
                        <summary
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors",
                            isActiveRoute(item.href) && "bg-gray-100 text-gray-900",
                            isCollapsed && "justify-center"
                          )}
                        >
                          {item.icon}
                          {!isCollapsed && (
                            <span className="flex-1">{item.title}</span>
                          )}
                        </summary>
                        {!isCollapsed && (
                          <ul className="ml-6 mt-1 space-y-1">
                            {item.children.map((child) => (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-100 transition-colors",
                                    isActiveRoute(child.href) && "bg-gray-100 text-gray-900"
                                  )}
                                  onClick={() => setIsMobileOpen(false)}
                                >
                                  {child.icon}
                                  <span>{child.title}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </details>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors relative group",
                          isActiveRoute(item.href) && "bg-gray-100 text-gray-900",
                          isCollapsed && "justify-center"
                        )}
                        onClick={() => setIsMobileOpen(false)}
                      >
                        {item.icon}
                        {!isCollapsed && <span>{item.title}</span>}
                        {isCollapsed && (
                          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                            {item.title}
                          </span>
                        )}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3">
                <p className="text-center text-gray-500 text-sm">
                  로그인이 필요합니다
                </p>
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            {user ? (
              <div className="space-y-3">
                <div className={cn(
                  "flex items-center gap-3 text-sm text-gray-700",
                  isCollapsed && "justify-center"
                )}>
                  <User className="h-4 w-4 shrink-0" />
                  {!isCollapsed && (
                    <span className="truncate">{user.email}</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className={cn(
                    "w-full",
                    isCollapsed && "px-0"
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  {!isCollapsed && <span className="ml-2">로그아웃</span>}
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push('/login')}
                className={cn(
                  "w-full",
                  isCollapsed && "px-0"
                )}
              >
                {isCollapsed ? <User className="h-4 w-4" /> : '로그인'}
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}