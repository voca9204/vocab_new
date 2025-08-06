'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, BookOpen, Target, Archive, MoreVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import type { PhotoVocabularyCollectionSummary } from '@/types/photo-vocabulary-collection'

interface CollectionCardProps {
  collection: PhotoVocabularyCollectionSummary
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
}

export function CollectionCard({ collection, onArchive, onDelete }: CollectionCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleCardClick = () => {
    router.push(`/study/photo-vocab/collections/${collection.id}`)
  }

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onArchive) {
      setLoading(true)
      await onArchive(collection.id)
      setLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete && confirm('이 단어장을 삭제하시겠습니까?')) {
      setLoading(true)
      await onDelete(collection.id)
      setLoading(false)
    }
  }

  const progressPercentage = collection.totalWords > 0 
    ? Math.round((collection.studiedWords / collection.totalWords) * 100)
    : 0

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1 line-clamp-1">
              {collection.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(collection.date)}</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
                disabled={loading}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" />
                보관
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Photo thumbnail */}
        <div className="mb-3">
          <img
            src={collection.photoUrl}
            alt={collection.title}
            className="w-full h-32 object-cover rounded-lg bg-gray-100"
            loading="lazy"
          />
        </div>

        {/* Statistics */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span>{collection.totalWords}개 단어</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4 text-green-500" />
              <span>{collection.accuracyRate}% 정확도</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm text-gray-600">
              <span>학습 진도</span>
              <span>{collection.studiedWords}/{collection.totalWords} ({progressPercentage}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tags and Category */}
        <div className="flex flex-wrap gap-1">
          {collection.category && (
            <Badge variant="secondary" className="text-xs">
              {collection.category}
            </Badge>
          )}
          {collection.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {collection.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{collection.tags.length - 2}
            </Badge>
          )}
        </div>

        {/* Last studied */}
        {collection.lastStudiedAt && (
          <div className="mt-2 text-xs text-gray-500">
            마지막 학습: {collection.lastStudiedAt.toLocaleDateString('ko-KR')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}