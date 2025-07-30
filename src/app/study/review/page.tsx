'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ChevronLeft,
  Clock,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  X,
  Check
} from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore'
import type { ExtractedVocabulary } from '@/types/extracted-vocabulary'
import { getSelectedSources, filterWordsBySelectedSources } from '@/lib/settings/get-selected-sources'
import { createVocabularyQuery } from '@/lib/vocabulary/vocabulary-query-utils'

export default function ReviewPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [words, setWords] = useState<ExtractedVocabulary[]>([])
  const [reviewWords, setReviewWords] = useState<ExtractedVocabulary[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reviewType, setReviewType] = useState<'difficult' | 'scheduled'>('difficult')

  useEffect(() => {
    if (user) {
      loadWords()
    }
  }, [user, reviewType])

  const loadWords = async () => {
    if (!user) return

    try {
      // 사용자의 단어와 관리자가 업로드한 단어 모두 가져오기
      const q = createVocabularyQuery('extracted_vocabulary', user.uid)
      
      const snapshot = await getDocs(q)
      let wordsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        source: {
          ...doc.data().source,
          uploadedAt: doc.data().source?.uploadedAt?.toDate() || new Date()
        }
      })) as ExtractedVocabulary[]
      
      // Firestore에서 선택된 단어장 가져오기
      const selectedSources = await getSelectedSources(user.uid)
      wordsData = filterWordsBySelectedSources(wordsData, selectedSources)
      
      setWords(wordsData)
      
      // 복습할 단어 필터링
      let toReview: ExtractedVocabulary[] = []
      
      if (reviewType === 'difficult') {
        // 어려운 단어 (숙련도 50% 미만)
        toReview = wordsData.filter(w => 
          w.studyStatus.studied && w.studyStatus.masteryLevel < 50
        )
      } else {
        // 복습 예정 단어 (마지막 학습 후 일정 시간 경과)
        const now = new Date()
        toReview = wordsData.filter(w => {
          if (!w.studyStatus.studied || !w.studyStatus.lastStudied) return false
          
          const lastStudied = w.studyStatus.lastStudied instanceof Date 
            ? w.studyStatus.lastStudied 
            : (w.studyStatus.lastStudied as any).toDate()
          
          const daysSince = (now.getTime() - lastStudied.getTime()) / (1000 * 60 * 60 * 24)
          
          // 숙련도에 따라 복습 주기 결정
          const reviewInterval = w.studyStatus.masteryLevel >= 80 ? 7 :
                               w.studyStatus.masteryLevel >= 60 ? 3 :
                               w.studyStatus.masteryLevel >= 40 ? 2 : 1
          
          return daysSince >= reviewInterval
        })
      }
      
      // 난이도순으로 정렬 (어려운 것부터)
      toReview.sort((a, b) => a.studyStatus.masteryLevel - b.studyStatus.masteryLevel)
      
      setReviewWords(toReview)
      setCurrentIndex(0)
      setShowAnswer(false)
    } catch (error) {
      console.error('Error loading words:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsReviewed = async (remembered: boolean) => {
    const currentWord = reviewWords[currentIndex]
    if (!currentWord || !currentWord.id) return

    try {
      const wordRef = doc(db, 'extracted_vocabulary', currentWord.id)
      const increment = remembered ? 10 : -5
      const newMasteryLevel = Math.max(0, Math.min(100, 
        currentWord.studyStatus.masteryLevel + increment
      ))
      
      await updateDoc(wordRef, {
        'studyStatus.masteryLevel': newMasteryLevel,
        'studyStatus.reviewCount': currentWord.studyStatus.reviewCount + 1,
        'studyStatus.lastStudied': Timestamp.now(),
        updatedAt: Timestamp.now()
      })

      // 다음 단어로
      if (currentIndex < reviewWords.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setShowAnswer(false)
      } else {
        // 복습 완료
        alert('복습을 완료했습니다!')
        router.push('/study')
      }
    } catch (error) {
      console.error('Error updating word:', error)
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
      <div className="container mx-auto py-8 px-4 text-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  const currentWord = reviewWords[currentIndex]

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/study')}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            돌아가기
          </Button>
          <h1 className="text-2xl font-bold">스마트 복습</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant={reviewType === 'difficult' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setReviewType('difficult')}
          >
            어려운 단어
          </Button>
          <Button
            variant={reviewType === 'scheduled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setReviewType('scheduled')}
          >
            복습 예정
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">복습할 단어</p>
                <p className="text-2xl font-bold">{reviewWords.length}개</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">진행률</p>
                <p className="text-2xl font-bold">
                  {reviewWords.length > 0 
                    ? Math.round(((currentIndex + 1) / reviewWords.length) * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">평균 숙련도</p>
                <p className="text-2xl font-bold">
                  {reviewWords.length > 0
                    ? Math.round(reviewWords.reduce((sum, w) => sum + w.studyStatus.masteryLevel, 0) / reviewWords.length)
                    : 0}%
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 복습 카드 */}
      {reviewWords.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">
              {reviewType === 'difficult' 
                ? '어려운 단어가 없습니다. 계속 학습해보세요!' 
                : '복습할 단어가 없습니다. 나중에 다시 확인해주세요!'}
            </p>
          </CardContent>
        </Card>
      ) : currentWord ? (
        <>
          <Card className="mb-6">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-sm text-gray-500">
                    {currentIndex + 1} / {reviewWords.length}
                  </span>
                  <span className="text-sm px-2 py-1 bg-orange-100 text-orange-800 rounded">
                    숙련도 {currentWord.studyStatus.masteryLevel}%
                  </span>
                </div>
                
                <h2 className="text-3xl font-bold mb-4">{currentWord.word}</h2>
                
                <div className="flex justify-center gap-2 mb-6">
                  {currentWord.partOfSpeech.map(pos => (
                    <span 
                      key={pos}
                      className="text-sm px-3 py-1 rounded bg-gray-100 text-gray-700"
                    >
                      {pos}
                    </span>
                  ))}
                </div>
                
                {showAnswer ? (
                  <div className="space-y-4 animate-fade-in">
                    <p className="text-xl text-gray-800">{currentWord.definition}</p>
                    {currentWord.etymology && (
                      <p className="text-lg text-gray-600">{currentWord.etymology}</p>
                    )}
                    {currentWord.examples && currentWord.examples.length > 0 && (
                      <div className="text-left max-w-xl mx-auto mt-6">
                        <p className="text-sm font-semibold text-gray-700 mb-2">예문:</p>
                        {currentWord.examples.map((example, idx) => (
                          <p key={idx} className="text-gray-600 mb-1">
                            • {example}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Button onClick={() => setShowAnswer(true)} size="lg">
                    답 보기
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          {showAnswer && (
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => markAsReviewed(false)}
              >
                <X className="h-4 w-4 mr-2 text-red-600" />
                잘 모르겠어요
              </Button>
              <Button
                className="flex-1"
                onClick={() => markAsReviewed(true)}
              >
                <Check className="h-4 w-4 mr-2 text-green-600" />
                기억해요
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}