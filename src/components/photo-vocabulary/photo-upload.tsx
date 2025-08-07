'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, Loader2, Eye, Brain, CameraIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/components/providers/auth-provider'
import { photoVocabularyService } from '@/lib/api/photo-vocabulary-service'
import type { ExtractedWord } from '@/types/photo-vocabulary'

interface PhotoUploadProps {
  onUploadComplete: (sessionId: string, words: ExtractedWord[]) => void
  maxWords?: number
}

export function PhotoUpload({ onUploadComplete, maxWords = 30 }: PhotoUploadProps) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [extractionMethod, setExtractionMethod] = useState<'openai' | 'google'>('google')

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    setError(null)
    setPreview(URL.createObjectURL(file))
    await processPhoto(file)
  }, [])

  const processPhoto = async (file: File) => {
    if (!user) return

    try {
      setUploading(true)
      
      // Upload photo
      const { url } = await photoVocabularyService.uploadPhoto(file, user.uid)
      
      setUploading(false)
      setExtracting(true)

      // Extract words using API endpoint with selected method
      const extractResponse = await fetch('/api/photo-vocabulary/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageUrl: url,
          method: extractionMethod 
        })
      })

      if (!extractResponse.ok) {
        throw new Error('Failed to extract words')
      }

      const { words: extractedWords } = await extractResponse.json()
      
      // Limit words to maxWords
      const selectedWords = extractedWords.slice(0, maxWords)

      // Create session
      const session = await photoVocabularyService.createSession(
        user.uid,
        url,
        selectedWords
      )

      onUploadComplete(session.id, selectedWords)
    } catch (error) {
      console.error('Error processing photo:', error)
      setError('사진 처리 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
      setExtracting(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const input = fileInputRef.current
      if (input) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        handleFileSelect({ target: input } as any)
      }
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const clearPreview = () => {
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full space-y-4">

      {/* API Selection */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">텍스트 추출 방법</h3>
            <p className="text-xs text-gray-500">사진에서 텍스트를 추출할 API를 선택하세요</p>
          </div>
          <Select 
            value={extractionMethod} 
            onValueChange={(value: 'openai' | 'google') => setExtractionMethod(value)}
            disabled={uploading || extracting}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  <span>OpenAI Vision</span>
                </div>
              </SelectItem>
              <SelectItem value="google">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>Google Vision</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Mobile Upload Options */}
      <div className="md:hidden">
        {/* Camera input for direct camera access */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          id="mobile-camera"
          disabled={uploading || extracting}
        />
        {/* Gallery input without capture */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="mobile-file"
          disabled={uploading || extracting}
        />
        {!preview ? (
          <div className="space-y-3">
            {/* Camera Capture Button - Direct native camera */}
            <label
              htmlFor="mobile-camera"
              className="flex items-center justify-center w-full h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer transition-colors"
            >
              <CameraIcon className="h-8 w-8 mr-3" />
              <div className="text-left">
                <div className="text-lg font-medium">카메라로 촬영</div>
                <div className="text-sm opacity-90">카메라 앱으로 촬영</div>
              </div>
            </label>

            {/* Gallery Selection Button */}
            <label
              htmlFor="mobile-file"
              className="flex items-center justify-center w-full h-16 bg-green-500 hover:bg-green-600 text-white rounded-lg cursor-pointer transition-colors"
            >
              <Upload className="h-8 w-8 mr-3" />
              <div className="text-left">
                <div className="text-lg font-medium">갤러리에서 선택</div>
                <div className="text-sm opacity-90">저장된 사진 사용</div>
              </div>
            </label>
          </div>
        ) : (
          <div className="relative">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-64 object-contain rounded-lg bg-gray-100"
            />
            {!uploading && !extracting && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                onClick={clearPreview}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Desktop Upload Options */}
      <div className="hidden md:block">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="desktop-file"
          disabled={uploading || extracting}
        />
        {!preview ? (
          <div className="space-y-4">

            {/* Drag & Drop Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="flex flex-col items-center justify-center w-full h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <label
                htmlFor="desktop-file"
                className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
              >
                <Upload className="h-12 w-12 text-gray-400 mb-3" />
                <span className="text-lg font-medium text-gray-700">이미지를 드래그하거나 클릭하여 업로드</span>
                <span className="text-sm text-gray-500 mt-2">PNG, JPG, JPEG (최대 10MB)</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="relative">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-80 object-contain rounded-lg bg-gray-100"
            />
            {!uploading && !extracting && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 bg-white/80 hover:bg-white"
                onClick={clearPreview}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Status Messages */}
      {(uploading || extracting) && (
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span className="text-sm text-gray-600">
              {uploading ? '사진 업로드 중...' : '단어 추출 중...'}
            </span>
          </div>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}
    </div>
  )
}