'use client'

import { useState } from 'react'
import { Check, X, Edit2, Loader2 } from 'lucide-react'
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
  loading?: boolean
}

export function WordReviewList({ 
  words, 
  onConfirm,
  onSaveToCollection, 
  onEdit,
  onRemove,
  loading = false 
}: WordReviewListProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(words.map((_, index) => index))
  )
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

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

  const saveEdit = () => {
    if (editingIndex !== null && onEdit) {
      onEdit(editingIndex, editValue)
      setEditingIndex(null)
      setEditValue('')
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
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  {onRemove && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-red-500 hover:text-red-700"
                      onClick={() => onRemove(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
              
              {word.context && (
                <p className="text-sm text-gray-600 line-clamp-2">{word.context}</p>
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