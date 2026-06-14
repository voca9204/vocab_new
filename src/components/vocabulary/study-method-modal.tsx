'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/modal'
import { Card } from '@/components/ui/card'
import {
  List,
  CreditCard,
  Brain,
  ChevronRight,
  Sparkles,
  Clock,
  Target,
  Keyboard
} from 'lucide-react'
import { getCollectionName } from '@/lib/utils/collection-name'
import type { Collection } from '@/contexts/collection-context-v2'

interface StudyMethodModalProps {
  isOpen: boolean
  onClose: () => void
  collection: Collection | null
  onSelectMethod: (method: 'list' | 'flashcards' | 'quiz' | 'typing') => void
  lastStudyMethod?: string
}

export function StudyMethodModal({
  isOpen,
  onClose,
  collection,
  onSelectMethod,
  lastStudyMethod
}: StudyMethodModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'list' | 'flashcards' | 'quiz' | 'typing' | null>(null)

  console.log('[StudyMethodModal] Render - isOpen:', isOpen, 'collection:', collection)

  if (!collection) {
    console.log('[StudyMethodModal] No collection, returning null')
    return null
  }

  const studyMethods = [
    {
      id: 'list' as const,
      title: '단어 목록',
      icon: List,
      description: '모든 단어를 한눈에 보며 학습',
      features: ['전체 단어 훑어보기', '빠른 복습', '단어 검색 가능'],
      recommended: lastStudyMethod === 'list',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      iconColor: 'text-blue-600'
    },
    {
      id: 'flashcards' as const,
      title: '플래시카드',
      icon: CreditCard,
      description: '카드를 넘기며 집중 학습',
      features: ['집중력 향상', '암기 효과 극대화', '진도 추적'],
      recommended: !lastStudyMethod || lastStudyMethod === 'flashcards',
      popular: true,
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
      iconColor: 'text-purple-600'
    },
    {
      id: 'quiz' as const,
      title: '퀴즈',
      icon: Brain,
      description: '실전 테스트로 실력 점검',
      features: ['학습 효과 측정', '틀린 문제 복습', '성취도 확인'],
      recommended: collection.progress?.studied && collection.progress.studied > 20,
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
      iconColor: 'text-green-600'
    },
    {
      id: 'typing' as const,
      title: '타이핑 연습',
      icon: Keyboard,
      description: '단어 철자를 타이핑하며 학습',
      features: ['철자 암기', '타이핑 속도 향상', '능동적 학습'],
      recommended: false,
      color: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
      iconColor: 'text-amber-600'
    }
  ]

  const handleSelectMethod = (method: 'list' | 'flashcards' | 'quiz' | 'typing') => {
    setSelectedMethod(method)

    // 약간의 지연 후 모달 닫고 학습 시작
    // localStorage 저장은 page.tsx의 saveToHistory에서 처리
    setTimeout(() => {
      onSelectMethod(method)
      onClose()
    }, 300)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl"
    >
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-2">학습 방법 선택</h2>
          <p className="text-base text-gray-600">
            <span className="font-semibold text-gray-900">
              {getCollectionName(collection.name)}
            </span> 단어장을
            어떤 방법으로 학습하시겠습니까?
          </p>
        </div>

        <div className="grid gap-4">
          {studyMethods.map((method) => (
            <Card
              key={method.id}
              className={`relative cursor-pointer transition-all duration-200 p-6 border-2 ${
                selectedMethod === method.id
                  ? 'ring-2 ring-blue-500 border-blue-500'
                  : method.color
              }`}
              onClick={() => handleSelectMethod(method.id)}
            >
              {/* 인기/추천 배지 */}
              {method.popular && (
                <div className="absolute -top-2 -right-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg">
                    <Sparkles className="w-3 h-3" />
                    인기
                  </span>
                </div>
              )}
              {method.recommended && !method.popular && (
                <div className="absolute -top-2 -right-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full shadow-lg">
                    <Target className="w-3 h-3" />
                    추천
                  </span>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${method.color.replace('hover:bg-', 'bg-').replace('100', '200')}`}>
                  <method.icon className={`w-6 h-6 ${method.iconColor}`} />
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {method.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {method.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {method.features.map((feature, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* 진도 정보 (플래시카드인 경우) */}
                  {method.id === 'flashcards' && collection.progress?.studied && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>
                        현재 진도: {collection.progress.studied}/{collection.wordCount} 단어
                      </span>
                    </div>
                  )}
                </div>

                <ChevronRight className={`w-5 h-5 ${
                  selectedMethod === method.id ? 'text-blue-500' : 'text-gray-400'
                } transition-colors`} />
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
          >
            취소
          </Button>
        </div>
      </div>
    </Modal>
  )
}