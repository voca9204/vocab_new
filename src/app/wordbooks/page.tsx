'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useUnifiedVocabulary } from '@/contexts/collection-context-v2'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingMessage, LoadingMessages } from '@/components/ui/loading-message'
import { cn } from '@/lib/utils'
import { 
  Search, 
  BookOpen, 
  User, 
  Camera, 
  Globe, 
  Star, 
  TrendingUp, 
  Lock,
  Unlock,
  Plus,
  Filter,
  ArrowRight,
  GraduationCap,
  Brain
} from 'lucide-react'
import type { UnifiedWordbook, WordbookType } from '@/types/unified-wordbook'

// 탭 정의 (사용자 요청에 따라 순서 변경: 개인→공식→공개)
const TABS = [
  { 
    id: 'personal' as WordbookType, 
    name: '개인단어장', 
    Icon: User, 
    description: '직접 만든 개인 단어장',
    color: 'bg-blue-500'
  },
  { 
    id: 'official' as WordbookType, 
    name: '공식단어장', 
    Icon: BookOpen, 
    description: '검증된 공식 시험 단어장',
    color: 'bg-green-500'
  },
  { 
    id: 'ai-generated' as WordbookType, 
    name: '발견한단어', 
    Icon: Brain, 
    description: 'AI가 생성하고 발견한 단어들',
    color: 'bg-purple-500'
  },
  { 
    id: 'photo' as WordbookType, 
    name: '사진단어장', 
    Icon: Camera, 
    description: '사진에서 추출한 단어장',
    color: 'bg-orange-500'
  },
  { 
    id: 'public' as WordbookType, 
    name: '공개된개인단어장', 
    Icon: Globe, 
    description: '다른 사용자가 공개한 단어장',
    color: 'bg-indigo-500'
  }
] as const

export default function WordbooksPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { 
    wordbooks = [], 
    selectedWordbooks = [], 
    selectWordbook, 
    unselectWordbook, 
    loadWordbooks,
    loading 
  } = useUnifiedVocabulary()
  
  const [activeTab, setActiveTab] = useState<WordbookType>('personal')
  const [searchQuery, setSearchQuery] = useState('')
  const [cacheCleared, setCacheCleared] = useState(false)
  
  // 로그인 확인
  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
  }, [user, router])
  
  // Safe wordbooks array (already defaulted above)
  const safeWordbooks = wordbooks
  const safeSelectedWordbooks = selectedWordbooks
  
  // Clear cache on mount for fresh data
  useEffect(() => {
    if (!cacheCleared && typeof window !== 'undefined') {
      // Clear localStorage cache for fresh data
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('vocab_cache_')) {
          localStorage.removeItem(key)
        }
      })
      setCacheCleared(true)
      console.log('[WordbooksPage] Cache cleared for fresh data')
    }
  }, [cacheCleared])
  
  // Debug logging
  useEffect(() => {
    console.log('[WordbooksPage] Current state:', {
      loading,
      wordbooksCount: safeWordbooks.length,
      selectedCount: safeSelectedWordbooks.length,
      wordbooks: safeWordbooks
    })
  }, [loading, safeWordbooks.length, safeSelectedWordbooks.length])

  // 사용 가능한 탭 필터링
  const availableTabs = TABS.filter(tab => {
    if (tab.id === 'personal' || tab.id === 'official') return true // 항상 표시
    const count = safeWordbooks.filter(wb => wb.type === tab.id).length
    return count > 0
  })

  // 현재 탭의 단어장 필터링
  const filteredWordbooks = safeWordbooks
    .filter(wb => wb.type === activeTab)
    .filter(wb => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        wb.name.toLowerCase().includes(query) ||
        wb.category?.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      // 선택된 단어장 우선
      const aSelected = safeSelectedWordbooks.some(sw => sw.id === a.id)
      const bSelected = safeSelectedWordbooks.some(sw => sw.id === b.id)
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1
      
      // 이름순 정렬
      return a.name.localeCompare(b.name)
    })

  // 통계 계산
  const stats = {
    total: safeWordbooks.length,
    selected: safeSelectedWordbooks.length,
    byType: TABS.reduce((acc, tab) => ({
      ...acc,
      [tab.id]: safeWordbooks.filter(wb => wb.type === tab.id).length
    }), {} as Record<WordbookType, number>)
  }

  // 단어장 토글
  const handleToggleWordbook = async (wordbook: UnifiedWordbook) => {
    const isSelected = safeSelectedWordbooks.some(sw => sw.id === wordbook.id)
    
    try {
      console.log(`[Wordbooks] 🔄 ${isSelected ? 'Unselecting' : 'Selecting'} wordbook: ${wordbook.name}`)
      
      if (isSelected) {
        await unselectWordbook(wordbook.id)
        console.log(`[Wordbooks] ✅ Successfully unselected: ${wordbook.name}`)
      } else {
        await selectWordbook(wordbook.id)
        console.log(`[Wordbooks] ✅ Successfully selected: ${wordbook.name}`)
      }
    } catch (error) {
      console.error(`[Wordbooks] ❌ Failed to toggle wordbook ${wordbook.name}:`, error)
      alert(`단어장 ${isSelected ? '선택 해제' : '선택'}에 실패했습니다. 다시 시도해주세요.`)
    }
  }

  // 단어장으로 바로 학습 시작
  const handleStartStudy = async (wordbook: UnifiedWordbook) => {
    try {
      // 먼저 선택
      await selectWordbook(wordbook.id)
      // 통합 대시보드로 이동
      router.push('/unified-dashboard')
    } catch (error) {
      console.error('Failed to start study:', error)
      alert('학습 시작에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingMessage
          {...LoadingMessages.LOADING_WORDBOOKS}
          size="lg"
          className="bg-white rounded-lg shadow-lg p-8 max-w-md"
        />
      </div>
    )
  }

  if (!user) return null

  const currentTab = availableTabs.find(tab => tab.id === activeTab)
  const currentTabCount = stats.byType[activeTab] || 0
  const selectedInCurrentTab = filteredWordbooks.filter(wb => 
    safeSelectedWordbooks.some(sw => sw.id === wb.id)
  ).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">단어장 관리</h1>
              <p className="mt-2 text-gray-600">
                학습할 단어장을 선택하고 관리하세요
              </p>
            </div>
            
            {/* 현재 선택 상태 표시 */}
            {stats.selected > 0 && (
              <div className="text-right">
                <Badge className="px-3 py-1 text-sm">
                  {stats.selected}개 선택됨
                </Badge>
                <p className="text-xs text-gray-500 mt-1">
                  선택된 단어장으로 학습 가능
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex overflow-x-auto">
            {availableTabs.map((tab) => {
              const count = stats.byType[tab.id] || 0
              const Icon = tab.Icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-4 text-sm font-medium transition-all relative whitespace-nowrap",
                    "border-b-2 flex-shrink-0",
                    isActive
                      ? "border-blue-500 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-gray-400")} />
                  <span>{tab.name}</span>
                  {count > 0 && (
                    <Badge variant={isActive ? "default" : "outline"} className="ml-1">
                      {count}
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>
          
          {/* 현재 탭 설명 */}
          {currentTab && (
            <div className="px-6 py-3 bg-gray-50 border-t">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", currentTab.color)} />
                {currentTab.description}
                {currentTabCount > 0 && (
                  <span className="text-gray-500">• {currentTabCount}개 단어장</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Input
                placeholder={`${currentTab?.name} 검색...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="text-sm text-gray-500">
              {filteredWordbooks.length > 0 ? (
                <>
                  {selectedInCurrentTab > 0 && (
                    <span className="text-blue-600 font-medium">
                      {selectedInCurrentTab} 선택 / 
                    </span>
                  )}
                  <span> {filteredWordbooks.length}개 단어장</span>
                </>
              ) : (
                <span>단어장이 없습니다</span>
              )}
            </div>

            {/* 새 단어장 만들기 버튼 (개인단어장 탭에서만) */}
            {activeTab === 'personal' && (
              <Button
                onClick={() => router.push('/my-collections')}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                새 단어장 만들기
              </Button>
            )}
          </div>
        </div>

        {/* 단어장 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWordbooks.map((wordbook) => {
            const isSelected = safeSelectedWordbooks.some(sw => sw.id === wordbook.id)
            
            return (
              <WordbookCard
                key={wordbook.id}
                wordbook={wordbook}
                isSelected={isSelected}
                onToggleSelect={() => handleToggleWordbook(wordbook)}
                onStartStudy={() => handleStartStudy(wordbook)}
              />
            )
          })}
        </div>

        {/* 빈 상태 */}
        {filteredWordbooks.length === 0 && (
          <Card className="p-12 text-center">
            <currentTab.Icon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? '검색 결과가 없습니다' : `${currentTab?.name}이 없습니다`}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery 
                ? `"${searchQuery}"와 일치하는 단어장이 없습니다.`
                : activeTab === 'personal'
                ? '새로운 개인 단어장을 만들어보세요.'
                : activeTab === 'official'
                ? '공식 단어장이 준비되고 있습니다.'
                : '아직 단어장이 없습니다.'
              }
            </p>
            
            {activeTab === 'personal' && !searchQuery && (
              <Button onClick={() => router.push('/my-collections')}>
                <Plus className="w-4 h-4 mr-2" />
                첫 단어장 만들기
              </Button>
            )}
          </Card>
        )}

        {/* 학습 시작 플로팅 버튼 */}
        {stats.selected > 0 && (
          <div className="fixed bottom-8 right-8 z-50">
            <Button
              size="lg"
              onClick={() => router.push('/unified-dashboard')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all"
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              학습 시작하기 ({stats.selected})
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// 단어장 카드 컴포넌트
interface WordbookCardProps {
  wordbook: UnifiedWordbook
  isSelected: boolean
  onToggleSelect: () => void
  onStartStudy: () => void
}

function WordbookCard({ wordbook, isSelected, onToggleSelect, onStartStudy }: WordbookCardProps) {
  // 카테고리별 색상
  const categoryColors: Record<string, string> = {
    'SAT': 'bg-blue-100 text-blue-800 border-blue-200',
    'TOEFL': 'bg-green-100 text-green-800 border-green-200',
    'TOEIC': 'bg-purple-100 text-purple-800 border-purple-200',
    '수능': 'bg-red-100 text-red-800 border-red-200',
    'GRE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'IELTS': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    '기본': 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getTypeIcon = (type: WordbookType) => {
    switch (type) {
      case 'official': return <BookOpen className="w-4 h-4" />
      case 'personal': return <User className="w-4 h-4" />
      case 'photo': return <Camera className="w-4 h-4" />
      case 'ai-generated': return <Brain className="w-4 h-4" />
      case 'public': return <Globe className="w-4 h-4" />
      default: return <BookOpen className="w-4 h-4" />
    }
  }

  return (
    <Card className={cn(
      "p-6 transition-all duration-200 cursor-pointer border-2",
      isSelected 
        ? "border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200" 
        : "border-gray-200 hover:border-gray-300 hover:shadow-md"
    )}>
      {/* 카드 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getTypeIcon(wordbook.type)}
            {wordbook.category && (
              <Badge className={cn(
                "text-xs", 
                categoryColors[wordbook.category] || 'bg-gray-100 text-gray-800'
              )}>
                {wordbook.category}
              </Badge>
            )}
            {wordbook.type === 'personal' && (
              <Badge variant="outline" className="text-xs">
                {wordbook.isPrivate ? (
                  <>
                    <Lock className="w-3 h-3 mr-1" />
                    비공개
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3 mr-1" />
                    공개
                  </>
                )}
              </Badge>
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
            {wordbook.name}
          </h3>
          
          {wordbook.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {wordbook.description}
            </p>
          )}
        </div>
        
        {/* 선택 표시 */}
        <div className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
          isSelected 
            ? "border-blue-500 bg-blue-500 text-white" 
            : "border-gray-300"
        )}>
          {isSelected && <div className="w-3 h-3 bg-white rounded-full" />}
        </div>
      </div>

      {/* 통계 정보 */}
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex justify-between">
          <span>단어 수</span>
          <span className="font-medium">{wordbook.wordCount}개</span>
        </div>
        
        {wordbook.type === 'official' && wordbook.difficulty && (
          <div className="flex justify-between">
            <span>난이도</span>
            <span className="font-medium">
              {wordbook.difficulty === 'beginner' ? '초급' : 
               wordbook.difficulty === 'intermediate' ? '중급' : '고급'}
            </span>
          </div>
        )}

        {wordbook.createdAt && (
          <div className="flex justify-between">
            <span>생성일</span>
            <span className="font-medium">
              {new Date(wordbook.createdAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <Button
          variant={isSelected ? "default" : "outline"}
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
          className="flex-1"
        >
          {isSelected ? '선택됨' : '선택'}
        </Button>
        
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onStartStudy()
          }}
          className="flex items-center gap-1"
        >
          <ArrowRight className="w-3 h-3" />
          학습
        </Button>
      </div>
    </Card>
  )
}