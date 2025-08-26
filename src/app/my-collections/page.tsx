'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Share2, Lock, Unlock, BookOpen, TrendingUp, Upload } from 'lucide-react'
import { Button } from '@/components/ui'
import { Card } from '@/components/ui/card'
import { UploadModal } from '@/components/collections'
import type { PersonalCollection, UserQuota } from '@/types/collections'
import type { Word } from '@/types/vocabulary-v2'

export default function MyCollectionsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [collections, setCollections] = useState<PersonalCollection[]>([])
  const [quota, setQuota] = useState<UserQuota | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState<PersonalCollection | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'private' | 'public'>('all')

  // 로그인 확인
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // 컬렉션 데이터 로드
  useEffect(() => {
    if (user) {
      loadCollections()
    }
  }, [user, activeFilter])

  const loadCollections = async () => {
    setLoading(true)
    try {
      console.log('🔄 컬렉션 로드 시작:', {
        activeFilter,
        hasUser: !!user
      })
      
      const token = await user?.getIdToken()
      
      let url = '/api/collections/personal'
      if (activeFilter !== 'all') {
        url += `?isPrivate=${activeFilter === 'private'}`
      }
      
      console.log('📡 컬렉션 API 호출:', url)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('📡 컬렉션 API 응답 상태:', response.status, response.statusText)
      
      const data = await response.json()
      
      if (data.success) {
        console.log('✅ 컬렉션 로드 성공:', {
          collectionsCount: data.collections?.length || 0,
          quota: data.quota?.usage
        })
        setCollections(data.collections)
        setQuota(data.quota)
      } else {
        console.error('❌ 컬렉션 로드 실패:', data)
      }
    } catch (error) {
      console.error('❌ 컬렉션 로드 중 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCollection = async (collectionId: string) => {
    if (!confirm('정말로 이 단어장을 삭제하시겠습니까?')) return

    try {
      const token = await user?.getIdToken()
      const response = await fetch(`/api/collections/personal/${collectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        loadCollections()
      }
    } catch (error) {
      console.error('Error deleting collection:', error)
    }
  }

  const handleShareCollection = async (collectionId: string) => {
    // TODO: 공유 기능 구현
    alert('공유 기능은 준비 중입니다.')
  }

  const handleUpload = async (data: {
    name: string
    description?: string
    isPrivate: boolean
    tags: string[]
    words: Word[]
  }) => {
    try {
      console.log('🚀 개인 컬렉션 생성 시작:', {
        name: data.name,
        wordsCount: data.words.length,
        isPrivate: data.isPrivate,
        tags: data.tags
      })
      
      const token = await user?.getIdToken()
      console.log('🔑 인증 토큰 획득 완료')
      
      const response = await fetch('/api/collections/personal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      console.log('📡 API 응답 상태:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API 오류 응답:', {
          status: response.status,
          statusText: response.statusText,
          response: errorText
        })
        try {
          const errorData = JSON.parse(errorText)
          throw new Error(errorData.error || 'Failed to create collection')
        } catch (parseError) {
          throw new Error(`API 오류 (${response.status}): ${errorText}`)
        }
      }
      
      const result = await response.json()
      console.log('✅ 컬렉션 생성 성공:', {
        success: result.success,
        collectionId: result.collection?.id,
        message: result.message
      })
      
      setShowUploadModal(false)
      console.log('🔄 컬렉션 목록 새로고침 시작')
      await loadCollections()
      console.log('✅ 컬렉션 목록 새로고침 완료')
    } catch (error) {
      console.error('❌ 컬렉션 업로드 실패:', error)
      throw error
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const quotaPercentage = quota ? (quota.usage.vocabularyCount / quota.limits.maxVocabularies) * 100 : 0
  const wordsPercentage = quota ? (quota.usage.totalWordCount / quota.limits.maxTotalWords) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">내 단어장</h1>
          <p className="mt-2 text-gray-600">개인 단어장을 관리하고 학습하세요.</p>
        </div>

        {/* 사용량 표시 */}
        {quota && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="p-6">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">단어장 사용량</span>
                  <span className="text-sm text-gray-900">
                    {quota.usage.vocabularyCount} / {quota.limits.maxVocabularies === -1 ? '무제한' : quota.limits.maxVocabularies}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {quota.plan === 'free' && '무료 플랜'}
                {quota.plan === 'premium' && '프리미엄 플랜'}
                {quota.plan === 'pro' && '프로 플랜'}
                {quota.plan === 'admin' && '관리자'}
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">총 단어 수</span>
                  <span className="text-sm text-gray-900">
                    {quota.usage.totalWordCount} / {quota.limits.maxTotalWords === -1 ? '무제한' : quota.limits.maxTotalWords}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(wordsPercentage, 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                단어장당 최대 {quota.limits.maxWordsPerVocabulary === -1 ? '무제한' : `${quota.limits.maxWordsPerVocabulary}개`}
              </p>
            </Card>
          </div>
        )}

        {/* 필터 및 액션 버튼 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeFilter === 'all' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setActiveFilter('private')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeFilter === 'private' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  비공개
                </button>
                <button
                  onClick={() => setActiveFilter('public')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeFilter === 'public' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  공개
                </button>
              </div>
              
              <Button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2"
                disabled={quota && quota.limits.maxVocabularies !== -1 && quota.usage.vocabularyCount >= quota.limits.maxVocabularies}
              >
                <Plus className="h-4 w-4" />
                새 단어장 만들기
              </Button>
            </div>
          </div>

          {/* 컬렉션 그리드 */}
          <div className="p-6">
            {collections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    onEdit={() => setEditingCollection(collection)}
                    onDelete={() => handleDeleteCollection(collection.id)}
                    onShare={() => handleShareCollection(collection.id)}
                    onStudy={() => router.push(`/study/personal/${collection.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  단어장이 없습니다
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  새 단어장을 만들어 학습을 시작하세요.
                </p>
                <Button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-4"
                  disabled={quota && quota.limits.maxVocabularies !== -1 && quota.usage.vocabularyCount >= quota.limits.maxVocabularies}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  첫 단어장 만들기
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 업그레이드 안내 */}
        {quota && quota.plan === 'free' && (
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">더 많은 단어장이 필요하신가요?</h3>
                <p className="mt-1 text-sm text-gray-600">
                  프리미엄 플랜으로 업그레이드하면 최대 50개의 단어장과 10,000개의 단어를 저장할 수 있습니다.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => router.push('/pricing')}
              >
                업그레이드
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        isOfficial={false}
      />
    </div>
  )
}

// 컬렉션 카드 컴포넌트
function CollectionCard({ 
  collection, 
  onEdit, 
  onDelete,
  onShare,
  onStudy
}: { 
  collection: PersonalCollection
  onEdit: () => void
  onDelete: () => void
  onShare: () => void
  onStudy: () => void
}) {
  const studiedPercentage = collection.statistics 
    ? (collection.statistics.studied / collection.wordCount) * 100 
    : 0

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{collection.name}</h3>
          {collection.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{collection.description}</p>
          )}
        </div>
        <div className="ml-2">
          {collection.isPrivate ? (
            <Lock className="h-4 w-4 text-gray-400" />
          ) : (
            <Unlock className="h-4 w-4 text-green-600" />
          )}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">단어 수</span>
          <span className="font-medium">{collection.wordCount}개</span>
        </div>
        
        {collection.statistics && (
          <>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">학습 진도</span>
              <span className="font-medium">{collection.statistics.studied}/{collection.wordCount}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${studiedPercentage}%` }}
              />
            </div>
          </>
        )}
      </div>

      {collection.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
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

      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            title="수정"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={onShare}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            title="공유"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
            title="삭제"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        
        <Button
          size="sm"
          onClick={onStudy}
          className="flex items-center gap-1"
        >
          <TrendingUp className="h-3 w-3" />
          학습하기
        </Button>
      </div>
    </Card>
  )
}