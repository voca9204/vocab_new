'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { LoadingSpinner } from '@/components/ui'
import PDFVisionService from '@/lib/pdf/pdf-vision-service'
import type { PDFExtractionResult } from '@/lib/pdf/pdf-vision-service'

interface PDFUploadProps {
  onExtract?: (satWords: string[]) => void
}

export function PDFUpload({ onExtract }: PDFUploadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [extractedWords, setExtractedWords] = useState<string[]>([])
  const [error, setError] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('PDF 파일만 업로드 가능합니다.')
        return
      }
      
      // 파일 크기 제한 (20MB)
      if (selectedFile.size > 20 * 1024 * 1024) {
        setError('파일 크기는 20MB 이하여야 합니다.')
        return
      }

      setFile(selectedFile)
      setError('')
    }
  }

  const handleExtract = async () => {
    if (!file) return

    setIsLoading(true)
    setError('')

    try {
      const pdfService = new PDFVisionService()
      
      // 파일 크기에 따라 처리 방법 선택
      const result = file.size > 5 * 1024 * 1024 
        ? await pdfService.extractTextFromLargePDF(file, 10) // 5MB 이상은 페이지별 처리
        : await pdfService.extractTextFromPDF(file)

      setExtractedWords(result.satWords)
      onExtract?.(result.satWords)

      // 추출 통계 표시
      console.log(`총 ${result.words.length}개 단어 중 ${result.satWords.length}개의 SAT 단어 발견`)
    } catch (err) {
      setError('PDF 처리 중 오류가 발생했습니다.')
      console.error('PDF extraction error:', err)
    } finally {
      setIsLoading(false)
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

      <Button
        onClick={handleExtract}
        disabled={!file || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <LoadingSpinner className="mr-2" />
            처리 중...
          </>
        ) : (
          'SAT 단어 추출'
        )}
      </Button>

      {extractedWords.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">
            추출된 SAT 단어 ({extractedWords.length}개)
          </h3>
          <div className="flex flex-wrap gap-2">
            {extractedWords.map((word, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default PDFUpload