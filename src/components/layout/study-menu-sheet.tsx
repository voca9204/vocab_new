'use client'

import { X, ChevronRight, CreditCard, Brain, PenTool, RefreshCw, Calendar, List } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

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
}

export default function StudyMenuSheet({ isOpen, onClose }: StudyMenuSheetProps) {
  const router = useRouter()
  const pathname = usePathname()

  const studyItems: StudyMenuItem[] = [
    {
      id: 'list',
      label: '단어 목록',
      icon: List,
      href: '/study/list',
      description: '저장된 단어 확인하기'
    },
    {
      id: 'flashcards',
      label: '플래시카드',
      icon: CreditCard,
      href: '/study/flashcards',
      description: '카드로 단어 암기하기'
    },
    {
      id: 'quiz',
      label: '퀴즈',
      icon: Brain,
      href: '/study/quiz',
      description: '문제 풀며 실력 테스트'
    },
    {
      id: 'typing',
      label: '타이핑 연습',
      icon: PenTool,
      href: '/study/typing',
      description: '철자 익히기'
    },
    {
      id: 'review',
      label: '복습',
      icon: RefreshCw,
      href: '/study/review',
      description: '틀린 단어 다시 보기'
    },
    {
      id: 'daily',
      label: '데일리 학습',
      icon: Calendar,
      href: '/study/daily',
      description: '오늘의 단어 학습'
    }
  ]

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

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto py-4">
            {studyItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    router.push(item.href)
                    onClose()
                  }}
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
        </div>
      </div>
    </>
  )
}