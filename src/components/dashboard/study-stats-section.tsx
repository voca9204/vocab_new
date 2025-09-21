'use client'

import React, { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EnhancedProgressBar, CircularProgressBar, StackedProgressBar } from '@/components/ui/progress-bar-enhanced'
import { cn } from '@/lib/utils'
import type { Collection } from '@/contexts/collection-context-v2'

interface StudyStatsSectionProps {
  selectedCollections: Collection[]
  onStartStudy: (mode: string) => void
  className?: string
}

// 학습 통계 타입
interface StudyStats {
  totalWords: number
  studiedWords: number
  masteredWords: number
  overallProgress: number
  masteryRate: number
  avgAccuracy: number
  estimatedTime: number
  remainingTime: number
  weeklyProgress: {
    studied: number
    time: number // 분
    streak: number
  }
  dailyGoal: {
    target: number
    current: number
    percentage: number
  }
}

// Mock 데이터 (실제로는 API에서 가져올 데이터)
const mockWeeklyStats = {
  studied: 127,
  time: 154, // 2시간 34분
  streak: 5
}

const mockDailyGoal = {
  target: 30,
  current: 23
}

export function StudyStatsSection({
  selectedCollections,
  onStartStudy,
  className
}: StudyStatsSectionProps) {
  
  // 통계 계산
  const stats: StudyStats = useMemo(() => {
    const totalWords = selectedCollections.reduce((sum, c) => sum + (c.wordCount || 0), 0)
    const studiedWords = selectedCollections.reduce((sum, c) => sum + (c.progress?.studied || 0), 0)
    const masteredWords = selectedCollections.reduce((sum, c) => sum + (c.progress?.mastered || 0), 0)
    const overallProgress = totalWords > 0 ? Math.round((studiedWords / totalWords) * 100) : 0
    const masteryRate = studiedWords > 0 ? Math.round((masteredWords / studiedWords) * 100) : 0
    
    // 평균 정확도 계산
    const avgAccuracy = selectedCollections
      .filter(c => c.progress?.accuracyRate)
      .reduce((sum, c, _, arr) => sum + (c.progress?.accuracyRate || 0) / arr.length, 0)

    // 예상 학습 시간
    const estimatedTime = selectedCollections.reduce((sum, c) => sum + (c.metadata?.estimatedTime || 0), 0)
    const remainingTime = Math.max(0, estimatedTime - Math.floor(estimatedTime * (overallProgress / 100)))
    
    return {
      totalWords,
      studiedWords,
      masteredWords,
      overallProgress,
      masteryRate,
      avgAccuracy: Math.round(avgAccuracy),
      estimatedTime,
      remainingTime,
      weeklyProgress: mockWeeklyStats,
      dailyGoal: {
        ...mockDailyGoal,
        percentage: Math.round((mockDailyGoal.current / mockDailyGoal.target) * 100)
      }
    }
  }, [selectedCollections])

  // 시간 포맷팅 함수
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}분`
  }

  // 레벨 계산 (학습한 단어 수 기준)
  const getLevel = (studiedWords: number) => {
    if (studiedWords < 100) return { level: 1, title: '초심자' }
    if (studiedWords < 300) return { level: 2, title: '학습자' }
    if (studiedWords < 600) return { level: 3, title: '중급자' }
    if (studiedWords < 1000) return { level: 4, title: '고급자' }
    return { level: 5, title: '마스터' }
  }

  const userLevel = getLevel(stats.studiedWords)

  return (
    <div className={cn("space-y-6", className)}>
      {/* 전체 학습 진도 */}
      <Card className="p-4 sm:p-6 border-0 shadow-lg">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-base sm:text-lg">📊</span>
            전체 학습 진도
          </h3>
          <Badge variant="outline" className="text-xs">
            {userLevel.title} Lv.{userLevel.level}
          </Badge>
        </div>
        
        <div className="space-y-4 sm:space-y-6">
          <div className="text-center">
            <CircularProgressBar
              value={stats.overallProgress}
              size={100}
              variant="default"
              className="mx-auto sm:size-120"
            >
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
                  {stats.overallProgress}%
                </div>
                <div className="text-xs text-gray-500">
                  전체 진도
                </div>
              </div>
            </CircularProgressBar>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
              <div className="text-lg sm:text-xl font-bold text-blue-600">{stats.studiedWords.toLocaleString()}</div>
              <div className="text-gray-600 text-xs sm:text-sm">학습한 단어</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
              <div className="text-lg sm:text-xl font-bold text-green-600">{stats.masteredWords.toLocaleString()}</div>
              <div className="text-gray-600 text-xs sm:text-sm">완료한 단어</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>정확도</span>
              <span className="font-medium text-purple-600">{stats.avgAccuracy}%</span>
            </div>
            <EnhancedProgressBar
              value={stats.avgAccuracy}
              max={100}
              variant="default"
              size="sm"
            />
          </div>

          {stats.totalWords > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>완료율</span>
                <span className="font-medium text-green-600">{stats.masteryRate}%</span>
              </div>
              <EnhancedProgressBar
                value={stats.masteredWords}
                max={stats.totalWords}
                variant="success"
                size="sm"
              />
            </div>
          )}
        </div>
      </Card>

      {/* 이번 주 학습 현황 */}
      <Card className="p-4 sm:p-6 border-0 shadow-lg">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
          <span className="text-base sm:text-lg">📈</span>
          이번 주 학습 현황
        </h3>
        
        <div className="space-y-4">
          {[
            { 
              icon: '📚', 
              label: '학습한 단어', 
              period: '이번 주',
              value: stats.weeklyProgress.studied.toString(), 
              change: '+23 어제',
              color: 'blue',
              bgColor: 'bg-blue-50'
            },
            { 
              icon: '⏰', 
              label: '학습 시간', 
              period: '이번 주',
              value: formatTime(stats.weeklyProgress.time), 
              change: '+28m 어제',
              color: 'green',
              bgColor: 'bg-green-50'
            },
            { 
              icon: '🔥', 
              label: '연속 학습', 
              period: '스트릭',
              value: `${stats.weeklyProgress.streak}일`, 
              change: '최고 기록!',
              color: 'purple',
              bgColor: 'bg-purple-50'
            }
          ].map(({ icon, label, period, value, change, color, bgColor }) => (
            <div key={label} className={cn("flex items-center justify-between p-3 sm:p-4 rounded-lg", bgColor)}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center", 
                  color === 'blue' ? 'bg-blue-100' :
                  color === 'green' ? 'bg-green-100' : 'bg-purple-100'
                )}>
                  <span className="text-sm sm:text-lg">{icon}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm sm:text-base">{label}</div>
                  <div className="text-xs text-gray-600">{period}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={cn("text-base sm:text-xl font-bold", 
                  color === 'blue' ? 'text-blue-600' :
                  color === 'green' ? 'text-green-600' : 'text-purple-600'
                )}>
                  {value}
                </div>
                <div className={cn("text-[10px] sm:text-xs", 
                  color === 'blue' ? 'text-blue-500' :
                  color === 'green' ? 'text-green-500' : 'text-purple-500'
                )}>
                  {change}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 일일 목표 */}
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100">
          <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-2">
            <span>일일 목표</span>
            <span>{stats.dailyGoal.current} / {stats.dailyGoal.target}단어</span>
          </div>
          <EnhancedProgressBar
            value={stats.dailyGoal.current}
            max={stats.dailyGoal.target}
            variant={stats.dailyGoal.percentage >= 100 ? "success" : "warning"}
            size="sm"
            showLabel={true}
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              {stats.dailyGoal.percentage >= 100 ? (
                <>
                  <span>🎉</span>
                  오늘 목표를 달성했습니다!
                </>
              ) : (
                <>
                  <span>💪</span>
                  {stats.dailyGoal.target - stats.dailyGoal.current}개 더 학습하면 목표 달성!
                </>
              )}
            </p>
            {stats.dailyGoal.percentage >= 100 && (
              <Badge variant="default" className="text-xs">
                목표 달성
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* 추천 학습 */}
      <Card className="p-4 sm:p-6 border-0 shadow-lg">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
          <span className="text-base sm:text-lg">💡</span>
          추천 학습
        </h3>
        
        <div className="space-y-4">
          {/* 오늘의 복습 */}
          <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <span className="text-xl sm:text-2xl">🎯</span>
              <div>
                <div className="font-medium text-gray-900 text-sm sm:text-base">오늘의 복습</div>
                <div className="text-xs sm:text-sm text-gray-600">어제 학습한 단어 복습</div>
              </div>
            </div>
            <Button 
              size="sm" 
              className="w-full min-h-[36px] sm:min-h-[32px] text-xs sm:text-sm" 
              variant="outline"
              onClick={() => onStartStudy('review')}
              disabled={selectedCollections.length === 0}
            >
              복습 시작 (15분)
            </Button>
          </div>

          {/* 새로운 단어 학습 */}
          {stats.remainingTime > 0 && (
            <div className="p-3 sm:p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <span className="text-xl sm:text-2xl">📖</span>
                <div>
                  <div className="font-medium text-gray-900 text-sm sm:text-base">새로운 단어</div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    약 {Math.ceil(stats.remainingTime / 60)}시간 남음
                  </div>
                </div>
              </div>
              <Button 
                size="sm" 
                className="w-full min-h-[36px] sm:min-h-[32px] text-xs sm:text-sm"
                onClick={() => onStartStudy('flashcards')}
                disabled={selectedCollections.length === 0}
              >
                학습 계속하기
              </Button>
            </div>
          )}

          {/* 약한 단어 집중 학습 */}
          <div className="p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-100">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <span className="text-xl sm:text-2xl">🎖️</span>
              <div>
                <div className="font-medium text-gray-900 text-sm sm:text-base">약한 단어 집중</div>
                <div className="text-xs sm:text-sm text-gray-600">
                  정답률이 낮은 단어 위주 학습
                </div>
              </div>
            </div>
            <Button 
              size="sm" 
              className="w-full min-h-[36px] sm:min-h-[32px] text-xs sm:text-sm" 
              variant="outline"
              onClick={() => onStartStudy('weak-words')}
              disabled={selectedCollections.length === 0}
            >
              집중 학습 시작
            </Button>
          </div>

          {/* 랜덤 학습 */}
          {selectedCollections.length > 1 && (
            <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <span className="text-xl sm:text-2xl">🎲</span>
                <div>
                  <div className="font-medium text-gray-900 text-sm sm:text-base">랜덤 학습</div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    모든 단어장에서 랜덤 선택
                  </div>
                </div>
              </div>
              <Button 
                size="sm" 
                className="w-full min-h-[36px] sm:min-h-[32px] text-xs sm:text-sm" 
                variant="outline"
                onClick={() => onStartStudy('random')}
              >
                랜덤 퀴즈 시작
              </Button>
            </div>
          )}
        </div>

        {/* 학습 통계 상세 */}
        {stats.totalWords > 0 && (
          <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100">
            <div className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">단어장별 진도</div>
            <StackedProgressBar
              items={selectedCollections.map(c => ({
                label: c.name,
                value: c.progress?.studied || 0,
                max: c.wordCount || 0,
                variant: c.type === 'official' ? 'success' : 
                        c.type === 'personal' ? 'default' : 'warning'
              })).slice(0, 3)} // 최대 3개만 표시
            />
            {selectedCollections.length > 3 && (
              <p className="text-xs text-gray-500 mt-2">
                +{selectedCollections.length - 3}개 단어장 더 있음
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}