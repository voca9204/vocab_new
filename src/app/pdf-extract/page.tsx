'use client'

import { VocabularyPDFUpload } from '@/components/pdf/vocabulary-pdf-upload'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import type { ExtractedVocabulary } from '@/types/extracted-vocabulary'
import { Button } from '@/components/ui'
import { ShieldAlert, ChevronLeft } from 'lucide-react'

export default function PDFExtractPage() {
  const { user, isAdmin, loading } = useAuth()
  const router = useRouter()
  const [extractedWords, setExtractedWords] = useState<ExtractedVocabulary[]>([])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleExtractionComplete = (words: ExtractedVocabulary[]) => {
    setExtractedWords(words)
    console.log('Extracted vocabulary:', words)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <ShieldAlert className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">관리자 전용 페이지</h1>
        <p className="text-gray-600 mb-8">
          이 페이지는 관리자만 접근할 수 있습니다.<br />
          단어 학습을 원하신다면 학습 페이지로 이동하세요.
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            대시보드로 돌아가기
          </Button>
          <Button onClick={() => router.push('/study')}>
            학습 시작하기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">단어장 PDF 업로드</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">단어장 PDF에서 단어 추출하기</h2>
          <p className="text-gray-600">
            단어장 형식의 PDF를 업로드하면 단어, 품사, 뜻, 예문을 자동으로 추출하여 데이터베이스에 저장합니다.
            저장된 단어들로 퀴즈, 플래시카드 등 다양한 방법으로 학습할 수 있습니다.
          </p>
        </div>

        <VocabularyPDFUpload onExtractComplete={handleExtractionComplete} />
      </div>

      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold mb-2">사용 방법:</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>PDF 파일을 선택하거나 드래그 앤 드롭하세요 (최대 20MB)</li>
          <li>'단어 추출 및 저장' 버튼을 클릭하세요</li>
          <li>PDF에서 모든 영어 단어를 추출합니다</li>
          <li>각 단어의 뜻, 품사, 예문을 자동으로 수집합니다</li>
          <li>SAT 단어는 자동으로 표시됩니다</li>
          <li>저장된 단어들로 퀴즈, 플래시카드 등 다양한 방법으로 학습할 수 있습니다</li>
        </ol>
      </div>

      {extractedWords.length > 0 && (
        <div className="mt-8 bg-green-50 rounded-lg p-6">
          <h3 className="font-semibold mb-2">추출 완료!</h3>
          <p className="text-gray-700">
            총 {extractedWords.length}개의 단어가 성공적으로 추출되어 단어장에 저장되었습니다.
          </p>
          <p className="text-gray-700 mt-1">
            이 중 {extractedWords.filter(w => w.isSAT).length}개가 SAT 단어입니다.
          </p>
        </div>
      )}
    </div>
  )
}