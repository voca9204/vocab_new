'use client'

import React, { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface AuthFormProps {
  mode?: 'login' | 'register' | 'google-only'
  onSuccess?: () => void
  onModeChange?: (mode: 'login' | 'register') => void
}

export function AuthForm({ mode = 'login', onSuccess, onModeChange }: AuthFormProps) {
  const { signIn, signUp, signInWithGoogle, resetPassword, loading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const isLogin = mode === 'login'
  const isRegister = mode === 'register'
  const isGoogleOnly = mode === 'google-only'

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // 이메일 검증
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요'
    }

    // 비밀번호 검증 (reset 모드가 아닐 때만)
    if (!resetMode) {
      if (!formData.password) {
        newErrors.password = '비밀번호를 입력해주세요'
      } else if (formData.password.length < 6) {
        newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다'
      }

      // 회원가입 시 추가 검증
      if (isRegister) {
        if (!formData.displayName.trim()) {
          newErrors.displayName = '이름을 입력해주세요'
        }

        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = '비밀번호가 일치하지 않습니다'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      if (resetMode) {
        await resetPassword(formData.email)
        setResetSent(true)
        return
      }

      if (isLogin) {
        await signIn(formData.email, formData.password)
      } else {
        await signUp(formData.email, formData.password, formData.displayName)
      }
      
      onSuccess?.()
    } catch (error: any) {
      console.error('Auth error:', error)
      
      // Firebase 에러 메시지를 사용자 친화적으로 변환
      const errorCode = error.code
      switch (errorCode) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setErrors({ general: '이메일 또는 비밀번호가 올바르지 않습니다' })
          break
        case 'auth/email-already-in-use':
          setErrors({ email: '이미 사용 중인 이메일입니다' })
          break
        case 'auth/weak-password':
          setErrors({ password: '비밀번호가 너무 약합니다' })
          break
        case 'auth/invalid-email':
          setErrors({ email: '올바르지 않은 이메일 형식입니다' })
          break
        default:
          setErrors({ general: error.message || '오류가 발생했습니다' })
      }
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
      onSuccess?.()
    } catch (error: any) {
      console.error('Google sign in error:', error)
      
      // Google 로그인 에러 처리
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          setErrors({ general: '로그인 창이 닫혔습니다. 다시 시도해주세요.' })
          break
        case 'auth/popup-blocked':
          setErrors({ general: '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.' })
          break
        case 'auth/cancelled-popup-request':
          setErrors({ general: '이미 로그인 창이 열려 있습니다' })
          break
        case 'auth/operation-not-allowed':
          setErrors({ general: 'Google 로그인이 비활성화되어 있습니다. 관리자에게 문의하세요' })
          break
        case 'auth/network-request-failed':
          setErrors({ general: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요' })
          break
        default:
          setErrors({ general: 'Google 로그인에 실패했습니다. 다시 시도해주세요' })
      }
    }
  }

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    // 에러 상태 초기화
    if (errors[field] || errors.general) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        delete newErrors.general
        return newErrors
      })
    }
  }

  if (resetSent) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">이메일을 확인해주세요</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600 mb-4">
            {formData.email}로 비밀번호 재설정 링크를 발송했습니다.
          </p>
          <Button
            onClick={() => {
              setResetMode(false)
              setResetSent(false)
              setFormData({ email: '', password: '', displayName: '', confirmPassword: '' })
            }}
            variant="outline"
            className="w-full"
          >
            로그인으로 돌아가기
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Google-only 모드일 때는 간단한 형태로 표시
  if (isGoogleOnly) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          {errors.general && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg mb-4">
              {errors.general}
            </div>
          )}
          
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-[40px] px-[12px] bg-white hover:bg-gray-50 active:bg-gray-100 border border-[#dadce0] rounded-[4px] flex items-center justify-center gap-[12px] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" fillRule="evenodd">
                <path d="M17.64 9.20454c0-.63818-.05909-1.25681-.16364-1.85681H9v3.50181h4.84364c-.20864 1.125-.84273 2.07818-1.79591 2.71636v2.25818h2.90864c1.70182-1.56818 2.68364-3.87409 2.68364-6.60954z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.46727-.80591 5.95636-2.18045l-2.90864-2.25818c-.80591.54-1.83681.85909-3.04772.85909-2.34409 0-4.32818-1.58318-5.03591-3.71045H.957273v2.33182C2.43818 15.98318 5.48182 18 9 18z" fill="#34A853"/>
                <path d="M3.96409 10.71c-.18-.54-.28227-1.11818-.28227-1.71s.10227-1.17.28227-1.71V4.95818H.957273C.347727 6.17318 0 7.54772 0 9s.347727 2.82682.957273 4.04182l3.00681-2.33182z" fill="#FBBC05"/>
                <path d="M9 3.57955c1.32136 0 2.50773.45409 3.44045 1.34591l2.58136-2.58136C13.46364 .891818 11.43 0 9 0 5.48182 0 2.43818 2.01682 .957273 4.95818L3.96409 7.29c.70773-2.12727 2.69182-3.71045 5.03591-3.71045z" fill="#EA4335"/>
              </g>
            </svg>
            <span className="text-[14px] font-medium text-[#3c4043] font-['Roboto']">Sign in with Google</span>
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {resetMode ? '비밀번호 재설정' : isLogin ? '로그인' : '회원가입'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {errors.general}
            </div>
          )}

          {/* Google 로그인 버튼 (reset 모드가 아닐 때만) */}
          {!resetMode && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-[40px] px-[12px] bg-white hover:bg-gray-50 active:bg-gray-100 border border-[#dadce0] rounded-[4px] flex items-center justify-center gap-[12px] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <g fill="none" fillRule="evenodd">
                    <path d="M17.64 9.20454c0-.63818-.05909-1.25681-.16364-1.85681H9v3.50181h4.84364c-.20864 1.125-.84273 2.07818-1.79591 2.71636v2.25818h2.90864c1.70182-1.56818 2.68364-3.87409 2.68364-6.60954z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.46727-.80591 5.95636-2.18045l-2.90864-2.25818c-.80591.54-1.83681.85909-3.04772.85909-2.34409 0-4.32818-1.58318-5.03591-3.71045H.957273v2.33182C2.43818 15.98318 5.48182 18 9 18z" fill="#34A853"/>
                    <path d="M3.96409 10.71c-.18-.54-.28227-1.11818-.28227-1.71s.10227-1.17.28227-1.71V4.95818H.957273C.347727 6.17318 0 7.54772 0 9s.347727 2.82682.957273 4.04182l3.00681-2.33182z" fill="#FBBC05"/>
                    <path d="M9 3.57955c1.32136 0 2.50773.45409 3.44045 1.34591l2.58136-2.58136C13.46364 .891818 11.43 0 9 0 5.48182 0 2.43818 2.01682 .957273 4.95818L3.96409 7.29c.70773-2.12727 2.69182-3.71045 5.03591-3.71045z" fill="#EA4335"/>
                  </g>
                </svg>
                <span className="text-[14px] font-medium text-[#3c4043] font-['Roboto']">Sign in with Google</span>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">또는</span>
                </div>
              </div>
            </div>
          )}

          <Input
            label="이메일"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            error={errors.email}
            placeholder="example@example.com"
          />

          {!resetMode && (
            <Input
              label="비밀번호"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={errors.password}
              placeholder="6자 이상 입력해주세요"
            />
          )}

          {!resetMode && isRegister && (
            <>
              <Input
                label="이름"
                type="text"
                value={formData.displayName}
                onChange={handleInputChange('displayName')}
                error={errors.displayName}
                placeholder="홍길동"
              />

              <Input
                label="비밀번호 확인"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                error={errors.confirmPassword}
                placeholder="비밀번호를 다시 입력해주세요"
              />
            </>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {resetMode ? '재설정 링크 발송' : isLogin ? '로그인' : '회원가입'}
          </Button>

          {isLogin && !resetMode && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setResetMode(true)}
              className="w-full"
            >
              비밀번호를 잊으셨나요?
            </Button>
          )}

          {resetMode && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetMode(false)}
              className="w-full"
            >
              로그인으로 돌아가기
            </Button>
          )}

          {!resetMode && onModeChange && (
            <div className="text-center">
              <span className="text-sm text-gray-600">
                {isLogin ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
              </span>
              <button
                type="button"
                onClick={() => onModeChange(isLogin ? 'register' : 'login')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {isLogin ? '회원가입' : '로그인'}
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}