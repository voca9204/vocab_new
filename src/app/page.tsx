'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useCollectionV2 } from '@/contexts/collection-context-v2'
import { Button } from '@/components/ui'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight,
  BookOpen,
  Clock,
  Target,
  Trophy,
  Zap,
  CheckCircle,
  Star,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { CollectionCardSkeleton, DifficultyCardSkeleton } from '@/components/ui/collection-card-skeleton'
import {
  OfficialCategory,
  DifficultyLevel,
  categoryColors,
  categoryIcons,
  getCollectionPath
} from '@/types/collections-simplified'
import type { Collection } from '@/contexts/collection-context-v2'
import { RecentLearningWidget } from '@/components/home/recent-learning-widget'
import { StudyMethodModal } from '@/components/vocabulary/study-method-modal'
import {
  QuickStartCard,
  StudyStatsCard,
  CategoryCard,
  QuickActionButton,
  RecommendedCollection
} from '@/components/home/mobile-home-redesign'

// 카테고리별 설명
const categoryDescriptions: Record<OfficialCategory, string> = {
  'SAT': '미국 대학 입학시험 필수 어휘',
  'TOEFL': '해외 유학 준비 필수 어휘',
  'TOEIC': '비즈니스 영어 및 취업 준비',
  '수능': '한국 대학 입시 영어 어휘',
  'GRE': '대학원 진학 고급 어휘',
  'IELTS': '영국/호주 유학 필수 어휘',
  '기본': '일상 회화 기초 어휘',
  '학원': '학원별 맞춤형 단어장'
}

// 난이도별 정보
const difficultyInfo: Record<DifficultyLevel, { label: string; icon: string }> = {
  'beginner': { label: '초급', icon: '🌱' },
  'intermediate': { label: '중급', icon: '🌿' },
  'advanced': { label: '고급', icon: '🌳' }
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const {
    collections,
    collectionLoading,
    loadCollections,
    selectSingleCollection
  } = useCollectionV2()

  // 디버깅: 전체 collections 출력
  console.log('[HomePage] All collections:', collections.map(c => ({
    name: c.name,
    type: c.type,
    category: c.category,
    difficulty: c.difficulty
  })))

  const [selectedCategory, setSelectedCategory] = useState<OfficialCategory | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [studyModalOpen, setStudyModalOpen] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)

  // 컬렉션 로드
  useEffect(() => {
    if (!collectionLoading && collections.length === 0) {
      loadCollections()
    }
  }, [collectionLoading, collections.length, loadCollections])

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  // 카테고리별로 컬렉션 그룹화
  const groupedCollections = useMemo(() => {
    const groups: Record<OfficialCategory, {
      [key in DifficultyLevel]?: Collection
    }> = {
      'SAT': {},
      'TOEFL': {},
      'TOEIC': {},
      '수능': {},
      'GRE': {},
      'IELTS': {},
      '기본': {},
      '학원': {}
    }

    // 공식 컬렉션만 필터링
    const officialCollections = collections.filter(c => c.type === 'official')

    // 디버깅: 수능과 GRE, 학원 컬렉션 출력
    const suneungCollections = officialCollections.filter(c => c.category === '수능')
    const greCollections = officialCollections.filter(c => c.category === 'GRE')
    const academyCollections = officialCollections.filter(c => c.category === '학원')

    console.log('[HomePage] 수능 컬렉션:', suneungCollections.map(c => ({
      name: c.name,
      category: c.category,
      difficulty: c.difficulty,
      metadata: c.metadata,
      wordCount: c.wordCount
    })))

    console.log('[HomePage] GRE 컬렉션:', greCollections.map(c => ({
      name: c.name,
      category: c.category,
      difficulty: c.difficulty,
      metadata: c.metadata,
      wordCount: c.wordCount
    })))

    console.log('[HomePage] 학원 컬렉션:', academyCollections.map(c => ({
      name: c.name,
      category: c.category,
      difficulty: c.difficulty,
      metadata: c.metadata,
      wordCount: c.wordCount
    })))

    officialCollections.forEach(collection => {
      const category = (collection.category || collection.metadata?.category || '기본') as OfficialCategory
      const difficulty = (collection.difficulty || collection.metadata?.difficulty || 'intermediate') as DifficultyLevel

      if (groups[category]) {
        groups[category][difficulty] = collection
      }
    })

    // 디버깅: 그룹화된 결과 출력
    console.log('[HomePage] 수능 그룹:', groups['수능'])
    console.log('[HomePage] GRE 그룹:', groups['GRE'])
    console.log('[HomePage] 학원 그룹:', groups['학원'])

    return groups
  }, [collections])

  // 카테고리에 최소 하나의 컬렉션이 있는지 확인
  const getCategoryHasContent = (category: OfficialCategory) => {
    const categoryData = groupedCollections[category]
    if (!categoryData) return false
    return Object.values(categoryData).some(col => col && col.wordCount > 0)
  }

  // 카테고리의 총 단어 수 계산
  const getCategoryTotalWords = (category: OfficialCategory) => {
    const categoryData = groupedCollections[category]
    if (!categoryData) return 0
    return Object.values(categoryData).reduce((sum, col) => sum + (col?.wordCount || 0), 0)
  }

  // 학습 기록 저장 함수 (학습 방법 포함)
  const saveToHistory = (collection: Collection, studyMethod: string = 'flashcards') => {
    try {
      // 브라우저 환경이 아닌 경우 바로 리턴
      if (typeof window === 'undefined') return

      const savedHistory = localStorage.getItem('learning_history')
      const history = savedHistory ? JSON.parse(savedHistory) : []

      const newEntry = {
        collectionId: collection.id,
        collectionName: collection.name || collection.displayName || 'Unknown',
        category: collection.category || collection.metadata?.category || '기본',
        difficulty: collection.metadata?.difficulty || 'intermediate',
        lastStudyMethod: studyMethod, // 학습 방법 추가
        lastStudiedAt: new Date().toISOString(),
        progress: collection.progress?.studied || 0,
        wordsStudied: collection.progress?.studied || 0,
        totalWords: collection.wordCount || 0,
        sessionCount: 1
      }

      console.log('📝 Creating history entry with studyMethod:', studyMethod)

      // 기존 항목이 있으면 업데이트
      const existingIndex = history.findIndex((h: any) => h.collectionId === collection.id)
      if (existingIndex >= 0) {
        console.log('📝 Updating existing entry, previous method:', history[existingIndex].lastStudyMethod, '→ new method:', studyMethod)
        history[existingIndex] = {
          ...newEntry,
          sessionCount: history[existingIndex].sessionCount + 1,
          lastStudyMethod: studyMethod // 명시적으로 업데이트
        }
      } else {
        console.log('📝 Creating new history entry')
        history.unshift(newEntry)
      }

      // 최대 5개 저장
      const updatedHistory = history.slice(0, 5)
      localStorage.setItem('learning_history', JSON.stringify(updatedHistory))

      // Custom event를 발생시켜 RecentLearningWidget가 즉시 업데이트되도록 함
      window.dispatchEvent(new Event('learningHistoryUpdated'))

      console.log('✅ History saved with method:', studyMethod, updatedHistory[0])
    } catch (error) {
      console.error('Failed to save history:', error)
    }
  }

  // 학습 시작 - 단어장 선택 시 모달 열기
  const handleCollectionClick = (collection: Collection) => {
    if (!collection || collection.wordCount === 0) {
      return
    }
    setSelectedCollection(collection)
    setStudyModalOpen(true)
  }

  // 실제 학습 시작 (모달에서 학습 방법 선택 후 또는 RecentLearningWidget에서 직접 호출)
  const handleStartLearning = async (
    collectionOrMethod: Collection | 'list' | 'flashcards' | 'quiz' | 'typing',
    studyMethod?: 'list' | 'flashcards' | 'quiz' | 'typing'
  ) => {
    console.log('🎯 handleStartLearning called with:', {
      collectionOrMethod: typeof collectionOrMethod === 'object' ? collectionOrMethod.name : collectionOrMethod,
      studyMethod,
      typeOfFirst: typeof collectionOrMethod
    })

    // 파라미터 정리: Collection 객체가 오면 첫 번째 파라미터가 collection
    let collection: Collection | null
    let method: 'list' | 'flashcards' | 'quiz' | 'typing'

    if (typeof collectionOrMethod === 'object') {
      // RecentLearningWidget에서 호출한 경우
      collection = collectionOrMethod
      method = studyMethod || 'flashcards'
      console.log('📚 RecentLearningWidget에서 호출, method:', method)
    } else {
      // 모달에서 호출한 경우
      collection = selectedCollection
      method = collectionOrMethod
      console.log('🔲 모달에서 호출, method:', method)
    }

    if (!collection || collection.wordCount === 0) {
      return
    }

    setIsLoading(true)
    try {
      // 학습 기록 저장 (학습 방법 포함)
      console.log('💾 Saving to history with method:', method)
      saveToHistory(collection, method)

      // 단일 컬렉션 선택 (이전 선택 모두 지우고 새로 선택)
      await selectSingleCollection(collection.id)

      // 학습 페이지로 이동 (선택한 학습 방법으로)
      const path = `/study/${method}?collectionId=${collection.id}`
      console.log('🚀 Navigating to:', path)
      if (user) {
        router.push(path)
      } else {
        // 로그인 안 한 경우 로그인 페이지로 (다음 경로 저장)
        router.push(`/login?next=${encodeURIComponent(path)}`)
      }
    } catch (error) {
      console.error('Failed to start learning:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Define constants
  const categories: OfficialCategory[] = ['SAT', 'TOEFL', 'TOEIC', '수능', 'GRE', 'IELTS', '기본', '학원']
  const difficulties: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced']

  // 모바일 여부 체크
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 추천 컬렉션 선택 (가장 최근 학습한 컬렉션)
  const [recommendedCollection, setRecommendedCollection] = useState<Collection | null>(null)

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('learning_history')
      if (!savedHistory) return

      const history = JSON.parse(savedHistory)
      if (!history || history.length === 0) return

      const latestCollectionId = history[0]?.collectionId
      if (!latestCollectionId) return

      const collection = collections.find(c => c.id === latestCollectionId)
      if (collection) {
        setRecommendedCollection(collection)
      }
    } catch {
      // 에러 무시
    }
  }, [collections])

  // 통계 데이터 계산
  const [studyStats, setStudyStats] = useState({
    totalWords: 0,
    streak: 0,
    todayWords: 0
  })

  useEffect(() => {
    // 실제 데이터는 Firebase에서 가져와야 함
    // 클라이언트 사이드에서만 랜덤 데이터 설정
    setStudyStats({
      totalWords: Math.floor(Math.random() * 500) + 100,
      streak: Math.floor(Math.random() * 7) + 1,
      todayWords: Math.floor(Math.random() * 50) + 10
    })
  }, [])

  const loading = authLoading || collectionLoading

  // 로딩 중일 때
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 로그인하지 않은 경우 로딩 표시 (리다이렉트 중)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    )
  }

  // 모바일 홈 화면
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* 심플한 모바일 헤더 */}
        <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-10">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <h1 className="text-lg font-bold text-gray-900">Vocabulary Master</h1>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push('/settings')}
                className="p-2"
              >
                ⚙️
              </Button>
            </div>
          </div>
        </header>

        {/* 모바일 메인 컨텐츠 */}
        <main className="px-4 py-6 pb-20">
          {/* Quick Start Card - 이어서 학습하기 */}
          {recommendedCollection && (
            <QuickStartCard
              collection={recommendedCollection}
              onStart={() => handleStartLearning(recommendedCollection, 'flashcards')}
              loading={isLoading}
            />
          )}

          {/* 학습 통계 */}
          <StudyStatsCard
            totalWords={studyStats.totalWords}
            streak={studyStats.streak}
            todayWords={studyStats.todayWords}
          />

          {/* 빠른 액션 버튼들 */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <QuickActionButton
              icon={<Zap className="h-6 w-6" />}
              label="빠른 복습"
              sublabel="5분 학습"
              onClick={() => {
                const satCollection = collections.find(c =>
                  c.category === 'SAT' && c.difficulty === 'intermediate'
                )
                if (satCollection) handleCollectionClick(satCollection)
              }}
              variant="primary"
            />
            <QuickActionButton
              icon={<Target className="h-6 w-6" />}
              label="시험 대비"
              sublabel="모의고사"
              onClick={() => router.push('/study/quiz')}
            />
          </div>

          {/* 카테고리 섹션 */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">학습 카테고리</h2>
            <div className="space-y-3">
              {categories.slice(0, 4).map((category) => {
                const hasContent = getCategoryHasContent(category)
                const totalWords = getCategoryTotalWords(category)
                const collection = Object.values(groupedCollections[category] || {})[0]

                if (!hasContent) return null

                return (
                  <CategoryCard
                    key={category}
                    category={category}
                    description={categoryDescriptions[category]}
                    icon={categoryIcons[category]}
                    wordCount={totalWords}
                    difficulty={collection?.difficulty}
                    color={categoryColors[category]}
                    onClick={() => collection && handleCollectionClick(collection)}
                    isPopular={category === 'SAT' || category === 'TOEFL'}
                  />
                )
              }).filter(Boolean)}
            </div>
          </div>

          {/* 추천 컬렉션 */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">추천 학습</h2>
            <div className="space-y-3">
              {collections
                .filter(c => c.type === 'official' && c.wordCount > 0)
                .slice(0, 2)
                .map((collection) => (
                  <RecommendedCollection
                    key={collection.id}
                    collection={collection}
                    reason={`${collection.wordCount}개의 필수 단어로 구성`}
                    onClick={() => handleCollectionClick(collection)}
                  />
                ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // 데스크톱 화면 (기존 코드)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 심플한 헤더 */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Vocabulary Master</h1>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">안녕하세요, {user.displayName || user.email}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/settings')}
                  >
                    설정
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => router.push('/login')}
                >
                  로그인
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-12">
        {/* 최근 학습 위젯 - 재방문 사용자용 */}
        <RecentLearningWidget
          collections={collections}
          onSelectCollection={handleStartLearning}
          loading={isLoading}
        />

        {/* 간단한 타이틀 */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            학습할 단어장을 선택하세요
          </h2>
          <p className="text-lg text-gray-600">
            레벨을 선택하면 바로 학습을 시작할 수 있습니다
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>3초 만에 시작</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <span>{collections.filter(c => c.wordCount > 0).length}개 단어장</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-purple-500" />
              <span>AI 최적화 학습</span>
            </div>
          </div>
        </div>

        {/* 카테고리 선택이 없을 때: 카테고리 카드 표시 */}
        {!selectedCategory && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {collectionLoading ? (
              // 로딩 중일 때 스켈레톤 표시
              Array.from({ length: 8 }).map((_, i) => (
                <CollectionCardSkeleton key={i} />
              ))
            ) : (
              categories.map((category) => {
              const hasContent = getCategoryHasContent(category)
              const totalWords = getCategoryTotalWords(category)

              return (
                <Card
                  key={category}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 ${
                    hoveredCard === category ? 'border-blue-400' : 'border-transparent'
                  } ${!hasContent ? 'opacity-60' : ''}`}
                  onMouseEnter={() => setHoveredCard(category)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => hasContent && setSelectedCategory(category)}
                >
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-5xl mb-4">{categoryIcons[category]}</div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{category}</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {categoryDescriptions[category]}
                      </p>
                      {hasContent ? (
                        <>
                          <p className="text-sm text-gray-500 mb-4">
                            총 {totalWords.toLocaleString()}개 단어
                          </p>
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium ${categoryColors[category]}`}>
                            <CheckCircle className="h-4 w-4" />
                            <span>레벨 선택하기</span>
                          </div>
                        </>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-200 text-gray-500 text-sm font-medium">
                          <AlertCircle className="h-4 w-4" />
                          <span>준비 중</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
            )}
          </div>
        )}

        {/* 카테고리 선택 후: 난이도 선택 */}
        {selectedCategory && (
          <div>
            {/* 뒤로가기 버튼 */}
            <button
              onClick={() => setSelectedCategory(null)}
              className="mb-8 text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              <span>다른 시험 선택</span>
            </button>

            {/* 선택된 카테고리 표시 */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 mb-4">
                <span className="text-5xl">{categoryIcons[selectedCategory]}</span>
                <h3 className="text-3xl font-bold text-gray-900">{selectedCategory}</h3>
              </div>
              <p className="text-gray-600">{categoryDescriptions[selectedCategory]}</p>
            </div>

            {/* 난이도 카드 (학원 카테고리는 학원별 표시) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {collectionLoading ? (
                // 로딩 중일 때 스켈레톤 표시
                Array.from({ length: 3 }).map((_, i) => (
                  <DifficultyCardSkeleton key={i} />
                ))
              ) : selectedCategory === '학원' ? (
                // 학원 카테고리: 학원별 카드 표시
                <>
                  {['A학원', 'B학원', 'C학원'].map((academyName, index) => {
                    const difficulty = (['advanced', 'intermediate', 'beginner'] as const)[index]
                    const collection = groupedCollections[selectedCategory][difficulty]
                    const cardId = `${selectedCategory}-${academyName}`
                    const hasWords = collection && collection.wordCount > 0

                    return (
                      <Card
                        key={academyName}
                        className={`cursor-pointer transition-all duration-300 relative overflow-hidden ${
                          hasWords ? 'hover:shadow-2xl hover:-translate-y-2' : 'opacity-60'
                        } ${hoveredCard === cardId ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''}`}
                        onMouseEnter={() => setHoveredCard(cardId)}
                        onMouseLeave={() => setHoveredCard(null)}
                        onClick={() => hasWords && handleCollectionClick(collection)}
                      >
                        {/* 학원별 배경 그라데이션 */}
                        <div className={`absolute top-0 left-0 right-0 h-2 ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                          index === 1 ? 'bg-gradient-to-r from-yellow-300 to-amber-400' :
                          'bg-gradient-to-r from-yellow-200 to-yellow-400'
                        }`} />

                        <CardContent className="p-8 text-center">
                          <div className="text-6xl mb-4">🏫</div>
                          <h4 className="text-2xl font-bold text-gray-900 mb-2">
                            {academyName}
                          </h4>
                          {hasWords ? (
                            <>
                              <p className="text-lg text-gray-600 mb-6">
                                {collection.wordCount.toLocaleString()}개 단어
                              </p>
                              <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Clock className="h-4 w-4" />
                                  <span>학원 맞춤형 커리큘럼</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Star className="h-4 w-4" />
                                  <span>전문 강사 선별 단어</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Target className="h-4 w-4" />
                                  <span>목표 점수 달성 보장</span>
                                </div>
                              </div>
                              <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
                                <Zap className="h-4 w-4 mr-2" />
                                학습 시작하기
                              </Button>
                            </>
                          ) : (
                            <div className="py-8">
                              <p className="text-gray-500 mb-4">준비 중</p>
                              <p className="text-sm text-gray-400">곧 업데이트 예정입니다</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </>
              ) : (
                // 일반 카테고리: 난이도별 카드 표시
                difficulties.map((difficulty) => {
                  const info = difficultyInfo[difficulty]
                  const collection = groupedCollections[selectedCategory][difficulty]
                  const cardId = `${selectedCategory}-${difficulty}`
                  const hasWords = collection && collection.wordCount > 0

                return (
                  <Card
                    key={difficulty}
                    className={`cursor-pointer transition-all duration-300 relative overflow-hidden ${
                      hasWords ? 'hover:shadow-2xl hover:-translate-y-2' : 'opacity-60'
                    } ${hoveredCard === cardId ? 'ring-4 ring-blue-400 ring-opacity-50' : ''}`}
                    onMouseEnter={() => setHoveredCard(cardId)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => hasWords && handleStartLearning(collection)}
                  >
                    {/* 난이도별 배경 그라데이션 */}
                    <div className={`absolute top-0 left-0 right-0 h-2 ${
                      difficulty === 'beginner' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                      difficulty === 'intermediate' ? 'bg-gradient-to-r from-blue-400 to-cyan-500' :
                      'bg-gradient-to-r from-purple-400 to-pink-500'
                    }`} />

                    <CardContent className="p-8 text-center">
                      <div className="text-6xl mb-4">{info.icon}</div>
                      <h4 className="text-2xl font-bold text-gray-900 mb-2">
                        {info.label}
                      </h4>
                      {hasWords ? (
                        <>
                          <p className="text-lg text-gray-600 mb-6">
                            {collection.wordCount.toLocaleString()}개 단어
                          </p>

                          {/* 특징 리스트 */}
                          <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span>일일 30분 학습</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Star className="h-4 w-4" />
                              <span>AI 맞춤 복습</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Target className="h-4 w-4" />
                              <span>
                                {difficulty === 'beginner' ? '기초 다지기' :
                                 difficulty === 'intermediate' ? '실력 향상' :
                                 '고득점 달성'}
                              </span>
                            </div>
                          </div>

                          <Button
                            className="w-full"
                            size="lg"
                            disabled={isLoading}
                            onClick={() => {
                              if (!isLoading) {
                                router.push(`/study/${selectedCategory}/${difficulty}`)
                              }
                            }}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                로딩 중...
                              </>
                            ) : (
                              <>
                                학습 시작하기
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-lg text-gray-400 mb-6">
                            단어 준비 중
                          </p>
                          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-100 text-gray-400">
                            <AlertCircle className="h-5 w-5" />
                            <span>곧 업데이트 예정</span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )
              })
              )}
            </div>
          </div>
        )}

        {/* 빠른 통계 (하단) */}
        <div className="mt-20 py-12 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {collections.reduce((sum, c) => sum + (c.wordCount || 0), 0).toLocaleString()}+
              </div>
              <div className="text-sm text-gray-600">총 단어</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">7개</div>
              <div className="text-sm text-gray-600">시험 카테고리</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {collections.filter(c => c.type === 'official').length}개
              </div>
              <div className="text-sm text-gray-600">공식 단어장</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">AI</div>
              <div className="text-sm text-gray-600">맞춤 학습</div>
            </div>
          </div>
        </div>
      </main>

      {/* 학습 방법 선택 모달 */}
      <StudyMethodModal
        isOpen={studyModalOpen}
        onClose={() => setStudyModalOpen(false)}
        collection={selectedCollection}
        onSelectMethod={handleStartLearning}
        lastStudyMethod={undefined} // 이전 학습 방법은 localStorage에서 관리
      />
    </div>
  )
}