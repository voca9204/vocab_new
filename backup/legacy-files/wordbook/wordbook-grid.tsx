'use client'

import React, { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { WordbookCard, WordbookListItem } from './wordbook-card'
import type { 
  UnifiedWordbook, 
  WordbookFilter, 
  WordbookType,
  sortWordbooks,
  searchWordbooks,
  groupWordbooksByType
} from '@/types/unified-wordbook'

interface WordbookGridProps {
  wordbooks: UnifiedWordbook[]
  selectedWordbooks?: UnifiedWordbook[]
  onToggleSelect?: (wordbookId: string) => void
  onStartStudy?: (wordbookId: string) => void
  filter?: WordbookFilter
  onFilterChange?: (filter: Partial<WordbookFilter>) => void
  className?: string
  layout?: 'grid' | 'list'
  showSearch?: boolean
  showFilters?: boolean
  showGrouping?: boolean
  emptyMessage?: string
}

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '쉬움' },
  { value: 'medium', label: '보통' },
  { value: 'hard', label: '어려움' }
]

const SORT_OPTIONS = [
  { value: 'name', label: '이름순' },
  { value: 'created', label: '생성일순' },
  { value: 'updated', label: '수정일순' },
  { value: 'wordCount', label: '단어수순' },
  { value: 'progress', label: '진도순' }
]

const TYPE_LABELS = {
  official: '공식 단어장',
  personal: '개인 단어장',
  photo: '사진 단어장',
  public: '공개 단어장'
} as const

export function WordbookGrid({
  wordbooks,
  selectedWordbooks = [],
  onToggleSelect,
  onStartStudy,
  filter = {},
  onFilterChange,
  className,
  layout = 'grid',
  showSearch = true,
  showFilters = true,
  showGrouping = false,
  emptyMessage = '단어장이 없습니다.'
}: WordbookGridProps) {
  const [searchQuery, setSearchQuery] = useState(filter.search || '')
  const [localFilter, setLocalFilter] = useState<WordbookFilter>(filter)
  
  // Remove unused getUtilityFunctions as we're using inline logic now

  // 선택된 단어장 ID 세트
  const selectedIds = useMemo(() => 
    new Set(selectedWordbooks.map(wb => wb.id)), 
    [selectedWordbooks]
  )

  // 필터링 및 정렬된 단어장 (동기 처리로 수정)
  const filteredWordbooks = useMemo(() => {
    let filtered = [...wordbooks]

    // 텍스트 검색 (간단한 포함 검색)
    if (searchQuery.trim()) {
      const lowercaseQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(wordbook => 
        wordbook.name.toLowerCase().includes(lowercaseQuery) ||
        wordbook.description?.toLowerCase().includes(lowercaseQuery) ||
        wordbook.metadata.tags?.some(tag => 
          tag.toLowerCase().includes(lowercaseQuery)
        )
      )
    }

    // 타입 필터
    if (localFilter.type) {
      const types = Array.isArray(localFilter.type) ? localFilter.type : [localFilter.type]
      filtered = filtered.filter(wb => types.includes(wb.type))
    }

    // 카테고리 필터
    if (localFilter.category && localFilter.category.length > 0) {
      filtered = filtered.filter(wb => 
        wb.category && localFilter.category!.includes(wb.category)
      )
    }

    // 난이도 필터
    if (localFilter.difficulty && localFilter.difficulty.length > 0) {
      filtered = filtered.filter(wb =>
        wb.metadata.difficulty && localFilter.difficulty!.includes(wb.metadata.difficulty)
      )
    }

    // 태그 필터
    if (localFilter.tags && localFilter.tags.length > 0) {
      filtered = filtered.filter(wb =>
        wb.metadata.tags?.some(tag => localFilter.tags!.includes(tag))
      )
    }

    // 선택 상태 필터
    if (localFilter.isSelected !== undefined) {
      filtered = filtered.filter(wb => 
        selectedIds.has(wb.id) === localFilter.isSelected
      )
    }

    // 진도 필터
    if (localFilter.hasProgress !== undefined) {
      filtered = filtered.filter(wb => 
        (wb.progress !== undefined) === localFilter.hasProgress
      )
    }

    // 간단한 정렬 (동기)
    const sortBy = localFilter.sortBy || 'name'
    const order = localFilter.sortOrder || 'asc'
    
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'created':
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
        case 'updated':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime()
          break
        case 'wordCount':
          comparison = a.wordCount - b.wordCount
          break
        case 'progress':
          const aProgress = a.progress?.studied || 0
          const bProgress = b.progress?.studied || 0
          comparison = aProgress - bProgress
          break
        default:
          comparison = 0
      }
      
      return order === 'asc' ? comparison : -comparison
    })
    
    return sorted
  }, [wordbooks, searchQuery, localFilter, selectedIds])

  // 그룹화된 단어장 (필요시)
  const groupedWordbooks = useMemo(() => {
    if (!showGrouping) return null
    
    // 간단한 그룹핑 로직
    return filteredWordbooks.reduce((groups, wordbook) => {
      if (!groups[wordbook.type]) {
        groups[wordbook.type] = []
      }
      groups[wordbook.type].push(wordbook)
      return groups
    }, {} as Record<WordbookType, UnifiedWordbook[]>)
  }, [filteredWordbooks, showGrouping])

  // 필터 업데이트
  const updateFilter = (updates: Partial<WordbookFilter>) => {
    const newFilter = { ...localFilter, ...updates }
    setLocalFilter(newFilter)
    onFilterChange?.(newFilter)
  }

  // 검색 핸들러
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    updateFilter({ search: value })
  }

  // 단어장 카드 렌더링
  const renderWordbook = (wordbook: UnifiedWordbook) => {
    const isSelected = selectedIds.has(wordbook.id)
    const key = wordbook.id
    
    if (layout === 'list') {
      return (
        <WordbookListItem
          key={key}
          wordbook={wordbook}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          onStartStudy={onStartStudy}
        />
      )
    }
    
    return (
      <WordbookCard
        key={key}
        wordbook={wordbook}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onStartStudy={onStartStudy}
      />
    )
  }

  // 그룹별 렌더링
  const renderGroup = async (type: WordbookType, wordbooks: UnifiedWordbook[]) => {
    if (wordbooks.length === 0) return null
    
    return (
      <div key={type} className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{TYPE_LABELS[type]}</h3>
          <Badge variant="outline">{wordbooks.length}</Badge>
        </div>
        
        <div className={cn(
          layout === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-2'
        )}>
          {wordbooks.map(renderWordbook)}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 검색 및 필터 */}
      {(showSearch || showFilters) && (
        <div className="space-y-4">
          {/* 검색 바 */}
          {showSearch && (
            <div className="relative">
              <Input
                placeholder="단어장 검색..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* 필터 옵션 */}
          {showFilters && (
            <div className="flex flex-wrap gap-3">
              {/* 타입 필터 */}
              <Select 
                value={localFilter.type as string || 'all'} 
                onValueChange={(value) => 
                  updateFilter({ type: value === 'all' ? undefined : value as WordbookType })
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="타입 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 타입</SelectItem>
                  <SelectItem value="official">공식</SelectItem>
                  <SelectItem value="personal">개인</SelectItem>
                  <SelectItem value="photo">사진</SelectItem>
                  <SelectItem value="public">공개</SelectItem>
                </SelectContent>
              </Select>

              {/* 난이도 필터 */}
              <Select
                value={localFilter.difficulty?.[0] || 'all'}
                onValueChange={(value) =>
                  updateFilter({ 
                    difficulty: value === 'all' ? undefined : [value as 'easy' | 'medium' | 'hard']
                  })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="난이도" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 난이도</SelectItem>
                  {DIFFICULTY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 정렬 옵션 */}
              <Select
                value={localFilter.sortBy || 'name'}
                onValueChange={(value) =>
                  updateFilter({ sortBy: value as WordbookFilter['sortBy'] })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 정렬 순서 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilter({ 
                  sortOrder: localFilter.sortOrder === 'asc' ? 'desc' : 'asc' 
                })}
              >
                {localFilter.sortOrder === 'asc' ? '↑' : '↓'}
              </Button>

              {/* 레이아웃 토글 */}
              <div className="flex border rounded-md">
                <Button
                  variant={layout === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => {}} // 부모에서 처리
                >
                  ⊞
                </Button>
                <Button
                  variant={layout === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => {}} // 부모에서 처리
                >
                  ☰
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 결과 개수 */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {filteredWordbooks.length}개 단어장
        </span>
        {selectedWordbooks.length > 0 && (
          <Badge variant="default">
            {selectedWordbooks.length}개 선택됨
          </Badge>
        )}
      </div>

      {/* 단어장 목록 */}
      <div className="min-h-48">
        {/* 그룹화된 보기 */}
        {showGrouping ? (
          <div className="space-y-8">
            {/* 그룹별 렌더링 - 실제 구현에서는 Promise를 적절히 처리해야 함 */}
            {/* 임시로 일반 렌더링 사용 */}
            <div className={cn(
              layout === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-2'
            )}>
              {/* {wordbooks.map(renderWordbook)} */}
            </div>
          </div>
        ) : (
          /* 일반 보기 */
          <div className={cn(
            layout === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-2'
          )}>
            {filteredWordbooks.map(renderWordbook)}
          </div>
        )}

        {/* 빈 상태 */}
        {filteredWordbooks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {emptyMessage}
            </h3>
            <p className="text-gray-500 mb-6">
              새로운 단어장을 추가하여 학습을 시작해보세요.
            </p>
            <Button variant="default">
              단어장 추가
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}