'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight, CreditCard, Brain, PenTool, RefreshCw, Calendar, List, ArrowLeft, GraduationCap } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { useCollectionV2 } from '@/contexts/collection-context-v2'
import { getCollectionName } from '@/lib/utils/collection-name'

interface StudyMenuSheetProps {
  isOpen: boolean
  onClose: () => void
}

interface StudyMenuItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  description: string
  requiresCollection?: boolean
}

export default function StudyMenuSheet({ isOpen, onClose }: StudyMenuSheetProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { collections } = useCollectionV2()
  const [selectedMethod, setSelectedMethod] = useState<StudyMenuItem | null>(null)
  const [showCollectionSelection, setShowCollectionSelection] = useState(false)

  const studyItems: StudyMenuItem[] = [
    {
      id: 'list',
      label: '단어 목록',
      icon: List,
      href: '/study/list',
      description: '저장된 단어 확인하기',
      requiresCollection: true
    },
    {
      id: 'flashcards',
      label: '플래시카드',
      icon: CreditCard,
      href: '/study/flashcards',
      description: '카드로 단어 암기하기',
      requiresCollection: true
    },
    {
      id: 'quiz',
      label: '퀴즈',
      icon: Brain,
      href: '/study/quiz',
      description: '문제 풀며 실력 테스트',
      requiresCollection: true
    },
    {
      id: 'typing',
      label: '타이핑 연습',
      icon: PenTool,
      href: '/study/typing',
      description: '철자 익히기',
      requiresCollection: true
    },
    {
      id: 'exam',
      label: '시험 모드',
      icon: GraduationCap,
      href: '/study/exam',
      description: '매일 분량 외우고 테스트',
      requiresCollection: true
    },
    {
      id: 'review',
      label: '복습',
      icon: RefreshCw,
      href: '/study/review',
      description: '틀린 단어 다시 보기',
      requiresCollection: false
    },
    {
      id: 'daily',
      label: '데일리 학습',
      icon: Calendar,
      href: '/study/daily',
      description: '오늘의 단어 학습',
      requiresCollection: false
    }
  ]

  // Group collections by category
  const groupedCollections = collections.reduce((acc, collection) => {
    const category = collection.category || 'OTHER'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(collection)
    return acc
  }, {} as Record<string, typeof collections>)

  // Sort collections within each category by difficulty
  const difficultyOrder = { '초급': 0, '중급': 1, '고급': 2 }
  Object.keys(groupedCollections).forEach(category => {
    groupedCollections[category].sort((a, b) => {
      const aDiff = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] ?? 3
      const bDiff = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] ?? 3
      return aDiff - bDiff
    })
  })

  const handleStudyItemClick = (item: StudyMenuItem) => {
    if (item.requiresCollection) {
      setSelectedMethod(item)
      setShowCollectionSelection(true)
    } else {
      router.push(item.href)
      onClose()
    }
  }

  const handleCollectionSelect = (collectionId: string) => {
    if (selectedMethod) {
      // Navigate with collection ID as query parameter
      router.push(`${selectedMethod.href}?collectionId=${collectionId}`)
      onClose()
    }
  }

  const handleBack = () => {
    setShowCollectionSelection(false)
    setSelectedMethod(null)
  }

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setShowCollectionSelection(false)
      setSelectedMethod(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-[61] w-full max-w-xs bg-white shadow-xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="px-4 pt-5 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold leading-6 text-gray-900">
                  학습 메뉴
                </h2>
                <p className="mt-1 text-sm text-gray-500">원하는 학습 방법을 선택하세요</p>
              </div>
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={onClose}
              >
                <span className="sr-only">학습 메뉴 닫기</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Content */}
          {!showCollectionSelection ? (
            // Study Menu Items
            <nav className="flex-1 overflow-y-auto py-4">
              {studyItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <button
                    key={item.id}
                    onClick={() => handleStudyItemClick(item)}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-4 text-left transition-colors border-l-4",
                      isActive
                        ? "bg-blue-50 text-blue-600 border-blue-600"
                        : "text-gray-700 hover:bg-gray-50 border-transparent"
                    )}
                  >
                    <div className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                      isActive ? "bg-blue-100" : "bg-gray-100"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                )
              })}
            </nav>
          ) : (
            // Collection Selection
            <div className="flex-1 overflow-y-auto">
              {/* Back Button */}
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-3 w-full text-left text-gray-700 hover:bg-gray-50 border-b"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">뒤로가기</span>
              </button>

              {/* Collection List */}
              <div className="py-4 px-4 space-y-4">
                <p className="text-sm text-gray-500 mb-3">
                  {selectedMethod?.label}에 사용할 컬렉션을 선택하세요
                </p>

                {Object.entries(groupedCollections).map(([category, categoryCollections]) => (
                  <div key={category}>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryCollections.map(collection => (
                        <Card
                          key={collection.id}
                          className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => handleCollectionSelect(collection.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {getCollectionName(collection.name)}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-500">
                                  {collection.wordCount || 0}개 단어
                                </span>
                                {collection.difficulty && (
                                  <span className={cn(
                                    "text-xs px-1.5 py-0.5 rounded",
                                    collection.difficulty === '초급' && "bg-green-100 text-green-700",
                                    collection.difficulty === '중급' && "bg-yellow-100 text-yellow-700",
                                    collection.difficulty === '고급' && "bg-red-100 text-red-700"
                                  )}>
                                    {collection.difficulty}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}