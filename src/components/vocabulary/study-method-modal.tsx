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
  Keyboard,
  GraduationCap
} from 'lucide-react'
import { getCollectionName } from '@/lib/utils/collection-name'
import type { Collection } from '@/contexts/collection-context-v2'

interface StudyMethodModalProps {
  isOpen: boolean
  onClose: () => void
  collection: Collection | null
  onSelectMethod: (method: 'list' | 'flashcards' | 'quiz' | 'typing' | 'exam') => void
  lastStudyMethod?: string
}

export function StudyMethodModal({
  isOpen,
  onClose,
  collection,
  onSelectMethod,
  lastStudyMethod
}: StudyMethodModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'list' | 'flashcards' | 'quiz' | 'typing' | 'exam' | null>(null)

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
    },
    {
      id: 'exam' as const,
      title: '시험 모드',
      icon: GraduationCap,
      description: '매일 정해진 분량을 외우고 테스트',
      features: ['하루 학습량 설정', '매일 다른 배치', '오늘 단어 인쇄'],
      recommended: false,
      color: 'bg-rose-50 hover:bg-rose-100 border-rose-200',
      iconColor: 'text-rose-600'
    }
  ]

  const handleSelectMethod = (method: 'list' | 'flashcards' | 'quiz' | 'typing' | 'exam') => {
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
      <div className="p-4 sm:p-6">
        <div className="mb-3">
          <h2 className="text-xl font-bold mb-1">학습 방법 선택</h2>
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">
              {getCollectionName(collection.name)}
            </span> 학습 방법을 선택하세요
          </p>
        </div>

        <div className="grid gap-2 sm:gap-3">
          {studyMethods.map((method) => (
            <Card
              key={method.id}
              className={`relative cursor-pointer transition-all duration-200 p-3 sm:p-4 border-2 ${
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

              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${method.color.replace('hover:bg-', 'bg-').replace('100', '200')}`}>
                  <method.icon className={`w-5 h-5 ${method.iconColor}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900">
                    {method.title}
                  </h3>
                  <p className="text-xs text-gray-600 truncate">
                    {method.description}
                  </p>

                  {/* features 태그는 데스크톱에서만 (모바일은 한 화면에 다 보이게 생략) */}
                  <div className="hidden sm:flex flex-wrap gap-1.5 mt-1.5">
                    {method.features.map((feature, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                <ChevronRight className={`w-5 h-5 shrink-0 ${
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