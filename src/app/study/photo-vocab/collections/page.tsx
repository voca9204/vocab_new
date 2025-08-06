'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Calendar, BookOpen, Target, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useAuth } from '@/components/providers/auth-provider'
import { CollectionCard } from '@/components/photo-vocabulary/collection-card'
import { photoVocabularyCollectionService } from '@/lib/api/photo-vocabulary-collection-service'
import type { PhotoVocabularyCollectionSummary } from '@/types/photo-vocabulary-collection'

export default function PhotoVocabCollectionsPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [collections, setCollections] = useState<PhotoVocabularyCollectionSummary[]>([])
  const [filteredCollections, setFilteredCollections] = useState<PhotoVocabularyCollectionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  
  // Statistics
  const [stats, setStats] = useState({
    totalCollections: 0,
    totalWords: 0,
    studiedWords: 0,
    averageAccuracy: 0
  })

  useEffect(() => {
    if (user) {
      loadCollections()
    }
  }, [user])

  useEffect(() => {
    filterCollections()
  }, [collections, searchQuery, categoryFilter])

  const loadCollections = async () => {
    try {
      const userCollections = await photoVocabularyCollectionService.getUserCollections(user!.uid)
      setCollections(userCollections)
      
      // Calculate statistics
      const totalCollections = userCollections.length
      const totalWords = userCollections.reduce((sum, col) => sum + col.totalWords, 0)
      const studiedWords = userCollections.reduce((sum, col) => sum + col.studiedWords, 0)
      const averageAccuracy = userCollections.length > 0 
        ? Math.round(userCollections.reduce((sum, col) => sum + col.accuracyRate, 0) / userCollections.length)
        : 0

      setStats({
        totalCollections,
        totalWords,
        studiedWords,
        averageAccuracy
      })
    } catch (error) {
      console.error('컬렉션 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterCollections = () => {
    let filtered = collections

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(collection =>
        collection.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        collection.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(collection => 
        collection.category === categoryFilter
      )
    }

    setFilteredCollections(filtered)
  }

  const handleArchive = async (collectionId: string) => {
    // TODO: Implement archive functionality
    console.log('Archive collection:', collectionId)
  }

  const handleDelete = async (collectionId: string) => {
    if (!confirm('정말로 이 컬렉션을 삭제하시겠습니까? 모든 단어도 함께 삭제됩니다.')) {
      return
    }

    try {
      setLoading(true)
      await photoVocabularyCollectionService.deleteCollection(collectionId)
      
      // Remove from local state
      setCollections(prev => prev.filter(col => col.id !== collectionId))
      
      alert('컬렉션이 삭제되었습니다.')
    } catch (error) {
      console.error('컬렉션 삭제 실패:', error)
      alert('컬렉션 삭제에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // Group collections by date
  const groupedCollections = filteredCollections.reduce((groups, collection) => {
    const date = collection.date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(collection)
    return groups
  }, {} as Record<string, PhotoVocabularyCollectionSummary[]>)

  const sortedDates = Object.keys(groupedCollections).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )

  // Get unique categories for filter
  const categories = Array.from(new Set(
    collections.map(col => col.category).filter(Boolean)
  ))

  const formatDateGroup = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return '오늘'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '어제'
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>로그인이 필요합니다.</p>
        <Button onClick={() => router.push('/login')} className="mt-4">
          로그인하기
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            📚 내 사진 단어장
          </h1>
          <p className="text-gray-600 mt-1">
            사진에서 추출한 단어들을 체계적으로 학습해보세요
          </p>
        </div>
        <Button onClick={() => router.push('/study/photo-vocab')}>
          <Plus className="h-5 w-5 mr-2" />
          새 단어장 만들기
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">총 단어장</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.totalCollections}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">총 단어</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.totalWords}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium">학습 완료</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.studiedWords}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium">평균 정확도</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.averageAccuracy}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="단어장 또는 태그 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="카테고리 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 카테고리</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category!}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Collections */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-4">단어장을 불러오는 중...</p>
        </div>
      ) : filteredCollections.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">단어장이 없습니다</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || categoryFilter !== 'all' 
                ? '검색 조건에 맞는 단어장이 없습니다'
                : '첫 번째 단어장을 만들어보세요'
              }
            </p>
            <Button onClick={() => router.push('/study/photo-vocab')}>
              <Plus className="h-5 w-5 mr-2" />
              새 단어장 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-semibold">{formatDateGroup(date)}</h2>
                <Badge variant="outline">
                  {groupedCollections[date].length}개
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedCollections[date].map(collection => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}