'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { LoadingSpinner } from '@/components/ui'
import PDFVisionService from '@/lib/pdf/pdf-vision-service'
import ExtractedVocabularyService from '@/lib/vocabulary/extracted-vocabulary-service'
import { useAuth } from '@/hooks/use-auth'
import type { ExtractedVocabulary } from '@/types/extracted-vocabulary'

interface PDFUploadWithExtractionProps {
  onExtractComplete?: (words: ExtractedVocabulary[]) => void
}

export function PDFUploadWithExtraction({ onExtractComplete }: PDFUploadWithExtractionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [extractedWords, setExtractedWords] = useState<ExtractedVocabulary[]>([])
  const [error, setError] = useState<string>('')
  const [progress, setProgress] = useState<string>('')
  const { user } = useAuth()

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
    setProgress('PDF에서 텍스트 추출 중...')

    try {
      // 1. PDF에서 텍스트 추출
      const pdfService = new PDFVisionService()
      const result = file.size > 5 * 1024 * 1024 
        ? await pdfService.extractTextFromLargePDF(file, 20)
        : await pdfService.extractTextFromPDF(file)

      setProgress(`${result.allWords.length}개 단어 추출 완료. 사전 정보 수집 중...`)

      // 2. 추출된 단어들을 처리하고 DB에 저장
      const vocabularyService = new ExtractedVocabularyService()
      const processedWords = await vocabularyService.processExtractedWords(
        result.allWords,
        user.uid,
        { filename: file.name }
      )

      setExtractedWords(processedWords)
      onExtractComplete?.(processedWords)

      setProgress('')
      console.log(`총 ${result.allWords.length}개 단어 중 ${processedWords.length}개 처리 완료`)
    } catch (err) {
      setError('PDF 처리 중 오류가 발생했습니다.')
      console.error('PDF extraction error:', err)
    } finally {
      setIsLoading(false)
      setProgress('')
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
                PDF 파일 선택
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

      <Button
        onClick={handleExtract}
        disabled={!file || isLoading || !user}
        className="w-full"
      >
        {isLoading ? (
          <>
            <LoadingSpinner className="mr-2" />
            처리 중...
          </>
        ) : (
          '단어 추출 및 저장'
        )}
      </Button>

      {extractedWords.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold">
            추출된 단어 ({extractedWords.length}개)
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {extractedWords.slice(0, 12).map((word) => (
              <div
                key={word.id}
                className="p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <h4 className="text-lg font-medium">{word.word}</h4>
                  {word.isSAT && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      SAT
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-500 mt-1">
                  {word.partOfSpeech.join(', ')}
                </p>
                
                <p className="text-sm mt-2 line-clamp-2">
                  {word.definition}
                </p>
                
                {word.examples.length > 0 && (
                  <p className="text-xs text-gray-600 mt-2 italic line-clamp-1">
                    예: {word.examples[0]}
                  </p>
                )}
                
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500">
                    난이도: {word.difficulty}/10
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // TODO: 학습 페이지로 이동
                      console.log('Study word:', word.id)
                    }}
                  >
                    학습하기
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {extractedWords.length > 12 && (
            <div className="text-center">
              <Button variant="outline">
                모든 단어 보기 ({extractedWords.length}개)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PDFUploadWithExtraction