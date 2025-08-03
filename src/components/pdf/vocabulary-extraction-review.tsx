'use client'

import { useState } from 'react'
import { Button, Card, LoadingSpinner } from '@/components/ui'
import { Check, X, Edit, Save, Plus, Trash2 } from 'lucide-react'
import type { VocabularyEntry } from '@/lib/pdf/vocabulary-pdf-extractor'

interface ExtractionReviewProps {
  entries: VocabularyEntry[]
  onConfirm: (finalEntries: VocabularyEntry[]) => void
  onCancel: () => void
}

export function VocabularyExtractionReview({ 
  entries: initialEntries, 
  onConfirm, 
  onCancel 
}: ExtractionReviewProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editedEntry, setEditedEntry] = useState<VocabularyEntry | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditedEntry({ ...entries[index] })
  }

  const handleSave = () => {
    if (editingIndex !== null && editedEntry) {
      const newEntries = [...entries]
      newEntries[editingIndex] = editedEntry
      setEntries(newEntries)
      setEditingIndex(null)
      setEditedEntry(null)
    }
  }

  const handleCancel = () => {
    setEditingIndex(null)
    setEditedEntry(null)
  }

  const handleDelete = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index))
  }

  const handleAdd = () => {
    const newEntry: VocabularyEntry = {
      word: '',
      partOfSpeech: 'n.',
      definition: '',
      example: '',
      englishDefinition: ''
    }
    setEntries([...entries, newEntry])
    setEditingIndex(entries.length)
    setEditedEntry(newEntry)
  }

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onConfirm(entries)
    } finally {
      setIsProcessing(false)
    }
  }

  const stats = {
    total: entries.length,
    withDefinitions: entries.filter(e => e.definition).length,
    withExamples: entries.filter(e => e.example).length,
    withPartOfSpeech: entries.filter(e => e.partOfSpeech).length
  }

  return (
    <div className="space-y-6">
      {/* 통계 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">추출 결과 검토</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">총 단어 수</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.withDefinitions}</div>
            <div className="text-sm text-gray-600">정의 포함</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.withExamples}</div>
            <div className="text-sm text-gray-600">예문 포함</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.withPartOfSpeech}</div>
            <div className="text-sm text-gray-600">품사 포함</div>
          </div>
        </div>
      </Card>

      {/* 단어 목록 */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold">단어 목록</h4>
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            단어 추가
          </Button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {entries.map((entry, index) => (
            <div
              key={index}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              {editingIndex === index ? (
                // 편집 모드
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="단어"
                      value={editedEntry?.word || ''}
                      onChange={(e) => setEditedEntry({ ...editedEntry!, word: e.target.value })}
                      className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="품사 (예: n., v., adj.)"
                      value={editedEntry?.partOfSpeech || ''}
                      onChange={(e) => setEditedEntry({ ...editedEntry!, partOfSpeech: e.target.value })}
                      className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="한글 뜻"
                    value={editedEntry?.definition || ''}
                    onChange={(e) => setEditedEntry({ ...editedEntry!, definition: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="영어 정의 (선택사항)"
                    value={editedEntry?.englishDefinition || ''}
                    onChange={(e) => setEditedEntry({ ...editedEntry!, englishDefinition: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="예문 (선택사항)"
                    value={editedEntry?.example || ''}
                    onChange={(e) => setEditedEntry({ ...editedEntry!, example: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}>
                      <Save className="h-4 w-4 mr-1" />
                      저장
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-1" />
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                // 보기 모드
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">
                        {entry.number && `${entry.number}. `}{entry.word}
                      </span>
                      <span className="text-sm text-gray-500">({entry.partOfSpeech || '품사 없음'})</span>
                    </div>
                    {entry.definition && (
                      <p className="text-gray-700">{entry.definition}</p>
                    )}
                    {entry.englishDefinition && (
                      <p className="text-sm text-gray-600 italic mt-1">{entry.englishDefinition}</p>
                    )}
                    {entry.example && (
                      <p className="text-sm text-gray-500 mt-1">예: {entry.example}</p>
                    )}
                    {!entry.definition && !entry.englishDefinition && (
                      <p className="text-red-500 text-sm">⚠️ 정의 없음</p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(index)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          취소
        </Button>
        <div className="flex gap-3">
          <div className="text-sm text-gray-600 flex items-center">
            <Check className="h-4 w-4 text-green-600 mr-1" />
            {entries.length}개 단어 저장 예정
          </div>
          <Button 
            onClick={handleConfirm}
            disabled={isProcessing || entries.length === 0}
          >
            {isProcessing ? (
              <>
                <LoadingSpinner className="mr-2" />
                저장 중...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                확인 및 저장
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}