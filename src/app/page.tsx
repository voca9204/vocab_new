'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { auth, db } from '@/lib/firebase/config'
import { onAuthStateChanged } from '@/lib/firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
import { FIREBASE_COLLECTIONS } from '@/lib/constants'

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [firestoreStatus, setFirestoreStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [error, setError] = useState<string | null>(null)

  // 인증 상태에 따른 리다이렉트
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
  }, [user, authLoading, router])

  // Firestore 연결 테스트
  useEffect(() => {
    const testFirestore = async () => {
      try {
        // 테스트용 컬렉션 조회
        const testRef = collection(db, 'test')
        await getDocs(testRef)
        setFirestoreStatus('connected')
      } catch (err: any) {
        console.error('Firestore connection error:', err)
        setFirestoreStatus('error')
        setError(err.message)
      }
    }

    testFirestore()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-yellow-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return '✅'
      case 'error': return '❌'
      default: return '🟡'
    }
  }

  // 로딩 중일 때 Firebase 상태 표시
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            SAT Vocabulary Learning Platform
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Version 2.0 - Next.js + Firebase + TypeScript
          </p>
          <p className="text-lg text-gray-500">
            🎯 목표: 2000+ SAT 단어 + 뉴스 기반 맥락 학습
          </p>
        </div>

        {/* Firebase 연결 상태 카드 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            🔥 Firebase 연결 상태
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Auth 상태 */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                🔐 Authentication
              </h3>
              {authLoading ? (
                <p className="text-yellow-600">🟡 확인 중...</p>
              ) : (
                <div>
                  <p className={getStatusColor(user ? 'connected' : 'error')}>
                    {getStatusIcon(user ? 'connected' : 'error')} 
                    {user ? ` 연결됨 (${user.email || 'Anonymous'})` : ' 미연결 (로그인 필요)'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Emulator: localhost:9199
                  </p>
                </div>
              )}
            </div>

            {/* Firestore 상태 */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                🗃️ Firestore
              </h3>
              <p className={getStatusColor(firestoreStatus)}>
                {getStatusIcon(firestoreStatus)} 
                {firestoreStatus === 'checking' && ' 확인 중...'}
                {firestoreStatus === 'connected' && ' 연결됨'}
                {firestoreStatus === 'error' && ' 연결 실패'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {firestoreStatus === 'error' 
                  ? 'Authentication required for access'
                  : 'Emulator: localhost:8181'
                }
              </p>
              {error && (
                <p className="text-xs text-red-500 mt-1">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 프로젝트 정보 카드 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            📊 프로젝트 V2 현황
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">15</div>
              <div className="text-gray-600">총 Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">2</div>
              <div className="text-gray-600">완료된 Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">2000+</div>
              <div className="text-gray-600">목표 SAT 단어</div>
            </div>
          </div>
        </div>

        {/* 다음 단계 */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            🚀 다음 단계
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-green-500">✅</span>
              <span>Task 1: Next.js + TypeScript 설정</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-green-500">✅</span>
              <span>Task 2: Firebase & Emulator Suite 설정</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-yellow-500">🔄</span>
              <span>Task 3: User Authentication System (진행 중)</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-gray-400">⏳</span>
              <span>Task 5: SAT 어휘 데이터베이스 구조</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-gray-400">⏳</span>
              <span>Task 10: 뉴스 크롤링 시스템</span>
            </div>
          </div>
        </div>

        {/* 리다이렉트 정보 */}
        <div className="text-center mt-8 text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>
            {authLoading ? '인증 상태 확인 중...' : 
             user ? '대시보드로 이동 중...' : '로그인 페이지로 이동 중...'}
          </p>
        </div>

        {/* 푸터 */}
        <div className="text-center mt-8 text-gray-500">
          <p>🔥 Built with Next.js 15 + Firebase + TypeScript</p>
          <p className="text-sm mt-2">V2 프로젝트 - 안정성과 확장성 우선</p>
        </div>
      </div>
    </div>
  )
}