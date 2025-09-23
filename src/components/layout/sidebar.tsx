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
  FileUp,
  List,
  Shield,
  FolderOpen,
  PanelLeftClose,
  PanelLeft
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
  const [isExpanded, setIsExpanded] = useState(true) // 기본값을 true로 변경 (열린 상태)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Mobile에서는 렌더링하지 않음 (하단 네비게이션 사용)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 사이드바 상태를 부모 컴포넌트에 전달하기 위한 이벤트
  useEffect(() => {
    const event = new CustomEvent('sidebar-toggle', {
      detail: { isCollapsed: !isExpanded }
    })
    window.dispatchEvent(event)
  }, [isExpanded])

  // ESC 키로 모바일 메뉴 닫기
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isMobileOpen) {
          setIsMobileOpen(false)
        }
        if (isExpanded) {
          setIsExpanded(false)
        }
      }
    }

    document.addEventListener('keydown', handleEscKey)
    return () => {
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [isMobileOpen, isExpanded])

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
          title: '복습',
          href: '/study/review',
          icon: <RefreshCw className="h-4 w-4" />
        },
        {
          title: '데일리 학습',
          href: '/study/daily',
          icon: <Calendar className="h-4 w-4" />
        }
      ]
    },
    {
      title: '사진 학습',
      href: '/study/photo-vocab',
      icon: <FileUp className="h-4 w-4" />
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

  const isOpen = isExpanded // hover 제거, 클릭만으로 제어

  // 모바일에서는 하단 네비게이션을 사용하므로 사이드바 숨김
  if (isMobile) return null

  return (
    <>
      {/* 모바일 메뉴 버튼 - 모바일에서는 렌더링하지 않음 */}
      {/* <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md md:hidden"
        aria-label="메뉴 열기"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* 모바일 오버레이 */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 데스크톱 사이드바 */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-40",
          // 모바일
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          // 데스크톱
          "md:translate-x-0",
          isOpen ? "w-48" : "w-10"  // 메뉴가 한 줄로 표시되도록 조정
        )}
      >
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="flex items-center h-16 px-4 border-b">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-2 transition-all duration-300",
                !isOpen && "justify-center w-full"
              )}
            >
              <BookText className="h-6 w-6 text-blue-600 flex-shrink-0" />
              {isOpen && (
                <span className="font-bold text-xl whitespace-nowrap">
                  Vocabulary
                </span>
              )}
            </Link>
            {/* 토글 버튼을 항상 표시 */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "p-1.5 rounded-lg hover:bg-gray-100 hidden md:block transition-all",
                isOpen ? "ml-auto" : "ml-1"
              )}
              aria-label={isExpanded ? "사이드바 접기" : "사이드바 열기"}
            >
              {isExpanded ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* 네비게이션 */}
          <nav className="flex-1 overflow-y-auto py-4">
            {user ? (
              <ul className="space-y-1 px-3">
                {navItems.map((item) => (
                  <li key={item.href}>
                    {item.children ? (
                      <details open={isOpen}>
                        <summary
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group relative",
                            isActiveRoute(item.href) && "bg-gray-100 text-gray-900",
                            !isOpen && "justify-center"
                          )}
                        >
                          <span className="flex-shrink-0">{item.icon}</span>
                          {isOpen && (
                            <span className="flex-1">{item.title}</span>
                          )}
                          {!isOpen && (
                            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                              {item.title}
                            </span>
                          )}
                        </summary>
                        {isOpen && (
                          <ul className="ml-6 mt-2 space-y-2">
                            {item.children.map((child) => (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors",
                                    isActiveRoute(child.href) && "bg-gray-100 text-gray-900"
                                  )}
                                  onClick={() => {
                                    setIsMobileOpen(false)
                                  }}
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
                          !isOpen && "justify-center"
                        )}
                        onClick={() => {
                          setIsMobileOpen(false)
                        }}
                      >
                        <span className="flex-shrink-0">{item.icon}</span>
                        {isOpen && <span>{item.title}</span>}
                        {!isOpen && (
                          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
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
                <p className={cn(
                  "text-center text-gray-500 text-sm",
                  !isOpen && "hidden"
                )}>
                  로그인이 필요합니다
                </p>
              </div>
            )}
          </nav>

          {/* 푸터 */}
          <div className="border-t p-4">
            {user ? (
              <div className="space-y-3">
                {isOpen && (
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <User className="h-4 w-4 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className={cn(
                    "w-full",
                    !isOpen && "px-0"
                  )}
                  title="로그아웃"
                >
                  <LogOut className="h-4 w-4" />
                  {isOpen && <span className="ml-2">로그아웃</span>}
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push('/login')}
                className={cn(
                  "w-full",
                  !isOpen && "px-0"
                )}
                title="로그인"
              >
                {isOpen ? '로그인' : <User className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* 스페이서 제거 - app-layout에서 마진으로 처리 */}
    </>
  )
}