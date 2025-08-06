'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { 
  BookOpen, 
  FileText, 
  User, 
  LogOut,
  Home,
  Upload,
  Settings,
  Camera,
  Brain,
  ChevronDown,
  BookMarked,
  Archive,
  Menu,
  X
} from 'lucide-react'

export function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  const studyMenuItems = [
    {
      href: '/study',
      icon: BookOpen,
      title: '학습 대시보드',
      description: '모든 학습 기능 보기'
    },
    {
      href: '/study/photo-vocab',
      icon: Camera,
      title: '사진 단어 학습',
      description: '사진에서 단어 추출'
    },
    {
      href: '/study/photo-vocab/collections',
      icon: BookMarked,
      title: '내 사진 단어장',
      description: '저장된 단어장 목록'
    },
    {
      href: '/study/quiz',
      icon: Brain,
      title: '단어 퀴즈',
      description: 'SAT 단어 테스트'
    },
    {
      href: '/study/flashcards',
      icon: Archive,
      title: '플래시카드',
      description: '카드 형태 학습'
    }
  ]

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="font-bold text-xl text-blue-600">
              SAT Vocabulary
            </Link>
          </div>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden md:flex items-center space-x-1">
              <Link 
                href="/" 
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/' 
                    ? 'bg-blue-100 text-blue-900' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Home className="h-4 w-4" />
                홈
              </Link>

              {/* Study Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname.startsWith('/study') 
                        ? 'bg-blue-100 text-blue-900' 
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    학습
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {studyMenuItems.map((item, index) => (
                    <div key={item.href}>
                      <DropdownMenuItem onClick={() => router.push(item.href)}>
                        <item.icon className="h-4 w-4 mr-3" />
                        <div className="flex-1">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-xs text-gray-500">{item.description}</div>
                        </div>
                      </DropdownMenuItem>
                      {index === 0 || index === 2 ? <DropdownMenuSeparator /> : null}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link 
                href="/settings" 
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/settings' 
                    ? 'bg-blue-100 text-blue-900' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Settings className="h-4 w-4" />
                설정
              </Link>
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-700">
                  <User className="h-4 w-4" />
                  <span className="max-w-32 truncate">{user.email}</span>
                </div>
                
                {/* Mobile menu button */}
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  >
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="hidden sm:flex"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  로그아웃
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push('/login')}
              >
                로그인
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {user && mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link 
                href="/" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === '/' 
                    ? 'bg-blue-100 text-blue-900' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="h-4 w-4 inline mr-2" />
                홈
              </Link>

              {/* Study menu items */}
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                학습 메뉴
              </div>
              {studyMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    pathname === item.href 
                      ? 'bg-blue-100 text-blue-900' 
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4 inline mr-3" />
                  <div className="inline-block">
                    <div>{item.title}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </Link>
              ))}

              <Link 
                href="/settings" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === '/settings' 
                    ? 'bg-blue-100 text-blue-900' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="h-4 w-4 inline mr-2" />
                설정
              </Link>

              <div className="border-t pt-3 mt-3">
                <div className="px-3 py-2 text-sm text-gray-700">
                  <User className="h-4 w-4 inline mr-2" />
                  {user.email}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="mx-3 mt-2"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  로그아웃
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}