'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui'
import {
  ArrowRight,
  BookOpen,
  Clock,
  Trophy,
  TrendingUp,
  Zap,
  ChevronRight,
  Star,
  Target,
  Play
} from 'lucide-react'
import type { Collection } from '@/contexts/collection-context-v2'

interface QuickStartCardProps {
  collection: Collection | null
  onStart: () => void
  loading: boolean
}

export function QuickStartCard({ collection, onStart, loading }: QuickStartCardProps) {

  if (!collection) return null

  const progress = Math.floor(Math.random() * 30) // Mock progress
  const estimatedTime = Math.ceil((collection.wordCount * (100 - progress)) / 100 * 0.5) // 단어당 0.5분

  return (
    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-blue-100 text-sm mb-1">이어서 학습하기</p>
          <h3 className="text-xl font-bold">{collection.name}</h3>
        </div>
        <div className="bg-white/20 rounded-full p-2">
          <BookOpen className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-100">진행률</span>
          <span>{progress}% 완료</span>
        </div>
        <div className="bg-blue-400/30 rounded-full h-2 overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-blue-100">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>약 {estimatedTime}분</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            <span>{collection.wordCount - Math.floor(collection.wordCount * progress / 100)}개 남음</span>
          </div>
        </div>

        <Button
          size="sm"
          variant="default"
          className="bg-white text-blue-600 hover:bg-blue-50"
          onClick={onStart}
          disabled={loading}
        >
          <Play className="h-4 w-4 mr-1" />
          계속
        </Button>
      </div>
    </Card>
  )
}

interface StudyStatsCardProps {
  totalWords: number
  streak: number
  todayWords: number
}

export function StudyStatsCard({ totalWords, streak, todayWords }: StudyStatsCardProps) {
  return (
    <Card className="p-4 mb-6">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-yellow-500" />
        오늘의 학습
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{todayWords}</p>
          <p className="text-xs text-gray-500">오늘 학습</p>
        </div>
        <div className="text-center border-x">
          <p className="text-2xl font-bold text-orange-500">{streak}</p>
          <p className="text-xs text-gray-500">연속 일수</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{totalWords}</p>
          <p className="text-xs text-gray-500">전체 학습</p>
        </div>
      </div>
    </Card>
  )
}

interface CategoryCardProps {
  category: string
  description: string
  icon: string
  wordCount: number
  difficulty?: string
  color: string
  onClick: () => void
  isPopular?: boolean
}

export function CategoryCard({
  category,
  description,
  icon,
  wordCount,
  difficulty,
  color,
  onClick,
  isPopular
}: CategoryCardProps) {
  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
          <span className="text-2xl">{icon}</span>
        </div>
        {isPopular && (
          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">
            인기
          </span>
        )}
      </div>

      <h3 className="font-bold text-gray-900 mb-1">{category}</h3>
      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span>{wordCount}개 단어</span>
          {difficulty && (
            <>
              <span>•</span>
              <span>{difficulty}</span>
            </>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
    </Card>
  )
}

interface QuickActionButtonProps {
  icon: React.ReactNode
  label: string
  sublabel?: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export function QuickActionButton({
  icon,
  label,
  sublabel,
  onClick,
  variant = 'secondary'
}: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center p-4 rounded-xl transition-all
        ${variant === 'primary'
          ? 'bg-blue-500 text-white hover:bg-blue-600'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
      `}
    >
      <div className="mb-2">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
      {sublabel && (
        <span className={`text-xs mt-0.5 ${
          variant === 'primary' ? 'text-blue-100' : 'text-gray-500'
        }`}>
          {sublabel}
        </span>
      )}
    </button>
  )
}

interface RecommendedCollectionProps {
  collection: Collection
  reason: string
  onClick: () => void
}

export function RecommendedCollection({ collection, reason, onClick }: RecommendedCollectionProps) {
  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-all flex items-center gap-4"
      onClick={onClick}
    >
      <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg p-3">
        <Star className="h-5 w-5 text-purple-600" />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-gray-900">{collection.name}</h4>
          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
            추천
          </span>
        </div>
        <p className="text-xs text-gray-500">{reason}</p>
        <p className="text-xs text-gray-600 mt-1">{collection.wordCount}개 단어</p>
      </div>

      <ChevronRight className="h-5 w-5 text-gray-400" />
    </Card>
  )
}