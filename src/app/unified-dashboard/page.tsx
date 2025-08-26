'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingMessage, LoadingMessages } from '@/components/ui/loading-message'
import { EnhancedProgressBar, CircularProgressBar } from '@/components/ui/progress-bar-enhanced'
import { SelectedCollectionsSection } from '@/components/dashboard/selected-collections-section'
import { StudyStatsSection } from '@/components/dashboard/study-stats-section'
import { QuickStudySection } from '@/components/dashboard/quick-study-section'
import { CollectionSelectionModal } from '@/components/collection/collection-selection-modal'
import { useAuth } from '@/hooks/use-auth'
import { useCollectionV2 } from '@/contexts/collection-context-v2'
import { cn } from '@/lib/utils'
import type { Collection } from '@/contexts/collection-context-v2'
export default function UnifiedDashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const {
    collections: availableCollections,
    selectedCollections,
    collectionLoading: vocabularyLoading,
    collectionError: vocabularyError,
    selectCollection,
    unselectCollection,
    toggleCollection
  } = useCollectionV2()
  
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  const loading = authLoading || vocabularyLoading

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000) // 1분마다 업데이트
    return () => clearInterval(timer)
  }, [])
  
  // 로그인하지 않은 경우 리다이렉트
  useEffect(() => {
    if (!user && !loading && !authLoading) {
      router.push('/auth')
    }
  }, [user, loading, authLoading, router])

  // 통계 계산 (모든 hooks는 조건부 반환 전에 호출되어야 함)
  const stats = useMemo(() => {
    const totalWords = selectedCollections.reduce((sum, wb) => sum + (wb.wordCount || 0), 0)
    const studiedWords = selectedCollections.reduce((sum, wb) => sum + (wb.progress?.studied || 0), 0)
    const masteredWords = selectedCollections.reduce((sum, wb) => sum + (wb.progress?.mastered || 0), 0)
    const overallProgress = totalWords > 0 ? Math.round((studiedWords / totalWords) * 100) : 0
    const masteryRate = studiedWords > 0 ? Math.round((masteredWords / studiedWords) * 100) : 0
    
    // 평균 정확도 계산
    const avgAccuracy = selectedCollections
      .filter(wb => wb.progress?.accuracyRate)
      .reduce((sum, wb, _, arr) => sum + (wb.progress?.accuracyRate || 0) / arr.length, 0)

    // 남은 학습 시간 예상
    const estimatedTotalTime = selectedCollections.reduce((sum, wb) => sum + (wb.metadata.estimatedTime || 0), 0)
    const remainingTime = Math.max(0, estimatedTotalTime - Math.floor(estimatedTotalTime * (overallProgress / 100)))
    
    return {
      totalWords,
      studiedWords,
      masteredWords,
      overallProgress,
      masteryRate,
      avgAccuracy: Math.round(avgAccuracy),
      remainingTime,
      selectedCount: selectedCollections.length
    }
  }, [selectedCollections])

  // 단어장 선택/해제 핸들러
  const handleSelectCollection = async (collection: Collection) => {
    try {
      await selectCollection(collection.id)
    } catch (error) {
      console.error('Failed to select wordbook:', error)
      alert('단어장 선택에 실패했습니다.')
    }
  }

  const handleUnselectCollection = async (collectionId: string) => {
    try {
      await unselectCollection(collectionId)
    } catch (error) {
      console.error('Failed to unselect wordbook:', error)
      alert('단어장 선택 해제에 실패했습니다.')
    }
  }

  // 학습 시작 핸들러
  const handleStartStudy = (mode: string) => {
    if (selectedCollections.length === 0) {
      alert('학습할 단어장을 먼저 선택해주세요.')
      return
    }

    switch (mode) {
      case 'flashcards':
        router.push('/study/flashcards')
        break
      case 'list':
        router.push('/study/list')
        break
      case 'quiz':
        router.push('/study/quiz')
        break
      case 'typing':
        router.push('/study/typing')
        break
      default:
        router.push('/study/list')
    }
  }

  // 인사말 계산
  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return '좋은 아침입니다'
    if (hour < 18) return '좋은 오후입니다'
    return '좋은 저녁입니다'
  }

  // 로딩 중이면 의미 있는 로딩 메시지 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingMessage 
              {...LoadingMessages.LOADING_WORDBOOKS}
              size="lg"
              className="bg-white rounded-lg shadow-lg p-8 max-w-md"
            />
          </div>
        </div>
      </div>
    )
  }

  // 단어장을 선택하지 않았을 때의 빈 화면 개선
  if (selectedCollections.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {getGreeting()}, {user?.email?.split('@')[0]}님! 👋
                </h1>
                <p className="text-lg text-gray-600">
                  효율적인 학습을 시작해보세요
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="px-3 py-1">
                  {currentTime.toLocaleDateString('ko-KR', { 
                    month: 'short', 
                    day: 'numeric',
                    weekday: 'short'
                  })}
                </Badge>
              </div>
            </div>
          </div>

          {/* 단어장 선택 안내 */}
          <div className="flex items-center justify-center min-h-[50vh]">
            <Card className="p-12 text-center bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 max-w-2xl">
              <LoadingMessage
                message="학습할 단어장을 선택해주세요"
                submessage="다양한 단어장 중에서 학습하고 싶은 것을 선택하여 맞춤형 학습을 시작하세요."
                icon="wordbook"
                size="lg"
                className="pb-0"
              />
              <Button 
                onClick={() => setIsSelectionModalOpen(true)}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8 py-3 text-lg mt-6"
                size="lg"
              >
                단어장 선택하기
              </Button>
              
              {/* 또는 단어장 관리로 이동 */}
              <div className="mt-4">
                <Button 
                  variant="outline"
                  onClick={() => router.push('/wordbooks')}
                  className="text-gray-600"
                >
                  단어장 관리로 이동
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* 단어장 선택 모달 */}
        <CollectionSelectionModal
          isOpen={isSelectionModalOpen}
          onClose={() => setIsSelectionModalOpen(false)}
          onSelect={handleSelectCollection}
          onUnselect={handleUnselectCollection}
          selectedCollections={selectedCollections}
          availableCollections={availableCollections}
          title="학습할 단어장 선택"
          allowMultiple={true}
          className="max-w-6xl"
        />
      </div>
    )
  }

  // 기존 로딩 스켈레톤 제거하고 대체
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded-xl"></div>
                <div className="h-48 bg-gray-200 rounded-xl"></div>
              </div>
              <div className="space-y-6">
                <div className="h-32 bg-gray-200 rounded-xl"></div>
                <div className="h-48 bg-gray-200 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 로그인하지 않은 경우
  if (!user && !loading && !authLoading) {
    return null
  }

  // 에러 표시
  if (vocabularyError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h2>
            <p className="text-gray-600 mb-4">{vocabularyError}</p>
            <Button onClick={() => window.location.reload()}>
              다시 시도
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <span>📚</span>
                단어장 학습 허브
              </h1>
              <p className="text-lg text-gray-600">
                {getGreeting()}, {user.email?.split('@')[0]}님! 
                <span className="ml-2">오늘도 효율적인 학습을 시작해보세요</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1">
                {currentTime.toLocaleDateString('ko-KR', { 
                  month: 'short', 
                  day: 'numeric',
                  weekday: 'short'
                })}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => router.push('/help')}>
                도움말
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 메인 콘텐츠 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 선택된 단어장 섹션 */}
            <SelectedCollectionsSection
              selectedCollections={selectedCollections}
              onUnselectCollection={handleUnselectCollection}
              onStartStudy={handleStartStudy}
              onOpenSelectionModal={() => setIsSelectionModalOpen(true)}
            />

            {/* 빠른 학습 시작 섹션 */}
            <QuickStudySection
              selectedCollections={selectedCollections}
              onStartStudy={handleStartStudy}
            />
          </div>

          {/* 사이드바 - 학습 통계 */}
          <div className="space-y-6">
            <StudyStatsSection
              selectedCollections={selectedCollections}
              onStartStudy={handleStartStudy}
            />
          </div>
        </div>

        {/* 플로팅 액션 버튼 */}
        {selectedCollections.length > 0 && (
          <div className="fixed bottom-8 right-8 z-50">
            <Button
              size="lg"
              onClick={() => handleStartStudy('flashcards')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all rounded-full w-14 h-14 p-0"
            >
              <span className="text-2xl">⚡</span>
            </Button>
          </div>
        )}
      </div>

      {/* 단어장 선택 모달 */}
      <CollectionSelectionModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        onSelect={handleSelectCollection}
        onUnselect={handleUnselectCollection}
        selectedCollections={selectedCollections}
        availableCollections={availableCollections}
        title="학습할 단어장 관리"
        allowMultiple={true}
        className="max-w-6xl"
      />
    </div>
  )
}