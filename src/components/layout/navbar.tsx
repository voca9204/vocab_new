'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui'
import { 
  BookOpen, 
  FileText, 
  User, 
  LogOut,
  Home,
  Upload,
  Settings
} from 'lucide-react'

export function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="font-bold text-xl">
              SAT Vocabulary
            </Link>
            
            {user && (
              <div className="hidden md:flex items-center space-x-6">
                <Link 
                  href="/" 
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                >
                  <Home className="h-4 w-4" />
                  홈
                </Link>
                <Link 
                  href="/study" 
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                >
                  <BookOpen className="h-4 w-4" />
                  학습
                </Link>
                <Link 
                  href="/settings" 
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                >
                  <Settings className="h-4 w-4" />
                  설정
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <User className="h-4 w-4" />
                  {user.email}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
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
      </div>
    </nav>
  )
}