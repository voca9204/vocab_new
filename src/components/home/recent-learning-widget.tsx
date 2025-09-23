'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { Progress } from '@/components/ui/progress'
import {
  PlayCircle,
  Clock,
  Target,
  TrendingUp,
  ChevronRight,
  BookOpen,
  RotateCw,
  Sparkles,
  Brain,
  Award
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Collection } from '@/contexts/collection-context-v2'

interface LearningHistory {
  collectionId: string
  collectionName: string
  category: string
  difficulty: string
  lastStudiedAt: string
  progress: number
  wordsStudied: number
  totalWords: number
  sessionCount: number
  lastStudyMethod?: 'list' | 'flashcards' | 'quiz' | 'typing'  // 마지막 학습 방법 추가
}

interface RecentLearningWidgetProps {
  collections: Collection[]
  onSelectCollection: (collection: Collection, studyMethod?: 'list' | 'flashcards' | 'quiz' | 'typing') => Promise<void>
  loading?: boolean
}

export function RecentLearningWidget({
  collections,
  onSelectCollection,
  loading = false
}: RecentLearningWidgetProps) {
  const router = useRouter()
  const [history, setHistory] = useState<LearningHistory[]>([])
  const [lastUsed, setLastUsed] = useState<LearningHistory | null>(null)

  // localStorage에서 학습 기록 로드
  useEffect(() => {
    const loadHistory = () => {
      try {
        const saved = localStorage.getItem('learning_history')
        if (saved) {
          const parsed = JSON.parse(saved) as LearningHistory[]
          console.log('📚 Loaded history from localStorage:', parsed)
          // 날짜 순으로 정렬 (최근 것 먼저)
          const sorted = parsed.sort((a, b) =>
            new Date(b.lastStudiedAt).getTime() - new Date(a.lastStudiedAt).getTime()
          )
          setHistory(sorted.slice(0, 3)) // 최근 3개만
          setLastUsed(sorted[0] || null)
          console.log('📌 Last used study method:', sorted[0]?.lastStudyMethod)
        }
      } catch (error) {
        console.error('Failed to load learning history:', error)
      }
    }

    loadHistory()

    // localStorage 변경 감지를 위한 이벤트 리스너
    const handleStorageChange = () => {
      loadHistory()
    }

    window.addEventListener('storage', handleStorageChange)
    // 같은 탭에서도 변경 감지하기 위해 custom event 추가
    window.addEventListener('learningHistoryUpdated', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('learningHistoryUpdated', handleStorageChange)
    }
  }, [])

  // 학습 기록 저장은 page.tsx의 saveToHistory에서 처리
  // 이 컴포넌트는 읽기만 담당

  const handleContinue = async () => {
    if (!lastUsed) return

    console.log('🔄 handleContinue - lastUsed:', {
      collectionId: lastUsed.collectionId,
      lastStudyMethod: lastUsed.lastStudyMethod,
      fullObject: lastUsed
    })

    // 컬렉션 찾기
    const collection = collections.find(c => c.id === lastUsed.collectionId)
    if (collection) {
      const methodToUse = lastUsed.lastStudyMethod || 'flashcards'
      console.log('🎮 Calling onSelectCollection with method:', methodToUse)
      // 저장된 학습 방법 사용, 없으면 flashcards가 기본값
      // handleStartLearning이 자체적으로 saveToHistory를 호출하므로 여기서는 호출하지 않음
      await onSelectCollection(collection, methodToUse)
    }
  }

  const handleQuickSelect = async (historyItem: LearningHistory) => {
    const collection = collections.find(c => c.id === historyItem.collectionId)
    if (collection) {
      // 해당 히스토리 아이템의 저장된 학습 방법 사용
      // handleStartLearning이 자체적으로 saveToHistory를 호출하므로 여기서는 호출하지 않음
      await onSelectCollection(collection, historyItem.lastStudyMethod || 'flashcards')
    }
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const past = new Date(date)
    const diff = now.getTime() - past.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}일 전`
    if (hours > 0) return `${hours}시간 전`
    return '방금 전'
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 50) return 'bg-blue-500'
    if (progress >= 20) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  if (!lastUsed && history.length === 0) {
    return null // 학습 기록이 없으면 위젯을 표시하지 않음
  }

  // AI 추천 로직 (실제로는 서버에서 계산)
  const getAIRecommendation = () => {
    if (!lastUsed) return null

    // 난이도 업그레이드 추천
    if (lastUsed.progress >= 80 && lastUsed.difficulty === 'beginner') {
      return {
        type: 'upgrade',
        message: '초급 레벨을 거의 마스터하셨네요! 중급으로 도전해보세요.',
        icon: TrendingUp
      }
    }

    // 복습 추천
    const hoursSinceStudy = (new Date().getTime() - new Date(lastUsed.lastStudiedAt).getTime()) / (1000 * 60 * 60)
    if (hoursSinceStudy > 24) {
      return {
        type: 'review',
        message: '잊어버리기 전에 복습하면 장기 기억에 도움이 됩니다.',
        icon: Brain
      }
    }

    // 성취 격려
    if (lastUsed.sessionCount >= 5) {
      return {
        type: 'achievement',
        message: `${lastUsed.sessionCount}회 연속 학습 중! 꾸준함이 실력을 만듭니다.`,
        icon: Award
      }
    }

    return null
  }

  const aiRecommendation = getAIRecommendation()

  return (
    <div className="w-full max-w-7xl mx-auto mb-12">
      {/* 메인 계속하기 카드 */}
      {lastUsed && (
        <Card className="mb-6 overflow-hidden border-2 hover:border-blue-400 transition-all duration-300">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-1" />
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    이어서 학습하기
                  </h3>
                  <span className="text-sm text-gray-500">
                    {getTimeAgo(lastUsed.lastStudiedAt)}
                  </span>
                </div>

                {/* AI 추천 메시지 */}
                {aiRecommendation && (
                  <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded-lg">
                    <aiRecommendation.icon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-blue-700">{aiRecommendation.message}</p>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="text-2xl font-bold text-gray-900 mb-1">
                    {lastUsed.collectionName}
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{lastUsed.category}</span>
                    <span>•</span>
                    <span>{lastUsed.difficulty === 'beginner' ? '초급' :
                           lastUsed.difficulty === 'intermediate' ? '중급' : '고급'}</span>
                    <span>•</span>
                    <span>{lastUsed.sessionCount}회 학습</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        학습 진도
                      </span>
                      <span className="text-sm text-gray-600">
                        {lastUsed.wordsStudied} / {lastUsed.totalWords} 단어
                      </span>
                    </div>
                    <Progress
                      value={(lastUsed.wordsStudied / lastUsed.totalWords) * 100}
                      className="h-2"
                    />
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      <span>{Math.round((lastUsed.wordsStudied / lastUsed.totalWords) * 100)}% 완료</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>약 {Math.ceil((lastUsed.totalWords - lastUsed.wordsStudied) / 20)}분 남음</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ml-6">
                <Button
                  size="lg"
                  onClick={handleContinue}
                  disabled={loading}
                  className="group"
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  계속 학습
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 최근 학습 목록 */}
      {history.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <RotateCw className="h-5 w-5" />
            최근 학습한 단어장
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {history.map((item, index) => {
              const isLastUsed = item.collectionId === lastUsed?.collectionId
              if (isLastUsed && index === 0) return null // 메인 카드와 중복 방지

              return (
                <Card
                  key={item.collectionId}
                  className={cn(
                    "cursor-pointer transition-all duration-300 hover:shadow-md",
                    "hover:border-blue-400 border-2 border-transparent"
                  )}
                  onClick={() => handleQuickSelect(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <BookOpen className="h-5 w-5 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {getTimeAgo(item.lastStudiedAt)}
                      </span>
                    </div>

                    <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                      {item.collectionName}
                    </h4>

                    <div className="text-xs text-gray-600 mb-3">
                      {item.category} • {item.difficulty === 'beginner' ? '초급' :
                       item.difficulty === 'intermediate' ? '중급' : '고급'}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-300",
                              getProgressColor((item.wordsStudied / item.totalWords) * 100)
                            )}
                            style={{ width: `${(item.wordsStudied / item.totalWords) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {Math.round((item.wordsStudied / item.totalWords) * 100)}%
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}