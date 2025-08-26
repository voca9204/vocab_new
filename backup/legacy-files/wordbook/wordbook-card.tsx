'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { UnifiedWordbook, WordbookProgress } from '@/types/unified-wordbook'

interface WordbookCardProps {
  wordbook: UnifiedWordbook
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  onStartStudy?: (id: string) => void
  className?: string
  showActions?: boolean
  compact?: boolean
}

// 단어장 타입별 색상 매핑
const TYPE_COLORS = {
  official: 'bg-green-50 border-green-200 text-green-800',
  personal: 'bg-purple-50 border-purple-200 text-purple-800', 
  photo: 'bg-orange-50 border-orange-200 text-orange-800',
  public: 'bg-blue-50 border-blue-200 text-blue-800'
} as const

// 단어장 타입별 아이콘
const TYPE_ICONS = {
  official: '📖',
  personal: '👤',
  photo: '📸',
  public: '🌍'
} as const

// 난이도별 색상
const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800', 
  hard: 'bg-red-100 text-red-800'
} as const

export function WordbookCard({
  wordbook,
  isSelected = false,
  onToggleSelect,
  onStartStudy,
  className,
  showActions = true,
  compact = false
}: WordbookCardProps) {
  const typeColorClass = TYPE_COLORS[wordbook.type] || TYPE_COLORS.official
  const typeIcon = TYPE_ICONS[wordbook.type] || TYPE_ICONS.official
  
  const progress = wordbook.progress
  const progressPercentage = progress && wordbook.wordCount ? Math.round((progress.studied / wordbook.wordCount) * 100) : 0
  const masteryPercentage = progress && wordbook.wordCount ? Math.round((progress.mastered / wordbook.wordCount) * 100) : 0

  const difficultyColor = wordbook.metadata.difficulty ? 
    DIFFICULTY_COLORS[wordbook.metadata.difficulty] : 
    'bg-gray-100 text-gray-800'

  const estimatedTime = wordbook.metadata.estimatedTime ? 
    `${wordbook.metadata.estimatedTime}분` : 
    `${Math.ceil((wordbook.wordCount || 0) * 2)}분`

  return (
    <div className={cn(
      'wordbook-card rounded-xl border-2 transition-all duration-200 hover:shadow-md',
      'border-transparent bg-white shadow-sm',
      isSelected && 'border-blue-500 shadow-lg ring-1 ring-blue-100',
      `border-l-4 border-l-${wordbook.type === 'official' ? 'green' : 
                               wordbook.type === 'personal' ? 'purple' : 
                               wordbook.type === 'photo' ? 'orange' : 'blue'}-500`,
      compact ? 'p-4' : 'p-6',
      className
    )}>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{typeIcon}</span>
            <h3 className={cn(
              'font-semibold truncate',
              compact ? 'text-base' : 'text-lg'
            )}>
              {wordbook.name}
            </h3>
            {isSelected && (
              <Badge variant="default" className="ml-auto">
                선택됨
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Badge variant="outline" className={typeColorClass}>
              {wordbook.type === 'official' ? '공식' :
               wordbook.type === 'personal' ? '개인' :
               wordbook.type === 'photo' ? '사진' : '공개'}
            </Badge>
            
            {wordbook.category && (
              <Badge variant="outline">
                {wordbook.category}
              </Badge>
            )}
            
            {wordbook.metadata.difficulty && (
              <Badge className={difficultyColor}>
                {wordbook.metadata.difficulty === 'easy' ? '쉬움' :
                 wordbook.metadata.difficulty === 'medium' ? '보통' : '어려움'}
              </Badge>
            )}
          </div>
        </div>
        
        {showActions && (
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant={isSelected ? "destructive" : "default"}
              size="sm"
              disabled={wordbook.wordCount === 0}
              onClick={() => onToggleSelect?.(wordbook.id)}
            >
              {wordbook.wordCount === 0 ? '준비 중' : (isSelected ? '제거' : '추가')}
            </Button>
          </div>
        )}
      </div>

      {/* 설명 */}
      {wordbook.description && !compact && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {wordbook.description}
        </p>
      )}

      {/* 통계 정보 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">단어 수</span>
          {wordbook.wordCount === 0 ? (
            <Badge variant="outline" className="bg-gray-50 text-gray-500">
              Coming Soon
            </Badge>
          ) : (
            <span className="font-medium">{wordbook.wordCount.toLocaleString()}개</span>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">예상 시간</span>
          <span className="font-medium">{estimatedTime}</span>
        </div>

        {/* 진도 표시 */}
        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">학습 진도</span>
              <span className="font-medium">{progressPercentage}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>학습: {progress.studied}개</span>
              <span>완료: {progress.mastered}개</span>
              {progress.lastStudiedAt && (
                <span>
                  최근: {progress.lastStudiedAt.toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 태그 */}
      {wordbook.metadata.tags && wordbook.metadata.tags.length > 0 && !compact && (
        <div className="flex flex-wrap gap-1 mt-4">
          {wordbook.metadata.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {wordbook.metadata.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{wordbook.metadata.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* 빠른 액션 */}
      {showActions && !compact && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onStartStudy?.(wordbook.id)}
          >
            학습 시작
          </Button>
          
          {wordbook.metadata.statistics && (
            <Button variant="ghost" size="sm">
              통계 보기
            </Button>
          )}
        </div>
      )}

      {/* 통계 정보 (공식 단어장용) */}
      {wordbook.metadata.statistics && !compact && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {wordbook.metadata.statistics.totalUsers && (
              <div className="text-center">
                <div className="font-semibold text-blue-600">
                  {wordbook.metadata.statistics.totalUsers.toLocaleString()}
                </div>
                <div className="text-gray-500 text-xs">사용자</div>
              </div>
            )}
            
            {wordbook.metadata.statistics.avgMastery && (
              <div className="text-center">
                <div className="font-semibold text-green-600">
                  {Math.round(wordbook.metadata.statistics.avgMastery)}%
                </div>
                <div className="text-gray-500 text-xs">평균 숙련도</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 소유권 정보 */}
      {wordbook.ownership && !compact && (
        <div className="mt-2 text-xs text-gray-400">
          {wordbook.ownership.isPublic ? '공개' : '비공개'} • 
          {wordbook.ownership.canEdit && ' 편집 가능'}
        </div>
      )}
    </div>
  )
}

// 컴팩트한 리스트 아이템 버전
export function WordbookListItem({
  wordbook,
  isSelected = false,
  onToggleSelect,
  onStartStudy,
  className
}: WordbookCardProps) {
  const typeIcon = TYPE_ICONS[wordbook.type] || TYPE_ICONS.official
  const progress = wordbook.progress
  const progressPercentage = progress && wordbook.wordCount ? Math.round((progress.studied / wordbook.wordCount) * 100) : 0

  return (
    <div className={cn(
      'flex items-center p-4 bg-white border rounded-lg hover:bg-gray-50 transition-colors',
      isSelected && 'border-blue-500 bg-blue-50',
      className
    )}>
      <span className="text-lg mr-3">{typeIcon}</span>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{wordbook.name}</h4>
          {isSelected && (
            <Badge variant="default" size="sm">선택됨</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
          <span>{(wordbook.wordCount || 0)}개 단어</span>
          {progress && (
            <>
              <span>•</span>
              <span>{progressPercentage}% 완료</span>
            </>
          )}
          {wordbook.category && (
            <>
              <span>•</span>
              <span>{wordbook.category}</span>
            </>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onStartStudy?.(wordbook.id)}
        >
          학습
        </Button>
        
        <Button
          variant={isSelected ? "destructive" : "outline"}
          size="sm"
          onClick={() => onToggleSelect?.(wordbook.id)}
        >
          {isSelected ? '제거' : '추가'}
        </Button>
      </div>
    </div>
  )
}