'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { AuthForm } from '@/components/forms/auth-form'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  // 이미 로그인된 사용자는 대시보드로 리다이렉트
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // 로그인 성공 시 대시보드로 이동
  const handleAuthSuccess = () => {
    router.push('/dashboard')
  }

  // 로딩 중이면 로딩 화면 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 로그인되지 않은 사용자에게만 폼 표시
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              SAT Vocabulary Platform
            </h1>
            <p className="text-gray-600">
              {authMode === 'login' ? '로그인하여 학습을 시작하세요' : '새 계정을 만들어 시작하세요'}
            </p>
          </div>

          {/* 인증 폼 */}
          <AuthForm
            mode={authMode}
            onSuccess={handleAuthSuccess}
            onModeChange={setAuthMode}
          />
        </div>
      </div>
    )
  }

  // 로그인된 사용자는 리다이렉트 대기 중
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">대시보드로 이동 중...</p>
      </div>
    </div>
  )
}