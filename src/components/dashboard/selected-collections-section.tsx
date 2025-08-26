'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CollectionCard, CollectionListItem } from '@/components/collection/collection-card'
import { Plus, Target, Book, Search, Grid, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Collection } from '@/contexts/collection-context-v2'

interface SelectedCollectionsSectionProps {
  selectedCollections: Collection[]
  onUnselectCollection: (collectionId: string) => void
  onStartStudy: (mode: string, collectionId?: string) => void
  onOpenSelectionModal: () => void
  className?: string
}

type ViewMode = 'grid' | 'list'
type SortMode = 'name' | 'wordCount' | 'progress' | 'recent'

export function SelectedCollectionsSection({
  selectedCollections,
  onUnselectCollection,
  onStartStudy,
  onOpenSelectionModal,
  className
}: SelectedCollectionsSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [searchQuery, setSearchQuery] = useState('')

  // 필터링 및 정렬된 단어장
  const filteredAndSortedCollections = useMemo(() => {
    let filtered = selectedCollections

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query) ||
        c.category?.toLowerCase().includes(query) ||
        c.metadata?.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // 정렬
    const sorted = [...filtered].sort((a, b) => {
      switch (sortMode) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'wordCount':
          return (b.wordCount || 0) - (a.wordCount || 0)
        case 'progress':
          const aProgress = a.progress && a.wordCount ? (a.progress.studied / a.wordCount) * 100 : 0
          const bProgress = b.progress && b.wordCount ? (b.progress.studied / b.wordCount) * 100 : 0
          return bProgress - aProgress
        case 'recent':
          const aDate = a.progress?.lastStudiedAt || a.updatedAt
          const bDate = b.progress?.lastStudiedAt || b.updatedAt
          return new Date(bDate).getTime() - new Date(aDate).getTime()
        default:
          return 0
      }
    })

    return sorted
  }, [selectedCollections, searchQuery, sortMode])

  // 통계 계산
  const stats = useMemo(() => {
    const totalWords = selectedCollections.reduce((sum, c) => sum + (c.wordCount || 0), 0)
    const studiedWords = selectedCollections.reduce((sum, c) => sum + (c.progress?.studied || 0), 0)
    const masteredWords = selectedCollections.reduce((sum, c) => sum + (c.progress?.mastered || 0), 0)
    
    // 타입별 개수
    const byType = selectedCollections.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalWords,
      studiedWords,
      masteredWords,
      overallProgress: totalWords > 0 ? Math.round((studiedWords / totalWords) * 100) : 0,
      byType
    }
  }, [selectedCollections])

  // 모든 선택 해제
  const handleUnselectAll = () => {
    if (confirm('모든 단어장을 선택 해제하시겠습니까?')) {
      selectedCollections.forEach(c => onUnselectCollection(c.id))
    }
  }

  return (
    <Card className={cn("p-6 border-0 shadow-lg hover:shadow-xl transition-shadow", className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Target className="w-5 h-5" />
            선택된 단어장
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{selectedCollections.length}개 단어장</span>
            <span>•</span>
            <span>{stats.totalWords.toLocaleString()}개 단어</span>
            <span>•</span>
            <span>{stats.overallProgress}% 진도</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={handleUnselectAll}
            disabled={selectedCollections.length === 0}
          >
            모두 해제
          </Button>
          <Button 
            onClick={onOpenSelectionModal}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Plus className="w-4 h-4" />
            단어장 추가
          </Button>
        </div>
      </div>

      {selectedCollections.length === 0 ? (
        /* 빈 상태 */
        <div className="text-center py-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
          <Book className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            학습할 단어장을 선택해주세요
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            SAT, TOEFL, TOEIC 등 다양한 공식 단어장부터 개인 맞춤 단어장까지 
            자유롭게 조합하여 학습할 수 있습니다.
          </p>
          <Button 
            onClick={onOpenSelectionModal}
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            단어장 선택하기
          </Button>
        </div>
      ) : (
        /* 단어장 목록 */
        <div className="space-y-4">
          {/* 타입별 요약 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(stats.byType).map(([type, count]) => {
              const typeLabels = {
                official: '공식',
                personal: '개인',
                photo: '사진',
                public: '공개'
              } as const
              
              const typeColors = {
                official: 'bg-green-100 text-green-800',
                personal: 'bg-purple-100 text-purple-800',
                photo: 'bg-orange-100 text-orange-800',
                public: 'bg-blue-100 text-blue-800'
              } as const
              
              return (
                <Badge 
                  key={type} 
                  className={cn(typeColors[type as keyof typeof typeColors] || 'bg-gray-100 text-gray-800')}
                >
                  {typeLabels[type as keyof typeof typeLabels] || type}: {count}개
                </Badge>
              )
            })}
          </div>

          {/* 도구 모음 */}
          <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4 flex-1">
              {/* 검색 */}
              <div className="relative flex-1 max-w-md">
                <Input
                  placeholder="단어장 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* 정렬 */}
              <Select value={sortMode} onValueChange={(value: SortMode) => setSortMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">최근순</SelectItem>
                  <SelectItem value="name">이름순</SelectItem>
                  <SelectItem value="wordCount">단어수순</SelectItem>
                  <SelectItem value="progress">진도순</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 보기 모드 */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* 검색 결과 표시 */}
          {searchQuery && (
            <div className="text-sm text-gray-600 flex items-center justify-between">
              <span>
                "{searchQuery}"에 대한 {filteredAndSortedCollections.length}개 결과
              </span>
              {filteredAndSortedCollections.length !== selectedCollections.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                >
                  전체 보기
                </Button>
              )}
            </div>
          )}

          {/* 단어장 목록 */}
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
              : 'space-y-2'
          )}>
            {filteredAndSortedCollections.map(collection => {
              if (viewMode === 'list') {
                return (
                  <CollectionListItem
                    key={collection.id}
                    collection={collection}
                    isSelected={true}
                    onUnselect={() => onUnselectCollection(collection.id)}
                  />
                )
              }
              
              return (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  isSelected={true}
                  onUnselect={() => onUnselectCollection(collection.id)}
                  className="hover:shadow-md transition-shadow"
                />
              )
            })}
          </div>

          {/* 검색 결과 없음 */}
          {filteredAndSortedCollections.length === 0 && searchQuery && (
            <div className="text-center py-8">
              <Search className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">
                "{searchQuery}"와 일치하는 단어장이 없습니다.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-2"
              >
                검색 초기화
              </Button>
            </div>
          )}

          {/* 일괄 학습 시작 버튼 */}
          {selectedCollections.length > 1 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  모든 선택된 단어장으로 학습하기
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStartStudy('flashcards')}
                  >
                    플래시카드로 시작
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onStartStudy('list')}
                  >
                    단어목록으로 시작
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}