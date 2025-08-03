'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { LoadingSpinner } from '@/components/ui'
import PDFVisionService from '@/lib/pdf/pdf-vision-service'
import VocabularyPDFService from '@/lib/vocabulary/vocabulary-pdf-service'
import { useAuth } from '@/components/providers/auth-provider'
import type { ExtractedVocabulary } from '@/types/extracted-vocabulary'

interface VocabularyPDFUploadProps {
  onExtractComplete?: (words: ExtractedVocabulary[]) => void
}

export function VocabularyPDFUpload({ onExtractComplete }: VocabularyPDFUploadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [extractedWords, setExtractedWords] = useState<ExtractedVocabulary[]>([])
  const [error, setError] = useState<string>('')
  const [progress, setProgress] = useState<string>('')
  const [isClearing, setIsClearing] = useState(false)
  const { user, isAdmin } = useAuth()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('PDF 파일만 업로드 가능합니다.')
        return
      }
      
      if (selectedFile.size > 20 * 1024 * 1024) {
        setError('파일 크기는 20MB 이하여야 합니다.')
        return
      }

      setFile(selectedFile)
      setError('')
    }
  }

  const handleExtract = async () => {
    if (!file || !user) return

    setIsLoading(true)
    setError('')
    setProgress('PDF 단어장 분석 중...')

    try {
      // 하이브리드 방식으로 직접 처리
      const vocabularyService = new VocabularyPDFService()
      const processedWords = await vocabularyService.processVocabularyPDFHybrid(
        file,
        user.uid,
        isAdmin // 관리자 여부 전달
      )

      setExtractedWords(processedWords)
      onExtractComplete?.(processedWords)

      setProgress('')
      console.log(`${processedWords.length}개의 단어가 추출되어 저장되었습니다.`)
    } catch (err) {
      setError('PDF 처리 중 오류가 발생했습니다.')
      console.error('PDF extraction error:', err)
    } finally {
      setIsLoading(false)
      setProgress('')
    }
  }
  
  const handleClearDatabase = async () => {
    if (!user || !confirm('정말로 모든 단어를 삭제하시겠습니까?')) return
    
    setIsClearing(true)
    setError('')
    
    try {
      const response = await fetch(`/api/clear-vocabulary?userId=${user.uid}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to clear database')
      
      const result = await response.json()
      alert(`${result.deletedCount}개의 단어가 삭제되었습니다.`)
      setExtractedWords([])
    } catch (err) {
      setError('데이터베이스 초기화 중 오류가 발생했습니다.')
      console.error('Clear database error:', err)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            id="pdf-upload"
          />
          
          <label htmlFor="pdf-upload" className="cursor-pointer">
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-semibold text-blue-600 hover:text-blue-500">
                단어장 PDF 선택
              </span>
              {' '}또는 드래그 앤 드롭
            </p>
            <p className="text-xs text-gray-500">최대 20MB</p>
          </label>

          {file && (
            <p className="mt-2 text-sm text-gray-900">
              선택된 파일: {file.name}
            </p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">단어장 형식:</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p className="font-mono bg-white p-2 rounded">
            번호/단어/품사/예문/뜻
          </p>
          <p className="mt-2">예시:</p>
          <p className="font-mono bg-white p-2 rounded text-xs">
            1/abandon/v./They decided to abandon the project./버리다, 포기하다
          </p>
          <p className="font-mono bg-white p-2 rounded text-xs">
            2/aberration/n./His behavior was an aberration./일탈, 정신이상
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {progress && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
          {progress}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleExtract}
          disabled={!file || isLoading || !user}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <LoadingSpinner className="mr-2" />
              처리 중...
            </>
          ) : (
            '단어장 추출 및 저장'
          )}
        </Button>
        
        <Button
          onClick={handleClearDatabase}
          disabled={isClearing || isLoading}
          variant="outline"
          className="px-4"
        >
          {isClearing ? (
            <LoadingSpinner className="mr-2" />
          ) : (
            '🗑️'
          )}
          DB 초기화
        </Button>
      </div>

      {extractedWords.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold">
            추출된 단어 ({extractedWords.length}개)
          </h3>
          
          <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-4">
            {extractedWords.map((word) => (
              <div
                key={word.id}
                className="p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-lg">{word.word}</h4>
                      <span className="text-sm text-gray-500">({word.partOfSpeech.join(', ')})</span>
                      {word.isSAT && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          SAT
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 mt-1">{word.definition}</p>
                    {word.examples.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1 italic">
                        예: {word.examples[0]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <Button 
              variant="outline"
              onClick={() => {
                // TODO: 단어장 페이지로 이동
                console.log('Go to vocabulary list')
              }}
            >
              내 단어장으로 이동
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VocabularyPDFUpload