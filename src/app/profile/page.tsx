'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui'
import {
  User,
  Mail,
  Calendar,
  Trophy,
  Target,
  BookOpen,
  Clock,
  TrendingUp,
  Award,
  ChevronRight
} from 'lucide-react'
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { useUserStatistics } from '@/hooks/useUserStatistics'

interface UserStats {
  totalWords: number
  masteredWords: number
  studyDays: number
  currentStreak: number
  totalStudyTime: number
  averageAccuracy: number
}

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const userStats = useUserStatistics()

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p className="text-gray-600 mb-4">로그인이 필요합니다</p>
        <Button onClick={() => router.push('/login')}>
          로그인하기
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Profile Header */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{user.displayName || '학습자'}</h1>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4" />
              {user.email}
            </p>
            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" />
              가입일: {new Date(user.metadata.creationTime || '').toLocaleDateString('ko-KR')}
            </p>
          </div>
        </div>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{userStats.totalWords}</p>
              <p className="text-sm text-gray-600">학습한 단어</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{userStats.masteredWords}</p>
              <p className="text-sm text-gray-600">마스터한 단어</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{userStats.averageAccuracy}%</p>
              <p className="text-sm text-gray-600">평균 정답률</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{userStats.studyDays}일</p>
              <p className="text-sm text-gray-600">총 학습일</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{userStats.currentStreak}일</p>
              <p className="text-sm text-gray-600">연속 학습</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-indigo-500" />
            <div>
              <p className="text-2xl font-bold">{userStats.totalStudyTime}시간</p>
              <p className="text-sm text-gray-600">총 학습 시간</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold mb-3">빠른 메뉴</h2>

        <Card
          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => router.push('/study/stats')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-blue-500" />
              <span>학습 통계 상세보기</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => router.push('/achievements')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span>성취 배지 확인</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => router.push('/settings')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-500" />
              <span>프로필 설정</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </Card>
      </div>
    </div>
  )
}