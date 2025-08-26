'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Collection } from '@/contexts/collection-context-v2'

interface StudyMode {
  id: string
  name: string
  icon: string
  description: string
  shortDesc: string
  estimatedTime: string
  color: string
  bgColor: string
  features: string[]
  recommended?: boolean
}

interface QuickStudySectionProps {
  selectedCollections: Collection[]
  onStartStudy: (mode: string) => void
  className?: string
}

// 학습 모드 정의
const STUDY_MODES: StudyMode[] = [
  {
    id: 'flashcards',
    name: '플래시카드',
    icon: '🃏',
    description: '카드 형태로 단어를 암기하는 가장 효과적인 학습 방법',
    shortDesc: '카드 형태 암기',
    estimatedTime: '15-30분',
    color: 'blue',
    bgColor: 'from-blue-500 to-blue-600',
    features: ['간격 반복 학습', '자동 난이도 조절', '시각적 암기'],
    recommended: true
  },
  {
    id: 'quiz',
    name: '퀴즈',
    icon: '❓',
    description: '다양한 문제 형태로 단어 실력을 테스트하고 향상',
    shortDesc: '문제 풀이 방식',
    estimatedTime: '10-20분',
    color: 'green',
    bgColor: 'from-green-500 to-green-600',
    features: ['객관식/주관식', '즉시 피드백', '약점 분석']
  },
  {
    id: 'typing',
    name: '타이핑',
    icon: '⌨️',
    description: '단어를 직접 입력하여 철자와 의미를 함께 학습',
    shortDesc: '직접 입력 학습',
    estimatedTime: '20-30분',
    color: 'purple',
    bgColor: 'from-purple-500 to-purple-600',
    features: ['철자 정확도', '타이핑 속도', '근육 기억 향상']
  },
  {
    id: 'list',
    name: '단어목록',
    icon: '📝',
    description: '체계적인 단어 목록으로 한 눈에 여러 단어를 학습',
    shortDesc: '체계적 학습',
    estimatedTime: '자유롭게',
    color: 'orange',
    bgColor: 'from-orange-500 to-orange-600',
    features: ['전체 단어 조망', '검색/필터', '상세 정보']
  }
]

// 추가 학습 옵션
const ADVANCED_MODES: StudyMode[] = [
  {
    id: 'review',
    name: '복습',
    icon: '🔄',
    description: '이전에 학습한 단어들을 복습하여 장기 기억으로 전환',
    shortDesc: '복습 모드',
    estimatedTime: '10-15분',
    color: 'indigo',
    bgColor: 'from-indigo-500 to-indigo-600',
    features: ['망각 곡선 기반', '개인화 복습', '효율적 반복']
  },
  {
    id: 'weak-words',
    name: '약한 단어',
    icon: '🎯',
    description: '정답률이 낮은 단어들을 집중적으로 학습',
    shortDesc: '집중 학습',
    estimatedTime: '15-25분',
    color: 'red',
    bgColor: 'from-red-500 to-red-600',
    features: ['AI 분석', '맞춤형 학습', '약점 보완']
  },
  {
    id: 'random',
    name: '랜덤',
    icon: '🎲',
    description: '모든 단어장에서 무작위로 선택된 단어들로 학습',
    shortDesc: '랜덤 학습',
    estimatedTime: '자유롭게',
    color: 'pink',
    bgColor: 'from-pink-500 to-pink-600',
    features: ['예측 불가능', '전체 단어장', '흥미 유발']
  }
]

export function QuickStudySection({
  selectedCollections,
  onStartStudy,
  className
}: QuickStudySectionProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const totalWords = selectedCollections.reduce((sum, c) => sum + (c.wordCount || 0), 0)
  const studiedWords = selectedCollections.reduce((sum, c) => sum + (c.progress?.studied || 0), 0)
  const hasProgress = studiedWords > 0

  // 학습 모드 카드 렌더링
  const renderModeCard = (mode: StudyMode, size: 'large' | 'small' = 'large') => {
    const isDisabled = selectedCollections.length === 0
    const isReviewMode = mode.id === 'review' && !hasProgress
    const disabled = isDisabled || isReviewMode

    return (
      <div
        key={mode.id}
        className={cn(
          "group cursor-pointer transition-all duration-200",
          size === 'large' ? "h-32" : "h-24"
        )}
        onClick={() => !disabled && onStartStudy(mode.id)}
      >
        <Card className={cn(
          "h-full border-0 shadow-lg hover:shadow-xl transition-all",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02]"
        )}>
          <div className={cn(
            "h-full p-6 bg-gradient-to-br text-white relative overflow-hidden",
            mode.bgColor,
            disabled && "grayscale"
          )}>
            {/* 추천 배지 */}
            {mode.recommended && !disabled && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                  추천
                </Badge>
              </div>
            )}
            
            {/* 배경 패턴 */}
            <div className="absolute inset-0 opacity-10">
              <div className="w-full h-full bg-gradient-to-br from-transparent to-black/20" />
            </div>
            
            {/* 컨텐츠 */}
            <div className="relative z-10 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                <span className={cn(
                  "text-2xl",
                  size === 'small' && "text-xl"
                )}>
                  {mode.icon}
                </span>
                <div>
                  <h3 className={cn(
                    "font-bold",
                    size === 'large' ? "text-lg" : "text-base"
                  )}>
                    {mode.name}
                  </h3>
                  <p className={cn(
                    "text-white/80 text-xs",
                    size === 'large' ? "block" : "hidden"
                  )}>
                    {mode.shortDesc}
                  </p>
                </div>
              </div>
              
              {size === 'large' && (
                <>
                  <p className="text-sm text-white/90 mb-3 flex-1 line-clamp-2">
                    {mode.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>⏱️ {mode.estimatedTime}</span>
                    {!disabled && (
                      <span className="group-hover:text-white transition-colors">
                        시작하기 →
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <Card className={cn("p-6 border-0 shadow-lg", className)}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <span>⚡</span>
          빠른 학습 시작
        </h2>
        <p className="text-sm text-gray-600">
          선호하는 학습 방식을 선택하여 즉시 시작하세요
          {selectedCollections.length > 0 && (
            <span className="ml-2 text-blue-600 font-medium">
              ({totalWords.toLocaleString()}개 단어 준비됨)
            </span>
          )}
        </p>
      </div>

      {selectedCollections.length === 0 ? (
        /* 단어장 미선택 상태 */
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
          <div className="text-6xl mb-4 opacity-50">⚡</div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            학습할 단어장을 먼저 선택해주세요
          </h3>
          <p className="text-gray-500 text-sm">
            단어장을 선택하면 다양한 학습 모드를 사용할 수 있습니다
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 메인 학습 모드들 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STUDY_MODES.map(mode => renderModeCard(mode))}
          </div>

          {/* 고급 학습 옵션 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <span>🎯</span>
                고급 학습 옵션
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-blue-600 hover:text-blue-700"
              >
                {showAdvanced ? '숨기기' : '더보기'}
                <span className={cn(
                  "ml-1 transition-transform",
                  showAdvanced && "rotate-180"
                )}>
                  ↓
                </span>
              </Button>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ADVANCED_MODES.map(mode => renderModeCard(mode, 'small'))}
              </div>
            )}
          </div>

          {/* 학습 팁 */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-2">학습 팁</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>플래시카드</strong>는 새로운 단어 암기에 가장 효과적입니다</li>
                  <li>• <strong>퀴즈</strong>로 학습 효과를 확인하고 실력을 측정하세요</li>
                  <li>• <strong>복습</strong>은 망각 곡선을 고려한 최적의 시점에 진행됩니다</li>
                  <li>• 하루 15-30분 꾸준한 학습이 집중적인 학습보다 효과적입니다</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 추천 학습 계획 */}
          {hasProgress && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-100">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📋</span>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-2">오늘의 추천 학습 계획</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center text-xs">1</span>
                      <span>복습 (10분) - 어제 학습한 단어들</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center text-xs">2</span>
                      <span>새 단어 학습 (15분) - 플래시카드 추천</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center text-xs">3</span>
                      <span>퀴즈 (5분) - 학습 효과 확인</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}