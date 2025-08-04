// Vocabulary Components - Word Detail Modal

import * as React from 'react'
import { Button } from '@/components/ui'
import { Card } from '@/components/ui/card'
import { X, Volume2, Sparkles, BookOpen, Brain, Target, ChevronDown, ChevronUp } from 'lucide-react'
import type { ExtractedVocabulary } from '@/types/extracted-vocabulary'
import type { VocabularyWord } from '@/types'
import { cn } from '@/lib/utils'
import { useSettings, getTextSizeClass } from '@/components/providers/settings-provider'

type ModalWord = ExtractedVocabulary | VocabularyWord

export interface WordDetailModalProps {
  open: boolean
  onClose: () => void
  word: ModalWord | null
  onPlayPronunciation?: (word: string) => void
  onGenerateExamples?: () => Promise<void>
  onGenerateEtymology?: () => Promise<void>
  onFetchPronunciation?: () => Promise<void>
  generatingExamples?: boolean
  generatingEtymology?: boolean
  fetchingPronunciation?: boolean
  onSynonymClick?: (synonymWord: string) => void
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
    fetchingPronunciation = false,
    onSynonymClick
  }, ref) => {
    const [showEtymology, setShowEtymology] = React.useState(false)
    const [generatingSynonyms, setGeneratingSynonyms] = React.useState(false)
    const [synonyms, setSynonyms] = React.useState<string[]>([])
    const [translations, setTranslations] = React.useState<{ [key: number]: string }>({})
    const [translatingIndex, setTranslatingIndex] = React.useState<number | null>(null)
    // Track which word IDs we've already triggered API calls for
    const processedWords = React.useRef<Set<string>>(new Set())
    const processedSynonyms = React.useRef<Set<string>>(new Set())
    const { textSize } = useSettings()
    
    // Reset state when word changes
    React.useEffect(() => {
      if (word && open) {
        setShowEtymology(false) // Close etymology when switching words
        setSynonyms([]) // Clear synonyms from previous word
        setTranslations({}) // Clear translations from previous word
        setTranslatingIndex(null) // Reset translating state
      }
    }, [word?.id, open])
    
    // 디버깅: 텍스트 크기 확인
    console.log('[WordDetailModal] Current text size:', textSize)
    
    React.useEffect(() => {
      // Only process when modal opens with a new word
      if (word && open && !processedWords.current.has(word.id)) {
        console.log('[WordDetailModal] New word opened:', word.word, 'ID:', word.id)
        console.log('[WordDetailModal] Word structure:', {
          hasRealEtymology: 'realEtymology' in word,
          realEtymology: 'realEtymology' in word ? word.realEtymology : undefined,
          etymologyMeaning: word.etymology?.meaning,
          etymology: word.etymology,
          examples: word.examples,
          pronunciation: word.pronunciation
        })
        
        // Mark this word as processed immediately
        processedWords.current.add(word.id)
        
        // Check what needs to be generated
        const needsPronunciation = !word.pronunciation && !!onFetchPronunciation && !fetchingPronunciation
        const needsExamples = (!word.examples || word.examples.length === 0) && !!onGenerateExamples && !generatingExamples
        const hasEtymology = 'realEtymology' in word ? !!word.realEtymology : !!word.etymology?.meaning
        const needsEtymology = !hasEtymology && !!onGenerateEtymology && !generatingEtymology
        
        console.log('[WordDetailModal] Needs:', { 
          pronunciation: needsPronunciation, 
          examples: needsExamples, 
          etymology: needsEtymology,
          callbacks: {
            onGenerateExamples: !!onGenerateExamples,
            onGenerateEtymology: !!onGenerateEtymology,
            onFetchPronunciation: !!onFetchPronunciation
          },
          generating: {
            examples: generatingExamples,
            etymology: generatingEtymology,
            pronunciation: fetchingPronunciation
          }
        })
        
        // Only set timeouts if we need to generate something
        if (needsPronunciation || needsExamples || needsEtymology) {
          // Debounce and sequence API calls to avoid conflicts
          const timeoutId = setTimeout(async () => {
            // 1. First, fetch pronunciation if needed
            if (needsPronunciation) {
              console.log('[WordDetailModal] Fetching pronunciation')
              onFetchPronunciation()
            }
            
            // 2. Then generate examples after a delay
            if (needsExamples) {
              console.log('[WordDetailModal] Will generate examples')
              setTimeout(() => {
                console.log('[WordDetailModal] Calling onGenerateExamples')
                onGenerateExamples()
              }, 1000)
            }
            
            // 3. Finally generate etymology after another delay
            if (needsEtymology) {
              console.log('[WordDetailModal] Will generate etymology')
              setTimeout(() => {
                console.log('[WordDetailModal] Calling onGenerateEtymology')
                onGenerateEtymology()
              }, 2000)
            }
          }, 500) // Initial delay to debounce rapid opens
          
          return () => clearTimeout(timeoutId)
        }
      }
    }, [word, open, onFetchPronunciation, onGenerateExamples, onGenerateEtymology, 
        fetchingPronunciation, generatingExamples, generatingEtymology])

    // Generate synonyms when modal opens with a new word
    React.useEffect(() => {
      if (word && open && !processedSynonyms.current.has(word.id)) {
        processedSynonyms.current.add(word.id)
        setSynonyms([]) // Reset synonyms for new word
        
        // Generate synonyms using AI
        const generateSynonyms = async () => {
          setGeneratingSynonyms(true)
          try {
            const response = await fetch('/api/generate-synonyms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                word: word.word, 
                definition: 'definition' in word 
                  ? word.definition 
                  : word.definitions?.[0]?.definition || word.definitions?.[0]?.text || ''
              })
            })
            
            if (response.ok) {
              const data = await response.json()
              setSynonyms(data.synonyms || [])
            }
          } catch (error) {
            console.error('Error generating synonyms:', error)
          } finally {
            setGeneratingSynonyms(false)
          }
        }
        
        // Delay synonym generation to prioritize other content
        setTimeout(generateSynonyms, 1500)
      }
    }, [word, open])

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
          className="max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="overflow-x-auto">
                  <div className="flex items-center gap-3 whitespace-nowrap">
                    <h2 className="text-2xl font-bold">{word.word}</h2>
                    {word.partOfSpeech.map(pos => (
                      <span 
                        key={pos}
                        className={`text-sm px-2 py-0.5 rounded ${getPartOfSpeechColor(pos)}`}
                      >
                        {pos}
                      </span>
                    ))}
                    {fetchingPronunciation ? (
                      <span className="text-sm text-gray-500 italic">발음 정보 가져오는 중...</span>
                    ) : word.pronunciation ? (
                      <span className="text-lg text-gray-600">[{word.pronunciation}]</span>
                    ) : null}
                    {onPlayPronunciation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePronunciationClick}
                        className="p-1.5"
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
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
              <div className="overflow-x-auto mb-4">
                <div className="flex items-center gap-3 whitespace-nowrap">
                  <span className="text-sm px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                    뜻
                  </span>
                  <p className={cn("text-lg", getTextSizeClass(textSize))}>{
                    'definition' in word 
                      ? word.definition 
                      : word.definitions && word.definitions.length > 0
                        ? word.definitions[0]?.definition || word.definitions[0]?.text || 'No definition available'
                        : 'No definition available'
                  }</p>
                </div>
              </div>

              {/* 유사어 섹션 추가 */}
              <div className="mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-sm px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium flex-shrink-0">
                    유사어
                  </span>
                  <div className="flex-1">
                    {generatingSynonyms ? (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        AI가 유사어를 생성하고 있습니다...
                      </span>
                    ) : synonyms.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {synonyms.map((synonym, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log('Synonym clicked:', synonym)
                              onSynonymClick?.(synonym)
                            }}
                            className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm hover:bg-green-100 transition-colors cursor-pointer"
                          >
                            {synonym}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 italic">유사어를 불러오는 중...</span>
                    )}
                  </div>
                </div>
              </div>

              {('etymology' in word && typeof word.etymology === 'string' ? word.etymology : word.etymology?.origin) && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-1">영어 정의</h3>
                  <p className={cn("text-blue-700", getTextSizeClass(textSize))}>{
                    'etymology' in word && typeof word.etymology === 'string' 
                      ? word.etymology 
                      : word.etymology?.origin
                  }</p>
                </div>
              )}

              {/* 어원 - 클릭하면 표시 */}
              <div className="border border-purple-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowEtymology(!showEtymology)}
                  className="w-full p-4 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center justify-between text-left"
                >
                  <h3 className="font-semibold text-purple-800">어원</h3>
                  {showEtymology ? (
                    <ChevronUp className="h-4 w-4 text-purple-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-purple-600" />
                  )}
                </button>
                {showEtymology && (
                  <div className="p-4 bg-white border-t border-purple-200">
                    {('realEtymology' in word ? word.realEtymology : word.etymology?.meaning) ? (
                      <p className={cn("text-purple-700", getTextSizeClass(textSize))}>{
                        'realEtymology' in word ? word.realEtymology : word.etymology?.meaning
                      }</p>
                    ) : generatingEtymology ? (
                      <p className="text-sm text-purple-600 flex items-center gap-1">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        AI가 어원을 분석하고 있습니다...
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">어원 정보가 없습니다</p>
                    )}
                  </div>
                )}
              </div>

              {false && (
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
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-green-800">예문</h3>
                  </div>
                  <div className="space-y-3">
                    {word.examples.slice(0, 2).map((example, idx) => (
                      <div key={idx}>
                        <div className="flex gap-2">
                          <span className="text-green-700 mt-0.5">•</span>
                          <div className="flex-1">
                            <div className="space-y-1">
                              <div>
                                <p className={cn("text-green-700 inline", getTextSizeClass(textSize))}>
                                  {example}
                                </p>
                                <span className="inline-flex items-center gap-1 ml-2">
                                  {onPlayPronunciation && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onPlayPronunciation(example)}
                                      className="p-1 h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100 inline-flex"
                                      title="예문 듣기"
                                    >
                                      <Volume2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      if (translatingIndex !== null || translations[idx]) return
                                      setTranslatingIndex(idx)
                                      try {
                                        const response = await fetch('/api/translate-example', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ example })
                                        })
                                        if (response.ok) {
                                          const { translation } = await response.json()
                                          setTranslations(prev => ({ ...prev, [idx]: translation }))
                                        }
                                      } catch (error) {
                                        console.error('Translation error:', error)
                                      } finally {
                                        setTranslatingIndex(null)
                                      }
                                    }}
                                    disabled={translatingIndex === idx}
                                    className="text-xs px-2 py-1 h-6 text-green-600 hover:text-green-700 hover:bg-green-100 inline-flex items-center"
                                  >
                                    {translatingIndex === idx ? (
                                      <Sparkles className="h-3 w-3 animate-pulse" />
                                    ) : (
                                      '번역'
                                    )}
                                  </Button>
                                </span>
                              </div>
                              {translations[idx] && (
                                <p className={cn("text-green-600 text-sm", getTextSizeClass(textSize))}>
                                  → {translations[idx]}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
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
