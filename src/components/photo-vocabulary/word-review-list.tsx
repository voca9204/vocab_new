'use client'

import { useState } from 'react'
import { Check, X, Edit2, Loader2, Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import type { ExtractedWord } from '@/types/photo-vocabulary'

interface WordReviewListProps {
  words: ExtractedWord[]
  onConfirm: (selectedWords: ExtractedWord[]) => void
  onSaveToCollection?: (selectedWords: ExtractedWord[], title?: string) => void
  onEdit?: (index: number, newWord: string) => void
  onRemove?: (index: number) => void
  onRefreshDefinition?: (index: number, word: string) => Promise<void>
  loading?: boolean
}

export function WordReviewList({ 
  words, 
  onConfirm,
  onSaveToCollection, 
  onEdit,
  onRemove,
  onRefreshDefinition,
  loading = false 
}: WordReviewListProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(words.map((_, index) => index))
  )
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [refreshingIndex, setRefreshingIndex] = useState<number | null>(null)

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedIndices)
    if (newSelection.has(index)) {
      newSelection.delete(index)
    } else {
      newSelection.add(index)
    }
    setSelectedIndices(newSelection)
  }

  const toggleAll = () => {
    if (selectedIndices.size === words.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(words.map((_, index) => index)))
    }
  }

  const startEditing = (index: number) => {
    setEditingIndex(index)
    setEditValue(words[index].word)
  }

  const saveEdit = async () => {
    if (editingIndex !== null && onEdit) {
      // 원래 단어를 저장해둠 (비교를 위해)
      const originalWord = words[editingIndex].word
      
      console.log(`[saveEdit] Original word: "${originalWord}", New word: "${editValue}"`)
      
      // 단어 업데이트
      onEdit(editingIndex, editValue)
      
      // 단어가 변경되었고 정의를 새로 가져올 수 있으면 자동으로 새로고침
      if (editValue !== originalWord && onRefreshDefinition) {
        console.log(`[saveEdit] Word changed, refreshing definition for "${editValue}"`)
        setRefreshingIndex(editingIndex)
        try {
          await onRefreshDefinition(editingIndex, editValue)
        } catch (error) {
          console.error('Failed to refresh definition:', error)
        } finally {
          setRefreshingIndex(null)
        }
      }
      
      setEditingIndex(null)
      setEditValue('')
    }
  }
  
  const handleRefreshDefinition = async (index: number) => {
    if (onRefreshDefinition) {
      setRefreshingIndex(index)
      try {
        await onRefreshDefinition(index, words[index].word)
      } catch (error) {
        console.error('Failed to refresh definition:', error)
      } finally {
        setRefreshingIndex(null)
      }
    }
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditValue('')
  }

  const handleConfirm = () => {
    const selectedWords = words.filter((_, index) => selectedIndices.has(index))
    onConfirm(selectedWords)
  }

  const handleSaveToCollection = () => {
    const selectedWords = words.filter((_, index) => selectedIndices.has(index))
    if (onSaveToCollection) {
      onSaveToCollection(selectedWords)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">추출된 단어 검토</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {selectedIndices.size}/{words.length}개 선택됨
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAll}
          >
            {selectedIndices.size === words.length ? '전체 해제' : '전체 선택'}
          </Button>
        </div>
      </div>

      <Card className="divide-y divide-gray-200">
        {words.map((word, index) => (
          <div key={index} className="p-3 flex items-start gap-3">
            <Checkbox
              checked={selectedIndices.has(index)}
              onChange={() => toggleSelection(index)}
              className="mt-1"
            />
            
            <div className="flex-1 space-y-1">
              {editingIndex === index ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        saveEdit()
                      } else if (e.key === 'Escape') {
                        cancelEdit()
                      }
                    }}
                    className="h-8"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={saveEdit}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{word.word}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => startEditing(index)}
                    title="단어 수정"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  {onRefreshDefinition && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleRefreshDefinition(index)}
                      disabled={refreshingIndex === index}
                      title="AI로 정의 새로고침"
                    >
                      {refreshingIndex === index ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3 text-purple-500" />
                      )}
                    </Button>
                  )}
                  {onRemove && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-red-500 hover:text-red-700"
                      onClick={() => onRemove(index)}
                      title="단어 제거"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
              
              {word.context && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {refreshingIndex === index ? (
                      <span className="text-purple-500 italic">정의를 새로 가져오는 중...</span>
                    ) : (
                      word.context
                    )}
                  </p>
                  {word.koreanDefinition && (
                    <p className="text-xs text-gray-500">한글: {word.koreanDefinition}</p>
                  )}
                  {word.englishDefinition && (
                    <p className="text-xs text-gray-500">영어: {word.englishDefinition}</p>
                  )}
                </div>
              )}
              
              {word.confidence && (
                <p className="text-xs text-gray-400">
                  신뢰도: {Math.round(word.confidence * 100)}%
                </p>
              )}
            </div>
          </div>
        ))}
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setSelectedIndices(new Set())}
          disabled={loading}
        >
          취소
        </Button>
        {onSaveToCollection && (
          <Button
            variant="secondary"
            onClick={handleSaveToCollection}
            disabled={loading || selectedIndices.size === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              `${selectedIndices.size}개 단어 저장`
            )}
          </Button>
        )}
        <Button
          onClick={handleConfirm}
          disabled={loading || selectedIndices.size === 0}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              처리 중...
            </>
          ) : (
            `${selectedIndices.size}개 단어로 학습 시작`
          )}
        </Button>
      </div>
    </div>
  )
}