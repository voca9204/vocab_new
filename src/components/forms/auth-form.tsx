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
          setErrors({ general: '로그인이 취소되었습니다' })
          break
        case 'auth/popup-blocked':
          setErrors({ general: '팝업이 차단되었습니다. 팝업 차단을 해제해주세요' })
          break
        default:
          setErrors({ general: 'Google 로그인에 실패했습니다' })
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
          
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            loading={loading}
            variant="default"
            className="w-full flex items-center justify-center space-x-2 h-12"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            <span>Google 계정으로 시작하기</span>
          </Button>
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
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                loading={loading}
                variant="outline"
                className="w-full flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Google로 {isLogin ? '로그인' : '시작하기'}</span>
              </Button>

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