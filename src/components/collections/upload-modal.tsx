'use client'

import { useState, useCallback } from 'react'
import { X, Upload, FileText, Image, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import type { Word } from '@/types/vocabulary-v2'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (data: {
    name: string
    description?: string
    isPrivate: boolean
    tags: string[]
    words: Word[]
  }) => Promise<void>
  isOfficial?: boolean
  category?: string
}

export function UploadModal({ 
  isOpen, 
  onClose, 
  onUpload,
  isOfficial = false,
  category
}: UploadModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<'upload' | 'details' | 'preview'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [extractedWords, setExtractedWords] = useState<Word[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFile = async (file: File) => {
    setError(null)
    
    // 파일 타입 확인
    const validTypes = ['application/pdf', 'text/plain', 'text/csv', 'image/jpeg', 'image/png']
    if (!validTypes.includes(file.type)) {
      setError('지원하지 않는 파일 형식입니다. PDF, TXT, CSV, JPG, PNG 파일만 가능합니다.')
      return
    }

    // 파일 크기 확인 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('파일 크기가 너무 큽니다. 10MB 이하의 파일만 업로드 가능합니다.')
      return
    }

    setFile(file)
    setLoading(true)

    try {
      // 파일 타입에 따라 다른 API 호출
      const isImage = file.type.startsWith('image/')
      let apiUrl = '/api/extract-words-working'
      
      if (isImage) {
        // 이미지는 photo-vocabulary API 사용
        apiUrl = '/api/photo-vocabulary/upload-image'
      }
      
      const formData = new FormData()
      
      if (isImage) {
        // 이미지 API에 필요한 추가 데이터
        formData.append('image', file)
        formData.append('userId', user?.uid || '')
        formData.append('collectionId', `temp-${Date.now()}`)
        formData.append('collectionName', 'Temporary Collection')
      } else {
        // PDF/텍스트 파일
        formData.append('file', file)
      }
      
      console.log('🚀 API 호출 시작:', {
        url: apiUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        isImage
      })

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
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
          throw new Error(errorData.error || '파일 처리 중 오류가 발생했습니다.')
        } catch (parseError) {
          throw new Error(`API 오류 (${response.status}): ${errorText}`)
        }
      }

      const data = await response.json()
      
      // 이미지 API와 PDF/텍스트 API의 응답 형식이 다름
      let words = []
      if (isImage) {
        // 이미지 API는 words 필드에 추출된 단어들이 있음
        words = data.words || []
        console.log('✅ 이미지에서 추출 성공:', {
          success: data.success,
          wordsCount: words.length,
          imageUrl: data.imageUrl,
          message: data.message
        })
      } else {
        // PDF/텍스트 API는 words 필드에 있음
        words = data.words || []
        console.log('✅ 파일에서 추출 성공:', {
          success: data.success,
          wordsCount: words.length,
          method: data.method,
          message: data.message
        })
      }
      
      console.log('📝 처음 5개 단어:', words.slice(0, 5))
      
      if (!words || words.length === 0) {
        throw new Error('파일에서 단어를 추출할 수 없습니다. 파일 형식을 확인해주세요.')
      }
      
      setExtractedWords(words)
      setStep('details')
    } catch (err) {
      console.error('File processing error:', err)
      setError(err instanceof Error ? err.message : '파일 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleManualInput = () => {
    setStep('details')
    setExtractedWords([])
  }

  const handleSubmit = async () => {
    if (!name) {
      setError('단어장 이름을 입력해주세요.')
      return
    }

    if (extractedWords.length === 0) {
      setError('최소 1개 이상의 단어가 필요합니다.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const uploadData = {
        name,
        description,
        isPrivate,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        words: extractedWords
      }
      
      console.log('📤 컬렉션 업로드 시작:', {
        name: uploadData.name,
        wordsCount: uploadData.words.length,
        isPrivate: uploadData.isPrivate,
        tags: uploadData.tags
      })
      
      await onUpload(uploadData)
      
      console.log('✅ 컬렉션 업로드 완료')
      
      // 초기화
      setStep('upload')
      setFile(null)
      setExtractedWords([])
      setName('')
      setDescription('')
      setIsPrivate(true)
      setTags('')
      onClose()
    } catch (err) {
      console.error('❌ 컬렉션 업로드 실패:', err)
      setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* 헤더 */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {isOfficial ? `새 ${category} 단어장 만들기` : '새 개인 단어장 만들기'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Step 1: 파일 업로드 */}
            {step === 'upload' && (
              <div className="space-y-6">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    파일을 드래그하거나 클릭하여 업로드하세요
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, TXT, CSV, JPG, PNG (최대 10MB)
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.csv,.jpg,.jpeg,.png"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    파일 선택
                  </label>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">또는</span>
                  </div>
                </div>

                <Button
                  onClick={handleManualInput}
                  variant="outline"
                  className="w-full"
                >
                  직접 입력하기
                </Button>
              </div>
            )}

            {/* Step 2: 상세 정보 입력 */}
            {step === 'details' && (
              <div className="space-y-4">
                {/* 추출된 단어 수 표시 */}
                {extractedWords.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      ✅ {extractedWords.length}개의 단어가 추출되었습니다.
                    </p>
                  </div>
                )}
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    단어장 이름 *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="예: SAT 필수 단어 1000"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    설명
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="단어장에 대한 설명을 입력하세요"
                  />
                </div>

                {!isOfficial && (
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!isPrivate}
                        onChange={(e) => setIsPrivate(!e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        다른 사용자와 공유 (공개 단어장)
                      </span>
                    </label>
                  </div>
                )}

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                    태그 (쉼표로 구분)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="예: SAT, 필수, 2024"
                  />
                </div>

                {extractedWords.length === 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      단어 입력
                    </label>
                    <WordEditor
                      words={extractedWords}
                      onChange={setExtractedWords}
                    />
                  </div>
                )}

                {extractedWords.length > 0 && (
                  <Card className="p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        추출된 단어
                      </span>
                      <span className="text-sm text-gray-500">
                        {extractedWords.length}개
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        {extractedWords.slice(0, 20).map((word, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs bg-white rounded-md border border-gray-200">
                            {word.word}
                          </span>
                        ))}
                        {extractedWords.length > 20 && (
                          <span className="px-2 py-1 text-xs text-gray-500">
                            +{extractedWords.length - 20}개 더...
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStep('preview')}
                      className="mt-2"
                    >
                      전체 보기 및 수정
                    </Button>
                  </Card>
                )}
              </div>
            )}

            {/* Step 3: 미리보기 및 수정 */}
            {step === 'preview' && (
              <div>
                <WordEditor
                  words={extractedWords}
                  onChange={setExtractedWords}
                  fullView
                />
                <Button
                  variant="outline"
                  onClick={() => setStep('details')}
                  className="mt-4"
                >
                  돌아가기
                </Button>
              </div>
            )}
          </div>

          {/* 하단 버튼 */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {step === 'details' && (
              <>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !name.trim() || extractedWords.length === 0}
                  className="w-full sm:ml-3 sm:w-auto"
                >
                  {loading ? '업로드 중...' : 
                   !name.trim() ? '단어장 이름을 입력하세요' :
                   extractedWords.length === 0 ? '단어가 없습니다' :
                   '단어장 만들기'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep('upload')}
                  disabled={loading}
                  className="mt-3 w-full sm:mt-0 sm:w-auto"
                >
                  이전
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="mt-3 w-full sm:mt-0 sm:w-auto"
            >
              취소
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 단어 편집기 컴포넌트
function WordEditor({ 
  words, 
  onChange,
  fullView = false
}: { 
  words: Word[]
  onChange: (words: Word[]) => void
  fullView?: boolean
}) {
  const [newWord, setNewWord] = useState('')
  const [newDefinition, setNewDefinition] = useState('')

  const handleAdd = () => {
    if (newWord && newDefinition) {
      onChange([...words, { 
        word: newWord.toLowerCase(), 
        definition: newDefinition 
      }])
      setNewWord('')
      setNewDefinition('')
    }
  }

  const handleRemove = (index: number) => {
    onChange(words.filter((_, i) => i !== index))
  }

  return (
    <div className={fullView ? 'space-y-4' : 'space-y-2'}>
      <div className="flex gap-2">
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          placeholder="단어"
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
        <input
          type="text"
          value={newDefinition}
          onChange={(e) => setNewDefinition(e.target.value)}
          placeholder="정의"
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!newWord || !newDefinition}
        >
          추가
        </Button>
      </div>

      {words.length > 0 && (
        <div className={`border rounded-lg overflow-hidden ${fullView ? 'max-h-96' : 'max-h-48'} overflow-y-auto`}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  단어
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  정의
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  삭제
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {words.map((word, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {word.word}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {word.definition}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleRemove(idx)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}