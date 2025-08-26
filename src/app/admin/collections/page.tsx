'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { isAdmin } from '@/lib/auth/admin'
import { Plus, Edit2, Trash2, Users, BookOpen, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui'
import { Card } from '@/components/ui/card'
import { UploadModal } from '@/components/collections'
import type { OfficialCollection, PersonalCollection, OfficialCategory } from '@/types/collections'
import type { Word } from '@/types/vocabulary-v2'

// 카테고리 정보
const CATEGORIES: { 
  value: OfficialCategory
  label: string
  color: string 
}[] = [
  { value: 'SAT', label: 'SAT', color: 'bg-blue-100 text-blue-800' },
  { value: 'TOEFL', label: 'TOEFL', color: 'bg-green-100 text-green-800' },
  { value: 'TOEIC', label: 'TOEIC', color: 'bg-purple-100 text-purple-800' },
  { value: '수능', label: '수능', color: 'bg-red-100 text-red-800' },
  { value: 'GRE', label: 'GRE', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'IELTS', label: 'IELTS', color: 'bg-indigo-100 text-indigo-800' },
  { value: '기본', label: '기본', color: 'bg-gray-100 text-gray-800' },
]

export default function AdminCollectionsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<OfficialCategory | 'personal'>('SAT')
  const [officialCollections, setOfficialCollections] = useState<OfficialCollection[]>([])
  const [personalCollections, setPersonalCollections] = useState<PersonalCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState<OfficialCollection | null>(null)

  // 관리자 권한 확인
  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin(user.email)) {
        router.push('/')
      }
    }
  }, [user, authLoading, router])

  // 컬렉션 데이터 로드
  useEffect(() => {
    if (user && isAdmin(user.email)) {
      loadCollections()
    }
  }, [user, activeTab])

  const loadCollections = async () => {
    setLoading(true)
    try {
      const token = await user?.getIdToken()
      
      if (activeTab === 'personal') {
        // 개인 단어장 로드
        const response = await fetch('/api/collections/personal', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await response.json()
        if (data.success) {
          setPersonalCollections(data.collections)
        }
      } else {
        // 공식 단어장 로드
        const response = await fetch(`/api/collections/official?category=${activeTab}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await response.json()
        if (data.success) {
          setOfficialCollections(data.collections)
        }
      }
    } catch (error) {
      console.error('Error loading collections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCollection = async (collectionId: string, isOfficial: boolean) => {
    if (!confirm('정말로 이 단어장을 삭제하시겠습니까?')) return

    try {
      const token = await user?.getIdToken()
      const endpoint = isOfficial 
        ? `/api/collections/official/${collectionId}`
        : `/api/collections/personal/${collectionId}`
      
      const response = await fetch(endpoint, {
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

  const handleUpload = async (data: {
    name: string
    description?: string
    isPrivate: boolean
    tags: string[]
    words: Word[]
  }) => {
    try {
      const token = await user?.getIdToken()
      
      if (activeTab === 'personal') {
        // Upload personal collection
        const response = await fetch('/api/collections/personal', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create collection')
        }
      } else {
        // Upload official collection
        const response = await fetch('/api/collections/official', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            category: activeTab,
            name: data.name,
            displayName: data.name,
            description: data.description,
            difficulty: 'intermediate',
            words: data.words,
            metadata: {
              version: '1.0.0',
              tags: data.tags
            }
          })
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create collection')
        }
      }
      
      setShowUploadModal(false)
      loadCollections()
    } catch (error) {
      console.error('Error uploading collection:', error)
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

  if (!user || !isAdmin(user.email)) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">단어장 관리</h1>
          <p className="mt-2 text-gray-600">공식 단어장과 개인 단어장을 관리합니다.</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <BookOpen className="h-10 w-10 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">전체 단어장</p>
                <p className="text-2xl font-bold text-gray-900">
                  {officialCollections.length + personalCollections.length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center">
              <Users className="h-10 w-10 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">학습 중인 사용자</p>
                <p className="text-2xl font-bold text-gray-900">1,234</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-10 w-10 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">평균 완료율</p>
                <p className="text-2xl font-bold text-gray-900">67%</p>
              </div>
            </div>
          </Card>
        </div>

        {/* 탭 메뉴 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setActiveTab(category.value)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === category.value
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {category.label}
                </button>
              ))}
              <button
                onClick={() => setActiveTab('personal')}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === 'personal'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                개인 단어장
              </button>
            </nav>
          </div>

          {/* 액션 버튼 */}
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                {activeTab === 'personal' ? '개인 단어장' : `${activeTab} 단어장`}
              </h2>
              <Button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                새 단어장 추가
              </Button>
            </div>

            {/* 컬렉션 목록 */}
            <div className="grid gap-4">
              {activeTab === 'personal' ? (
                // 개인 단어장 목록
                personalCollections.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    isOfficial={false}
                    onEdit={() => {}}
                    onDelete={() => handleDeleteCollection(collection.id, false)}
                  />
                ))
              ) : (
                // 공식 단어장 목록
                officialCollections.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    isOfficial={true}
                    onEdit={() => setEditingCollection(collection)}
                    onDelete={() => handleDeleteCollection(collection.id, true)}
                  />
                ))
              )}

              {/* 빈 상태 */}
              {((activeTab === 'personal' && personalCollections.length === 0) ||
                (activeTab !== 'personal' && officialCollections.length === 0)) && (
                <div className="text-center py-12">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    단어장이 없습니다
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    새 단어장을 추가하여 시작하세요.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        isOfficial={activeTab !== 'personal'}
        category={activeTab !== 'personal' ? activeTab : undefined}
      />
    </div>
  )
}

// 컬렉션 카드 컴포넌트
function CollectionCard({ 
  collection, 
  isOfficial,
  onEdit, 
  onDelete 
}: { 
  collection: OfficialCollection | PersonalCollection
  isOfficial: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium text-gray-900">
            {isOfficial ? (collection as OfficialCollection).displayName : collection.name}
          </h3>
          {isOfficial && (
            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
              v{(collection as OfficialCollection).version}
            </span>
          )}
          <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">
            {collection.wordCount}개 단어
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {(collection as OfficialCollection).description || '설명 없음'}
        </p>
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span>생성일: {new Date(collection.createdAt).toLocaleDateString()}</span>
          <span>수정일: {new Date(collection.updatedAt).toLocaleDateString()}</span>
          {isOfficial && (collection as OfficialCollection).statistics && (
            <>
              <span>{(collection as OfficialCollection).statistics?.totalUsers || 0}명 학습 중</span>
              <span>평균 숙련도: {(collection as OfficialCollection).statistics?.avgMastery || 0}%</span>
            </>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="p-2"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}