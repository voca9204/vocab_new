'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PhotoUpload } from '@/components/photo-vocabulary/photo-upload'
import { WordReviewList } from '@/components/photo-vocabulary/word-review-list'
import { useAuth } from '@/components/providers/auth-provider'
import { photoVocabularyCollectionService } from '@/lib/api/photo-vocabulary-collection-service'
import type { ExtractedWord } from '@/types/photo-vocabulary'

export default function PhotoVocabPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [extractedWords, setExtractedWords] = useState<ExtractedWord[]>([])
  const [isCreatingSession, setIsCreatingSession] = useState(false)

  const handleUploadComplete = (newSessionId: string, words: ExtractedWord[]) => {
    setSessionId(newSessionId)
    setExtractedWords(words)
  }

  const handleWordEdit = (index: number, newWord: string) => {
    const updated = [...extractedWords]
    updated[index] = { ...updated[index], word: newWord }
    setExtractedWords(updated)
  }

  const handleWordRemove = (index: number) => {
    setExtractedWords(extractedWords.filter((_, i) => i !== index))
  }

  const createPhotoSession = async (selectedWords: ExtractedWord[]) => {
    if (!sessionId) return

    setIsCreatingSession(true)
    
    // Navigate to test page
    router.push(`/study/photo-test/${sessionId}`)
  }

  const saveToCollection = async (selectedWords: ExtractedWord[], title?: string) => {
    if (!sessionId || !user) return

    setIsCreatingSession(true)
    
    try {
      const collection = await photoVocabularyCollectionService.convertSessionToCollection(
        sessionId,
        user.uid,
        title || `사진 단어장 ${new Date().toLocaleDateString()}`,
        '기타', // default category
        [] // default tags
      )
      
      // Navigate to the new collection
      router.push(`/study/photo-vocab/collections/${collection.id}`)
    } catch (error) {
      console.error('컬렉션 저장 실패:', error)
      setIsCreatingSession(false)
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
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/study')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Camera className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">사진 단어 학습</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/study/photo-vocab/collections')}
        >
          <BookOpen className="h-4 w-4 mr-2" />
          내 단어장
        </Button>
      </div>

      <div className="space-y-8">
        {/* Step 1: Upload */}
        {!extractedWords.length && (
          <div>
            <h2 className="text-lg font-semibold mb-4">1단계: 사진 업로드</h2>
            <PhotoUpload onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {/* Step 2: Review extracted words */}
        {extractedWords.length > 0 && sessionId && (
          <div>
            <h2 className="text-lg font-semibold mb-4">2단계: 단어 검토</h2>
            <WordReviewList
              words={extractedWords}
              onConfirm={createPhotoSession}
              onSaveToCollection={saveToCollection}
              onEdit={handleWordEdit}
              onRemove={handleWordRemove}
              loading={isCreatingSession}
            />
          </div>
        )}

        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
            <p>Debug Info:</p>
            <p>Session ID: {sessionId || 'null'}</p>
            <p>Extracted Words Count: {extractedWords.length}</p>
            <p>Words: {JSON.stringify(extractedWords, null, 2).substring(0, 200)}...</p>
          </div>
        )}

      </div>

      {/* Instructions */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold mb-3">사용 방법</h3>
        <ol className="space-y-2 text-sm text-gray-600">
          <li>1. 교재, 강의 슬라이드, 기사 등의 사진을 촬영하거나 업로드합니다.</li>
          <li>2. AI가 자동으로 중요한 단어들을 추출합니다.</li>
          <li>3. 추출된 단어를 검토하고 필요시 수정합니다.</li>
          <li>4. 선택한 단어들로 즉시 테스트를 시작합니다.</li>
        </ol>
        <p className="mt-4 text-xs text-gray-500">
          * 세션은 48시간 동안 유지되며, 이후 자동으로 삭제됩니다.
        </p>
        
      </div>
    </div>
  )
}