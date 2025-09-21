'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { LoadingMessage, LoadingMessages } from '@/components/ui/loading-message'
import { cn } from '@/lib/utils'
import { CollectionGrid } from './collection-grid'
import { Check, X, Search, BookOpen, User, Camera, Globe, Brain } from 'lucide-react'
import type { Collection } from '@/contexts/collection-context-v2'

interface CollectionSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (collection: Collection) => void
  onUnselect: (collectionId: string) => void
  selectedCollections?: Collection[]
  availableCollections: Collection[]
  title?: string
  allowMultiple?: boolean
  filterTypes?: Collection['type'][]
  className?: string
}

// 탭 정의
const TABS = [
  { id: 'official', name: '공식 단어장', Icon: BookOpen, description: '검증된 공식 단어장' },
  { id: 'personal', name: '내 단어장', Icon: User, description: '직접 만든 단어장' },
  { id: 'ai-generated', name: '발견한 단어', Icon: Brain, description: '학습 중 발견하고 추가한 새로운 단어들' },
  { id: 'photo', name: '사진 단어', Icon: Camera, description: '사진에서 추출한 단어장' },
  { id: 'public', name: '공개 단어장', Icon: Globe, description: '다른 사용자가 공개한 단어장' }
] as const

export function CollectionSelectionModal({
  isOpen,
  onClose,
  onSelect,
  onUnselect,
  selectedCollections = [],
  availableCollections,
  title = "단어장 선택",
  allowMultiple = true,
  filterTypes,
  className
}: CollectionSelectionModalProps) {
  const [activeTab, setActiveTab] = useState<Collection['type']>('official')
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState({ sortBy: 'name' })
  const [isProcessing, setIsProcessing] = useState(false)
  const [recentlyToggled, setRecentlyToggled] = useState<string | null>(null)

  // 사용 가능한 탭 필터링 (공식 단어장은 빈 탭도 표시)
  const availableTabs = useMemo(() => {
    const tabs = filterTypes ? TABS.filter(tab => filterTypes.includes(tab.id)) : TABS
    return tabs.filter(tab => {
      const collectionCount = availableCollections.filter(c => c.type === tab.id).length
      // 공식 단어장(official) 탭은 항상 표시 (Coming Soon 포함)
      // 다른 타입은 단어장이 있을 때만 표시
      return tab.id === 'official' || collectionCount > 0
    })
  }, [availableCollections, filterTypes])

  // 선택된 단어장 ID 세트
  const selectedIds = useMemo(() => 
    new Set(selectedCollections.map(c => c.id)), 
    [selectedCollections]
  )

  // 현재 탭의 단어장 필터링 및 정렬
  const filteredCollections = useMemo(() => {
    console.log(`[CollectionSelectionModal] 🔍 DEBUGGING - Available collections (${availableCollections.length}):`)
    availableCollections.forEach((c, index) => {
      console.log(`   ${index + 1}. ${c.name} (${c.type}, ${c.wordCount} words)`)
    })
    
    // 먼저 탭으로 필터링
    let filtered = availableCollections.filter(c => c.type === activeTab)
    
    // 검색어가 있으면 추가 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query) ||
        c.category?.toLowerCase().includes(query)
      )
    }
    
    // 정렬 적용
    if (activeTab === 'official') {
      // 공식 단어장의 경우 단어 수가 많은 순서로 정렬
      filtered = filtered.sort((a, b) => {
        const countA = a.wordCount || 0
        const countB = b.wordCount || 0
        return countB - countA // 내림차순 (많은 것부터)
      })
    } else {
      // 다른 탭은 이름순으로 정렬
      filtered = filtered.sort((a, b) => a.name.localeCompare(b.name))
    }
    
    console.log(`[CollectionSelectionModal] Tab ${activeTab}: ${filtered.length} collections`, filtered.map(c => `${c.name} (${c.wordCount} words)`))
    
    return filtered
  }, [availableCollections, activeTab, searchQuery])

  // 통계 계산
  const stats = useMemo(() => {
    const byType = availableCollections.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1
      return acc
    }, {} as Record<Collection['type'], number>)

    return {
      total: availableCollections.length,
      selected: selectedCollections.length,
      byType
    }
  }, [availableCollections, selectedCollections])

  // 단어장 선택/해제 핸들러 (with visual feedback and loading states)
  const handleToggleCollection = async (collectionId: string) => {
    const collection = availableCollections.find(c => c.id === collectionId)
    if (!collection || isProcessing) return

    setIsProcessing(true)
    setRecentlyToggled(collectionId)

    try {
      if (selectedIds.has(collectionId)) {
        console.log(`[CollectionSelectionModal] 🔄 Unselecting collection: ${collection.name}`)
        await onUnselect(collectionId)
        console.log(`[CollectionSelectionModal] ✅ Successfully unselected: ${collection.name}`)
      } else {
        console.log(`[CollectionSelectionModal] 🔄 Selecting collection: ${collection.name}`)
        if (!allowMultiple && selectedCollections.length > 0) {
          // 단일 선택 모드에서는 기존 선택 해제
          selectedCollections.forEach(c => onUnselect(c.id))
        }
        await onSelect(collection)
        console.log(`[CollectionSelectionModal] ✅ Successfully selected: ${collection.name}`)
      }
    } catch (error) {
      console.error(`[CollectionSelectionModal] ❌ Error toggling collection ${collection.name}:`, error)
      // Show user-friendly error message
      alert(`단어장 ${selectedIds.has(collectionId) ? '선택 해제' : '선택'}에 실패했습니다. 다시 시도해주세요.`)
    } finally {
      setIsProcessing(false)
      // Clear the visual feedback after animation
      setTimeout(() => setRecentlyToggled(null), 500)
    }
  }

  // 모든 현재 탭 단어장 선택
  const handleSelectAll = () => {
    if (!allowMultiple) return
    
    filteredCollections.forEach(collection => {
      if (!selectedIds.has(collection.id)) {
        onSelect(collection)
      }
    })
  }

  // 현재 탭 모든 선택 해제
  const handleUnselectAll = () => {
    filteredCollections.forEach(collection => {
      if (selectedIds.has(collection.id)) {
        onUnselect(collection.id)
      }
    })
  }

  // 탭이 없으면 첫 번째 사용 가능한 탭으로 설정
  React.useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(tab => tab.id === activeTab)) {
      setActiveTab(availableTabs[0].id)
    }
  }, [availableTabs, activeTab])

  if (!isOpen) return null

  const currentTab = availableTabs.find(tab => tab.id === activeTab)
  const currentTabCount = stats.byType[activeTab] || 0
  const selectedInCurrentTab = filteredCollections.filter(c => selectedIds.has(c.id)).length

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      className={cn("max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden", className)}
    >
      <div className="flex flex-col h-full">
        {/* 헤더 */}
        <div className="flex-shrink-0 border-b border-gray-200 p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4">
            <div className="mb-2 sm:mb-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                학습할 단어장을 선택하세요
              </p>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
              {stats.selected > 0 && (
                <Badge variant="default" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
                  {stats.selected}개 선택됨
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={onClose} className="text-xs sm:text-sm">
                닫기
              </Button>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex space-x-0.5 sm:space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
            {availableTabs.map((tab) => {
              const count = stats.byType[tab.id] || 0
              const Icon = tab.Icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
                    activeTab === tab.id
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.name.substring(0, 2)}</span>
                  {count > 0 && (
                    <Badge variant="outline" className="ml-0.5 sm:ml-1 text-xs px-1">
                      {count}
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>

          {/* 현재 탭 설명 */}
          {currentTab && (
            <p className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-3 text-center">
              {currentTab.description}
            </p>
          )}
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* 도구 모음 */}
            <div className="flex-shrink-0 p-3 sm:p-4 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                  {/* 검색 */}
                  <div className="relative flex-1 max-w-md">
                    <Input
                      placeholder={`${currentTab?.name || '단어장'} 검색...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 sm:pl-10 text-sm sm:text-base h-9 sm:h-10"
                    />
                    <div className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2">
                      <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                    </div>
                  </div>

                  {/* 통계 */}
                  <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                    {selectedInCurrentTab > 0 ? (
                      <span>{selectedInCurrentTab} / {currentTabCount}개 선택됨</span>
                    ) : (
                      <span>{currentTabCount}개 단어장</span>
                    )}
                  </div>
                </div>

                {/* 일괄 작업 버튼 */}
                {allowMultiple && currentTabCount > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={selectedInCurrentTab === currentTabCount}
                    >
                      모두 선택
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUnselectAll}
                      disabled={selectedInCurrentTab === 0}
                    >
                      선택 해제
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 단어장 그리드 */}
            <div className="flex-1 overflow-y-auto p-4 relative">
              {isProcessing && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                  <LoadingMessage
                    {...LoadingMessages.SELECTING_WORDBOOK}
                    size="sm"
                    className="bg-white rounded-lg shadow-lg p-4"
                  />
                </div>
              )}
              {/* Direct grid implementation instead of WordbookGrid component */}
              <div className="space-y-4">
                {/* Debug info */}
                <div className="text-xs text-gray-500 mb-2">
                  디버그: {filteredCollections.length}개 단어장 표시 중
                </div>
                
                {/* Responsive grid with proper scrolling */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                  {filteredCollections.map((collection, index) => {
                    const isSelected = selectedIds.has(collection.id)
                    const isRecentlyToggled = recentlyToggled === collection.id
                    
                    return (
                      <div
                        key={collection.id}
                        className={cn(
                          "relative p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md",
                          isSelected 
                            ? "border-blue-500 bg-blue-50 shadow-sm" 
                            : "border-gray-200 hover:border-gray-300 bg-white",
                          isRecentlyToggled && "scale-105"
                        )}
                        onClick={() => handleToggleCollection(collection.id)}
                      >
                        {/* Selection indicator */}
                        <div className="absolute top-2 right-2">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                            isSelected 
                              ? "border-blue-500 bg-blue-500" 
                              : "border-gray-300"
                          )}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* Collection info */}
                        <div className="pr-8">
                          <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                            {collection.name}
                          </h3>
                          
                          <div className="flex items-center gap-2 mb-2">
                            {collection.category && (
                              <div className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                                {collection.category}
                              </div>
                            )}
                            {/* 단어 수를 더 눈에 띄게 표시 */}
                            <div className={cn(
                              "inline-block px-2 py-0.5 text-xs rounded-full font-semibold",
                              activeTab === 'official' && collection.wordCount && collection.wordCount > 1000
                                ? "bg-blue-100 text-blue-700"
                                : activeTab === 'official' && collection.wordCount && collection.wordCount > 500
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            )}>
                              {collection.wordCount || 0}개 단어
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-500 space-y-1">
                            {collection.metadata?.difficulty && (
                              <div>난이도: {
                                collection.metadata.difficulty === 'beginner' ? '초급' : 
                                collection.metadata.difficulty === 'intermediate' ? '중급' : '고급'
                              }</div>
                            )}
                          </div>
                          
                          {collection.description && (
                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                              {collection.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Empty state */}
                {filteredCollections.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📚</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchQuery 
                        ? `"${searchQuery}"와 일치하는 단어장이 없습니다.`
                        : `${currentTab?.name || '단어장'}이 없습니다.`
                      }
                    </h3>
                    <p className="text-gray-500">
                      {!searchQuery && currentTab?.id === 'official' && '공식 단어장이 준비되고 있습니다.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {!allowMultiple && selectedCollections.length > 0 ? (
                <span>선택됨: {selectedCollections[0].name}</span>
              ) : allowMultiple && selectedCollections.length > 0 ? (
                <span>총 {selectedCollections.length}개 단어장 선택됨</span>
              ) : (
                <span>단어장을 선택하세요</span>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                취소
              </Button>
              <Button 
                onClick={onClose}
                disabled={!allowMultiple && selectedCollections.length === 0}
                className="flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                선택 완료
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// 간단한 컬렉션 선택 드롭다운
interface CollectionSelectProps {
  collections: Collection[]
  selectedCollection?: Collection
  onSelect: (collection: Collection) => void
  placeholder?: string
  className?: string
}

export function CollectionSelect({
  collections,
  selectedCollection,
  onSelect,
  placeholder = "단어장 선택",
  className
}: CollectionSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full justify-between"
      >
        <span className="truncate">
          {selectedCollection ? (
            <span className="flex items-center gap-2">
              <span>{selectedCollection.type === 'official' ? '📖' : selectedCollection.type === 'personal' ? '👤' : selectedCollection.type === 'photo' ? '📸' : '🌍'}</span>
              {selectedCollection.name}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      <CollectionSelectionModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelect={(collection) => {
          onSelect(collection)
          setIsOpen(false)
        }}
        onUnselect={() => {}}
        selectedCollections={selectedCollection ? [selectedCollection] : []}
        availableCollections={collections}
        allowMultiple={false}
        title="단어장 선택"
        className="max-w-4xl"
      />
    </div>
  )
}

// Legacy aliases for backward compatibility
export const WordbookSelectionModal = CollectionSelectionModal
export const WordbookSelect = CollectionSelect