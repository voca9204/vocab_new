// Vocabulary Components - Word Detail Modal

import * as React from 'react'
import { Button } from '@/components/ui'
import { Card } from '@/components/ui/card'
import { X, Volume2, Sparkles, BookOpen, Brain, Target } from 'lucide-react'
import type { ExtractedVocabulary } from '@/types/extracted-vocabulary'
import { cn } from '@/lib/utils'

export interface WordDetailModalProps {
  open: boolean
  onClose: () => void
  word: ExtractedVocabulary | null
  onPlayPronunciation?: (word: string) => void
  onGenerateExamples?: () => Promise<void>
  onGenerateEtymology?: () => Promise<void>
  onFetchPronunciation?: () => Promise<void>
  generatingExamples?: boolean
  generatingEtymology?: boolean
  fetchingPronunciation?: boolean
}

export const WordDetailModal = React.forwardRef<HTMLDivElement, WordDetailModalProps>(
  ({ 
    open, 
    onClose, 
    word, 
    onPlayPronunciation,
    onGenerateExamples,
    onGenerateEtymology,
    onFetchPronunciation,
    generatingExamples = false,
    generatingEtymology = false,
    fetchingPronunciation = false
  }, ref) => {
    React.useEffect(() => {
      if (word && open) {
        if (!word.pronunciation && onFetchPronunciation) {
          onFetchPronunciation()
        }
        if (!word.examples?.length && onGenerateExamples) {
          onGenerateExamples()
        }
        if (!word.realEtymology && onGenerateEtymology) {
          onGenerateEtymology()
        }
      }
    }, [word?.id, open])

    const handlePronunciationClick = () => {
      if (!word) return
      onPlayPronunciation?.(word.word)
    }

    const getDifficultyColor = (difficulty: number) => {
      if (difficulty <= 3) return 'text-green-600'
      if (difficulty <= 6) return 'text-yellow-600'
      return 'text-red-600'
    }

    const getPartOfSpeechColor = (pos: string) => {
      switch (pos) {
        case 'n.': return 'bg-blue-100 text-blue-800'
        case 'v.': return 'bg-green-100 text-green-800'
        case 'adj.': return 'bg-purple-100 text-purple-800'
        case 'adv.': return 'bg-orange-100 text-orange-800'
        default: return 'bg-gray-100 text-gray-800'
      }
    }

    if (!open || !word) {
      return null
    }

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <Card 
          ref={ref}
          className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{word.word}</h2>
                  {onPlayPronunciation && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePronunciationClick}
                      className="p-2"
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  )}
                  {fetchingPronunciation ? (
                    <span className="text-sm text-gray-500 italic">발음 정보 가져오는 중...</span>
                  ) : word.pronunciation ? (
                    <span className="text-lg text-gray-600">[{word.pronunciation}]</span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {word.partOfSpeech.map(pos => (
                    <span 
                      key={pos}
                      className={`text-sm px-3 py-1 rounded ${getPartOfSpeechColor(pos)}`}
                    >
                      {pos}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">뜻</h3>
                <p className="text-lg">{word.definition}</p>
              </div>

              {word.etymology && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-1">영어 정의</h3>
                  <p className="text-blue-700">{word.etymology}</p>
                </div>
              )}

              {word.realEtymology ? (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-semibold text-purple-800 mb-1">어원</h3>
                  <p className="text-purple-700">{word.realEtymology}</p>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  {generatingEtymology ? (
                    <p className="text-sm text-purple-600 flex items-center justify-center gap-1">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      AI가 어원을 분석하고 있습니다...
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">어원 정보가 없습니다</p>
                  )}
                </div>
              )}

              {word.examples && word.examples.length > 0 ? (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">예문</h3>
                  <div className="space-y-2">
                    {word.examples.map((example, idx) => (
                      <p key={idx} className="text-green-700">
                        • {example}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  {generatingExamples ? (
                    <p className="text-sm text-blue-600 flex items-center justify-center gap-1">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      AI가 예문을 생성하고 있습니다...
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">예문이 없습니다</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">난이도</p>
                  <p className={`font-semibold ${getDifficultyColor(word.difficulty || 5)}`}>
                    Level {word.difficulty}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">학습 상태</p>
                  <p className="font-semibold">
                    {word.studyStatus.studied ? '학습 완료' : '미학습'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">숙련도</p>
                  <p className="font-semibold">{word.studyStatus.masteryLevel}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">복습 횟수</p>
                  <p className="font-semibold">{word.studyStatus.reviewCount}회</p>
                </div>
              </div>
            </div>

          </div>
        </Card>
      </div>
    )
  }
)
WordDetailModal.displayName = "WordDetailModal"
