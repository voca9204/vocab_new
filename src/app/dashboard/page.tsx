'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function DashboardPage() {
  const { user, appUser, signOut, loading } = useAuth()
  const router = useRouter()

  // 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
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

  // 로그인하지 않은 사용자
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    )
  }

  // 로그인된 사용자 대시보드
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                SAT Vocabulary Platform
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                안녕하세요, {appUser?.displayName || appUser?.email}님!
              </span>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">대시보드</h2>
          <p className="text-gray-600">SAT 어휘 학습을 시작해보세요!</p>
        </div>

        {/* 사용자 정보 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">👤 사용자 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>이름:</strong> {appUser?.displayName || '설정되지 않음'}</p>
                <p><strong>이메일:</strong> {appUser?.email}</p>
                <p><strong>가입일:</strong> {appUser?.createdAt?.toLocaleDateString('ko-KR')}</p>
                <p><strong>마지막 로그인:</strong> {appUser?.lastLoginAt?.toLocaleDateString('ko-KR')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📚 학습 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>학습한 단어:</strong> 0개</p>
                <p><strong>마스터한 단어:</strong> 0개</p>
                <p><strong>연속 학습일:</strong> 0일</p>
                <p><strong>오늘의 목표:</strong> 10개</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎯 퀴즈 성과</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>총 퀴즈 수:</strong> 0개</p>
                <p><strong>정답률:</strong> 0%</p>
                <p><strong>평균 점수:</strong> 0점</p>
                <p><strong>최고 기록:</strong> 0점</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 액션 버튼들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button className="h-20" disabled>
            📚 어휘 학습 시작
            <br />
            <span className="text-xs opacity-75">(곧 출시)</span>
          </Button>
          <Button className="h-20" disabled>
            📰 뉴스로 학습하기
            <br />
            <span className="text-xs opacity-75">(곧 출시)</span>
          </Button>
          <Button className="h-20" disabled>
            🎯 퀴즈 도전하기
            <br />
            <span className="text-xs opacity-75">(곧 출시)</span>
          </Button>
          <Button className="h-20" disabled>
            📊 진도 확인하기
            <br />
            <span className="text-xs opacity-75">(곧 출시)</span>
          </Button>
        </div>

        {/* 인증 성공 메시지 */}
        <div className="mt-8">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg text-green-800">🎉 인증 시스템 성공!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-green-700">
                Firebase Authentication이 정상적으로 작동하고 있습니다. 
                이제 SAT 어휘 데이터베이스를 구축하여 학습 기능을 추가할 차례입니다!
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}