'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { LoadingSpinner } from '@/components/ui'
import PDFVisionService from '@/lib/pdf/pdf-vision-service'
import VocabularyPDFService from '@/lib/vocabulary/vocabulary-pdf-service'
import VocabularyPDFServiceV2 from '@/lib/vocabulary/vocabulary-pdf-service-v2'
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
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [existingWords, setExistingWords] = useState<Set<string>>(new Set())
  const [saveResult, setSaveResult] = useState<{saved: number, skipped: number, failed: number} | null>(null)
  const [collectionType, setCollectionType] = useState<'SAT' | 'SUNEUNG' | 'TOEFL' | 'GENERAL'>('GENERAL')
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
    setSaveResult(null)

    try {
      // PDF에서 단어만 추출 (저장하지 않음)
      const vocabularyService = new VocabularyPDFServiceV2()
      const extractedFromPDF = await vocabularyService.extractWordsFromPDF(file, collectionType)
      
      // 기존 DB에서 중복 확인
      setProgress('중복 단어 확인 중...')
      const existingWordsList = await vocabularyService.checkExistingWords(
        extractedFromPDF.map(w => w.word)
      )
      setExistingWords(new Set(existingWordsList))
      
      // 추출된 단어 표시 (아직 저장하지 않음)
      setExtractedWords(extractedFromPDF)
      
      // 기본적으로 중복되지 않은 단어만 선택
      const newWords = extractedFromPDF.filter(w => !existingWordsList.includes(w.word))
      setSelectedWords(new Set(newWords.map(w => w.word)))
      
      setProgress('')
      console.log(`${extractedFromPDF.length}개의 단어가 추출되었습니다. (중복: ${existingWordsList.length}개)`)
    } catch (err) {
      setError('PDF 처리 중 오류가 발생했습니다.')
      console.error('PDF extraction error:', err)
    } finally {
      setIsLoading(false)
      setProgress('')
    }
  }
  
  const handleWordToggle = (word: string) => {
    if (existingWords.has(word)) return // 이미 등록된 단어는 선택 불가
    
    const newSelected = new Set(selectedWords)
    if (newSelected.has(word)) {
      newSelected.delete(word)
    } else {
      newSelected.add(word)
    }
    setSelectedWords(newSelected)
  }

  const handleSaveSelected = async () => {
    if (!user || selectedWords.size === 0) return
    
    setIsSaving(true)
    setError('')
    setSaveResult(null)
    
    try {
      // 선택된 단어만 필터링
      const wordsToSave = extractedWords.filter(w => selectedWords.has(w.word))
      
      // 서비스를 통해 저장
      const vocabularyService = new VocabularyPDFServiceV2()
      const result = await vocabularyService.saveSelectedWords(
        wordsToSave,
        user.uid,
        isAdmin,
        collectionType
      )
      
      setSaveResult(result)
      onExtractComplete?.(wordsToSave)
      
      // 성공적으로 저장된 단어들을 선택 해제
      const savedWords = wordsToSave.filter(w => !existingWords.has(w.word))
      const newSelected = new Set(selectedWords)
      savedWords.forEach(w => newSelected.delete(w.word))
      setSelectedWords(newSelected)
      
      // 중복 목록 업데이트
      const newExisting = new Set(existingWords)
      savedWords.forEach(w => newExisting.add(w.word))
      setExistingWords(newExisting)
      
    } catch (err) {
      setError('단어 저장 중 오류가 발생했습니다.')
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
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
        <h4 className="font-semibold text-blue-900 mb-2">📚 새로운 단어장 시스템</h4>
        <div className="text-sm text-blue-800 space-y-2">
          <p className="flex items-start gap-2">
            <span className="text-green-600">✅</span>
            <span><strong>전체 단어 DB 통합:</strong> 추출된 단어가 전체 단어 데이터베이스에 추가되어 더 풍부한 학습 경험 제공</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-green-600">✅</span>
            <span><strong>개인 단어장 자동 생성:</strong> "내가 추가한 단어" 컬렉션이 자동으로 생성되어 체계적인 관리 가능</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-green-600">✅</span>
            <span><strong>중복 방지:</strong> 이미 존재하는 단어는 기존 정보를 활용하여 데이터 일관성 유지</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-green-600">✅</span>
            <span><strong>개인정보 보호:</strong> 개인 단어장은 본인만 접근 가능</span>
          </p>
          {isAdmin && (
            <div className="mt-3 space-y-3">
              <p className="flex items-start gap-2 bg-yellow-50 p-2 rounded">
                <span className="text-yellow-600">👑</span>
                <span><strong>관리자 모드:</strong> 업로드한 단어는 선택한 공식 단어장에 추가되어 모든 사용자가 이용 가능합니다</span>
              </p>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">단어장 타입:</label>
                <select
                  value={collectionType}
                  onChange={(e) => setCollectionType(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="SAT">SAT 공식 단어장</option>
                  <option value="SUNEUNG">수능 공식 단어장</option>
                  <option value="TOEFL">TOEFL 공식 단어장</option>
                  <option value="GENERAL">일반 공식 단어장</option>
                </select>
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-xs text-blue-700">
            지원 형식: 단어 + 한글뜻, 표 형식, V.ZIP 형식, 수능 기출 형식 등
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
          '단어 추출하기'
        )}
      </Button>

      {extractedWords.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              추출된 단어 ({extractedWords.length}개)
            </h3>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                선택: {selectedWords.size}개 / 중복: {existingWords.size}개
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // 중복되지 않은 단어만 선택
                    const newWords = extractedWords.filter(w => !existingWords.has(w.word))
                    setSelectedWords(new Set(newWords.map(w => w.word)))
                  }}
                >
                  새 단어만 선택
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // 전체 선택/해제
                    if (selectedWords.size === extractedWords.length) {
                      setSelectedWords(new Set())
                    } else {
                      setSelectedWords(new Set(extractedWords.map(w => w.word)))
                    }
                  }}
                >
                  {selectedWords.size === extractedWords.length ? '전체 해제' : '전체 선택'}
                </Button>
              </div>
            </div>
          </div>
          
          {saveResult && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              저장 완료! 성공: {saveResult.saved}개, 중복: {saveResult.skipped}개, 실패: {saveResult.failed}개
            </div>
          )}
          
          <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-4">
            {extractedWords.map((word) => (
              <div
                key={word.word}
                className={`p-3 bg-white border rounded-lg transition-all cursor-pointer ${
                  selectedWords.has(word.word) 
                    ? 'border-blue-500 bg-blue-50' 
                    : existingWords.has(word.word)
                    ? 'border-gray-300 bg-gray-50 opacity-60'
                    : 'hover:shadow-sm'
                }`}
                onClick={() => handleWordToggle(word.word)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedWords.has(word.word)}
                      onChange={() => handleWordToggle(word.word)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                      disabled={existingWords.has(word.word)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-lg">{word.word}</h4>
                        <span className="text-sm text-gray-500">({word.partOfSpeech.join(', ')})</span>
                        {word.isSAT && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            SAT
                          </span>
                        )}
                        {existingWords.has(word.word) && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            이미 등록됨
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
              </div>
            ))}
          </div>
          
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={handleSaveSelected}
              disabled={selectedWords.size === 0 || isSaving}
              className="min-w-[200px]"
            >
              {isSaving ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  저장 중...
                </>
              ) : (
                `선택한 단어 저장 (${selectedWords.size}개)`
              )}
            </Button>
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