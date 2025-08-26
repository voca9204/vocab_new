'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, BookOpen, Users, Star, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useUnifiedVocabulary } from '@/contexts/collection-context-v2'
import type { OfficialCollection, PersonalCollection } from '@/types/collections'

export default function CollectionsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectWordbook } = useUnifiedVocabulary()
  const [officialCollections, setOfficialCollections] = useState<OfficialCollection[]>([])
  const [publicCollections, setPublicCollections] = useState<PersonalCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')

  useEffect(() => {
    loadCollections()
  }, [selectedCategory, selectedDifficulty, user])

  const loadCollections = async () => {
    setLoading(true)
    try {
      // Load official collections (public, no auth needed)
      let officialUrl = '/api/collections/official'
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }
      if (selectedDifficulty !== 'all') {
        params.append('difficulty', selectedDifficulty)
      }
      if (params.toString()) {
        officialUrl += `?${params.toString()}`
      }

      const officialResponse = await fetch(officialUrl)
      const officialData = await officialResponse.json()
      
      if (officialData.success) {
        setOfficialCollections(officialData.collections || [])
      }

      // Load public personal collections only if user is authenticated
      if (user) {
        const token = await user.getIdToken()
        const publicResponse = await fetch('/api/collections/personal?isPrivate=false', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (publicResponse.ok) {
          const publicData = await publicResponse.json()
          if (publicData.success) {
            setPublicCollections(publicData.collections || [])
          }
        } else {
          console.log('Could not load personal collections - user may not be authenticated')
          setPublicCollections([])
        }
      } else {
        // User not authenticated, can't load personal collections
        console.log('User not authenticated - skipping personal collections')
        setPublicCollections([])
      }
    } catch (error) {
      console.error('Error loading collections:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOfficialCollections = officialCollections.filter(collection => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      collection.name.toLowerCase().includes(query) ||
      collection.description?.toLowerCase().includes(query) ||
      collection.tags?.some(tag => tag.toLowerCase().includes(query))
    )
  })

  const filteredPublicCollections = publicCollections.filter(collection => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      collection.name.toLowerCase().includes(query) ||
      collection.description?.toLowerCase().includes(query) ||
      collection.tags?.some(tag => tag.toLowerCase().includes(query))
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">단어장을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">단어장 탐색</h1>
          <p className="mt-2 text-gray-600">공식 단어장과 공개된 개인 단어장을 찾아보세요.</p>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="space-y-4">
            {/* 검색 바 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="단어장 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 필터 옵션 */}
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">전체</option>
                  <option value="SAT">SAT</option>
                  <option value="TOEFL">TOEFL</option>
                  <option value="TOEIC">TOEIC</option>
                  <option value="수능">수능</option>
                  <option value="GRE">GRE</option>
                  <option value="IELTS">IELTS</option>
                  <option value="기본">기본</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">전체</option>
                  <option value="beginner">초급</option>
                  <option value="intermediate">중급</option>
                  <option value="advanced">고급</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 공식 단어장 섹션 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">공식 단어장</h2>
          {filteredOfficialCollections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOfficialCollections.map((collection) => (
                <OfficialCollectionCard
                  key={collection.id}
                  collection={collection}
                  onSelect={async () => {
                    // Select the wordbook in UnifiedVocabularyContext
                    try {
                      await selectWordbook(collection.id)
                      // Navigate to unified dashboard
                      router.push('/unified-dashboard')
                    } catch (error) {
                      console.error('Failed to select collection:', error)
                      alert('단어장 선택에 실패했습니다.')
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">조건에 맞는 공식 단어장이 없습니다.</p>
            </Card>
          )}
        </div>

        {/* 공개 단어장 섹션 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">공개된 개인 단어장</h2>
          {filteredPublicCollections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPublicCollections.map((collection) => (
                <PublicCollectionCard
                  key={collection.id}
                  collection={collection}
                  onSelect={async () => {
                    // Select the wordbook in UnifiedVocabularyContext
                    try {
                      await selectWordbook(collection.id)
                      // Navigate to unified dashboard
                      router.push('/unified-dashboard')
                    } catch (error) {
                      console.error('Failed to select collection:', error)
                      alert('단어장 선택에 실패했습니다.')
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">공개된 개인 단어장이 없습니다.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// 공식 단어장 카드
function OfficialCollectionCard({ 
  collection, 
  onSelect 
}: { 
  collection: OfficialCollection
  onSelect: () => void
}) {
  const categoryColors: Record<string, string> = {
    'SAT': 'bg-blue-100 text-blue-800',
    'TOEFL': 'bg-green-100 text-green-800',
    'TOEIC': 'bg-purple-100 text-purple-800',
    '수능': 'bg-red-100 text-red-800',
    'GRE': 'bg-yellow-100 text-yellow-800',
    'IELTS': 'bg-indigo-100 text-indigo-800',
    '기본': 'bg-gray-100 text-gray-800'
  }

  const difficultyLabels: Record<string, string> = {
    'beginner': '초급',
    'intermediate': '중급',
    'advanced': '고급'
  }

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={onSelect}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs rounded-full ${categoryColors[collection.category] || 'bg-gray-100 text-gray-800'}`}>
              {collection.category}
            </span>
            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
              {difficultyLabels[collection.difficulty] || collection.difficulty}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{collection.displayName || collection.name}</h3>
          {collection.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{collection.description}</p>
          )}
        </div>
        <div className="ml-2">
          <Star className="h-5 w-5 text-yellow-400 fill-current" />
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>단어 수</span>
          <span className="font-medium">{collection.wordCount}개</span>
        </div>
        {collection.statistics && (
          <>
            <div className="flex justify-between">
              <span>학습 중인 사용자</span>
              <span className="font-medium">{collection.statistics.totalUsers}명</span>
            </div>
            <div className="flex justify-between">
              <span>평균 숙련도</span>
              <span className="font-medium">{collection.statistics.avgMastery}%</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <Button size="sm" className="w-full">
          <TrendingUp className="h-4 w-4 mr-2" />
          학습 시작
        </Button>
      </div>
    </Card>
  )
}

// 공개 개인 단어장 카드
function PublicCollectionCard({ 
  collection, 
  onSelect 
}: { 
  collection: PersonalCollection
  onSelect: () => void
}) {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={onSelect}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{collection.name}</h3>
        {collection.description && (
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{collection.description}</p>
        )}
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>단어 수</span>
          <span className="font-medium">{collection.wordCount}개</span>
        </div>
        <div className="flex justify-between">
          <span>생성일</span>
          <span className="font-medium">
            {new Date(collection.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {collection.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {collection.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
              {tag}
            </span>
          ))}
          {collection.tags.length > 3 && (
            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
              +{collection.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <Button size="sm" variant="outline" className="w-full">
          <BookOpen className="h-4 w-4 mr-2" />
          둘러보기
        </Button>
      </div>
    </Card>
  )
}