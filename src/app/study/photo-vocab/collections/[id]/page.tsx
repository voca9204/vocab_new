'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Book, Play, Settings, Eye, EyeOff, Calendar, Target, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/auth-provider'
import { photoVocabularyCollectionService } from '@/lib/api/photo-vocabulary-collection-service'
import type { PhotoVocabularyCollection, PhotoVocabularyWord } from '@/types/photo-vocabulary-collection'

export default function PhotoVocabCollectionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  
  const collectionId = params?.id as string
  const [collection, setCollection] = useState<PhotoVocabularyCollection | null>(null)
  const [words, setWords] = useState<PhotoVocabularyWord[]>([])
  const [loading, setLoading] = useState(true)
  const [showDefinitions, setShowDefinitions] = useState(false)

  useEffect(() => {
    if (user && collectionId) {
      loadCollectionData()
    }
  }, [user, collectionId])

  const loadCollectionData = async () => {
    try {
      setLoading(true)
      
      // Load collection and words in parallel
      const [collectionData, wordsData] = await Promise.all([
        photoVocabularyCollectionService.getCollection(collectionId),
        photoVocabularyCollectionService.getCollectionWords(collectionId)
      ])
      
      if (!collectionData) {
        router.push('/study/photo-vocab/collections')
        return
      }
      
      setCollection(collectionData)
      setWords(wordsData)
    } catch (error) {
      console.error('컬렉션 로드 실패:', error)
      router.push('/study/photo-vocab/collections')
    } finally {
      setLoading(false)
    }
  }

  const handleStartStudy = () => {
    // Navigate to flashcard study mode with collection words
    router.push(`/study/flashcards?source=photo-collection&collectionId=${collectionId}`)
  }

  const handleStartQuiz = () => {
    // Navigate to quiz mode with collection words
    router.push(`/study/quiz?source=photo-collection&collectionId=${collectionId}`)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getProgressStats = () => {
    const studiedWords = words.filter(w => w.studyStatus.studied).length
    const masteredWords = words.filter(w => w.studyStatus.masteryLevel >= 80).length
    const progressPercentage = words.length > 0 ? Math.round((studiedWords / words.length) * 100) : 0
    
    return {
      studiedWords,
      masteredWords,
      progressPercentage,
      totalWords: words.length
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

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-4">단어장을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>단어장을 찾을 수 없습니다.</p>
        <Button onClick={() => router.push('/study/photo-vocab/collections')} className="mt-4">
          목록으로 돌아가기
        </Button>
      </div>
    )
  }

  const stats = getProgressStats()

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push('/study/photo-vocab/collections')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{collection.title}</h1>
          <p className="text-gray-600 text-sm">
            {formatDate(new Date(collection.date))} • {collection.totalWords}개 단어
          </p>
        </div>
      </div>

      {/* Photo Preview */}
      {collection.photoUrl && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <img
              src={collection.photoUrl}
              alt={collection.title}
              className="w-full max-h-64 object-contain rounded-lg bg-gray-100"
              loading="lazy"
            />
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">총 단어</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.totalWords}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">학습 완료</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.studiedWords}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium">마스터</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.masteredWords}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium">진도율</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.progressPercentage}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>학습 진도</span>
              <span>{stats.studiedWords}/{stats.totalWords} ({stats.progressPercentage}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all"
                style={{ width: `${stats.progressPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <Button onClick={handleStartStudy} className="flex-1">
          <Book className="h-5 w-5 mr-2" />
          학습 시작
        </Button>
        <Button onClick={handleStartQuiz} variant="outline" className="flex-1">
          <Play className="h-5 w-5 mr-2" />
          퀴즈 모드
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowDefinitions(!showDefinitions)}
          title={showDefinitions ? '정의 숨기기' : '정의 보기'}
        >
          {showDefinitions ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {/* Tags and Category */}
      {(collection.category || collection.tags.length > 0) && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {collection.category && (
                <Badge variant="secondary">
                  {collection.category}
                </Badge>
              )}
              {collection.tags.map(tag => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Words List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            단어 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {words.map((word, index) => (
              <div
                key={word.id}
                className={`p-4 rounded-lg border ${
                  word.studyStatus.studied ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 font-mono">#{index + 1}</span>
                      <h3 className="text-lg font-semibold">{word.word}</h3>
                      {word.studyStatus.studied && (
                        <Badge variant="secondary" className="text-xs">
                          학습완료
                        </Badge>
                      )}
                      {word.studyStatus.masteryLevel >= 80 && (
                        <Badge variant="default" className="text-xs">
                          마스터
                        </Badge>
                      )}
                    </div>
                    
                    {showDefinitions && word.definition && (
                      <p className="text-gray-700 mt-2">{word.definition}</p>
                    )}
                    
                    {word.context && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        "{word.context}"
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right text-sm text-gray-500">
                    {word.studyStatus.masteryLevel > 0 && (
                      <div>숙련도: {word.studyStatus.masteryLevel}%</div>
                    )}
                    {word.studyStatus.reviewCount > 0 && (
                      <div>복습: {word.studyStatus.reviewCount}회</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}