'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase/auth'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, GraduationCap, Library, Lightbulb, AlertCircle } from 'lucide-react'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, signIn } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)

  // 인앱 브라우저 감지
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera

    // 카카오톡, 네이버, 페이스북, 인스타그램 등 인앱 브라우저 감지
    const isKakaoTalk = /KAKAOTALK/i.test(userAgent)
    const isNaver = /NAVER/i.test(userAgent)
    const isFacebook = /FBAN|FBAV/i.test(userAgent)
    const isInstagram = /Instagram/i.test(userAgent)
    const isLine = /Line/i.test(userAgent)

    if (isKakaoTalk || isNaver || isFacebook || isInstagram || isLine) {
      setIsInAppBrowser(true)
    }
  }, [])

  // 이미 로그인된 경우 홈으로 리다이렉트
  useEffect(() => {
    if (user) {
      const next = searchParams.get('next') || '/'
      router.push(next)
    }
  }, [user, router, searchParams])

  const handleGoogleSignIn = async () => {
    setError('')
    setIsLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)

      const next = searchParams.get('next') || '/'
      router.push(next)
    } catch (err: any) {
      console.error('Google sign-in error:', err)

      // 에러 메시지 처리
      const errorMessages: { [key: string]: string } = {
        'auth/popup-closed-by-user': '로그인이 취소되었습니다.',
        'auth/cancelled-popup-request': '로그인이 취소되었습니다.',
        'auth/popup-blocked': '팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.',
        'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
        'auth/too-many-requests': '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.',
      }

      setError(errorMessages[err.code] || 'Google 로그인 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 개발 전용: UI에 노출하지 않고 콘솔/자동화에서만 쓰는 로그인 헬퍼.
  // window.__devSignIn('email', 'password') 로 호출. 프로덕션 번들에서는 제거됨.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    ;(window as any).__devSignIn = async (devEmail: string, devPassword: string) => {
      await signIn(devEmail, devPassword)
      const next = searchParams.get('next') || '/'
      router.push(next)
      return 'signed-in'
    }
    return () => {
      delete (window as any).__devSignIn
    }
  }, [signIn, router, searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
      {/* 배경 장식 요소 - 아주 미묘하게 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-50 rounded-full blur-3xl opacity-30" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-50 rounded-full blur-3xl opacity-30" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* 로고/타이틀 섹션 - 아카데믹한 느낌 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-3xl font-light tracking-tight text-slate-900 mb-2">
            Vocabulary Master
          </h1>

          <p className="text-sm text-slate-600 font-light tracking-wide">
            학술 어휘 학습 플랫폼
          </p>
        </div>

        {/* 메인 로그인 카드 - 깔끔하고 미니멀 */}
        <Card className="border-0 shadow-xl shadow-slate-200/50">
          <CardContent className="p-8 space-y-6">
            {/* 인앱 브라우저 경고 메시지 */}
            {isInAppBrowser && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm space-y-2">
                    <p className="font-medium text-amber-900">인앱 브라우저가 감지되었습니다</p>
                    <p className="text-amber-800">
                      카카오톡, 네이버 등의 인앱 브라우저에서는 Google 로그인이 차단될 수 있습니다.
                    </p>
                    <p className="text-amber-800 font-medium">
                      아래 방법으로 접속해주세요:
                    </p>
                    <ul className="text-amber-700 space-y-1 ml-4">
                      <li>• 우측 상단 메뉴(⋯) → "다른 브라우저로 열기"</li>
                      <li>• 또는 링크를 복사하여 Chrome, Safari 등에서 직접 열기</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 안내 메시지 */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-slate-600 mt-0.5" />
                <div className="text-sm text-slate-700 space-y-1">
                  <p className="font-medium">간편 로그인 안내</p>
                  <p className="text-slate-600">
                    본 서비스는 Google 계정으로만 이용 가능합니다.
                    안전하고 빠른 로그인을 위해 Google OAuth를 사용하고 있습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            {/* Google 로그인 버튼 - 강조된 스타일 */}
            <Button
              type="button"
              className="w-full h-12 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white font-medium tracking-wide shadow-lg hover:shadow-xl transition-all duration-200"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2.5" viewBox="0 0 24 24">
                    <path
                      fill="#ffffff"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#ffffff"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google 계정으로 시작하기
                </div>
              )}
            </Button>

            {/* 추가 정보 */}
            <div className="text-center text-xs text-slate-500 space-y-2">
              <p>처음 로그인 시 자동으로 계정이 생성됩니다.</p>
              <p>Google 계정 정보는 안전하게 보호됩니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 하단 정보 섹션 - 아카데믹한 톤 */}
        <div className="mt-8 text-center space-y-6">
          {/* 특징 아이콘들 */}
          <div className="flex justify-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-slate-600" />
              </div>
              <span className="text-xs text-slate-600">3,000+ 단어</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Library className="w-5 h-5 text-slate-600" />
              </div>
              <span className="text-xs text-slate-600">체계적 학습</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-slate-600" />
              </div>
              <span className="text-xs text-slate-600">AI 최적화</span>
            </div>
          </div>

          {/* 카피라이트 */}
          <p className="text-xs text-slate-500 font-light">
            © 2024 Vocabulary Master. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-700"></div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}