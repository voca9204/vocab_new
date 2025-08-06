// Vocabulary Components - Word Detail Modal

import * as React from 'react'
import { Button } from '@/components/ui'
import { Card } from '@/components/ui/card'
import { X, Volume2, Sparkles, BookOpen, Brain, Target, ChevronDown, ChevronUp } from 'lucide-react'
import type { UnifiedWord } from '@/types/unified-word'
import { cn } from '@/lib/utils'
import { useSettings, getTextSizeClass } from '@/components/providers/settings-provider'
import { useCache } from '@/contexts/cache-context'
import { useVocabulary } from '@/contexts/vocabulary-context'

export interface WordDetailModalProps {
  open: boolean
  onClose: () => void
  word: UnifiedWord | null
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
    // Track which synonyms we've already generated to prevent duplicate API calls
    const processedSynonyms = React.useRef<Set<string>>(new Set())
    const { textSize } = useSettings()
    const { getSynonyms, setSynonyms: setCacheSynonyms } = useCache()
    const { updateWordSynonyms } = useVocabulary()
    
    // Reset state when word changes or modal opens/closes
    React.useEffect(() => {
      if (open) {
        if (word) {
          setShowEtymology(false) // Close etymology when switching words
          setSynonyms([]) // Clear synonyms from previous word
          setTranslations({}) // Clear translations from previous word
          setTranslatingIndex(null) // Reset translating state
        }
      }
      // DON'T clear processed tracking when modal closes - keep it to prevent redundant API calls
    }, [word?.id, open])
    
    // 디버깅: 텍스트 크기 확인
    console.log('[WordDetailModal] Current text size:', textSize)
    
    React.useEffect(() => {
      // Process when modal opens with a word
      if (word && open) {
        console.log('[WordDetailModal] New word opened:', word.word, 'ID:', word.id)
        console.log('[WordDetailModal] Word source:', word.source)
        console.log('[WordDetailModal] Word structure:', {
          hasRealEtymology: 'realEtymology' in word,
          realEtymology: 'realEtymology' in word ? word.realEtymology : undefined,
          etymologyMeaning: word.etymology?.meaning,
          etymology: word.etymology,
          examples: word.examples,
          definitionsExamples: word.definitions?.[0]?.examples,
          pronunciation: word.pronunciation,
          definitions: word.definitions,
          definitionsLength: word.definitions?.length,
          firstDefinition: word.definitions?.[0],
          definition: word.definition
        })
        
        // Check what needs to be generated
        const needsPronunciation = !word.pronunciation && !!onFetchPronunciation
        
        // Check for examples in unified structure (both word.examples and definitions[0].examples)
        const hasDirectExamples = word.examples && word.examples.length > 0
        const hasDefinitionExamples = word.definitions?.[0]?.examples && word.definitions[0].examples.length > 0
        const hasExamples = hasDirectExamples || hasDefinitionExamples
        
        // For photo vocabulary, prioritize generating quality examples even if some exist
        const isPhotoVocab = word.source?.collection === 'photo_vocabulary_words'
        // Force example generation for photo vocabulary words to debug the issue
        const needsExamples = (!hasExamples || isPhotoVocab) && !!onGenerateExamples
        
        console.log('[WordDetailModal] Examples check:', {
          directExamples: word.examples,
          hasDirectExamples,
          definitionExamples: word.definitions?.[0]?.examples,
          hasDefinitionExamples,
          hasExamples,
          isPhotoVocab,
          needsExamples,
          wordSource: word.source
        })
        
        const hasEtymology = !!word.realEtymology
        const needsEtymology = !hasEtymology && !!onGenerateEtymology
        
        console.log('[WordDetailModal] CRITICAL DEBUG - Needs:', { 
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
          },
          wordSource: word.source,
          wordId: word.id
        })
        
        // Log the specific condition check for example generation
        if (needsExamples && !generatingExamples && onGenerateExamples) {
          console.log('[WordDetailModal] WILL CALL onGenerateExamples - all conditions met')
        } else {
          console.log('[WordDetailModal] NOT CALLING onGenerateExamples because:', {
            needsExamples,
            generatingExamples,
            hasCallback: !!onGenerateExamples
          })
        }
        
        // Only generate if content is actually missing and not currently generating
        if ((needsPronunciation && !fetchingPronunciation) || 
            (needsExamples && !generatingExamples) || 
            (needsEtymology && !generatingEtymology)) {
          console.log('[WordDetailModal] Setting up API calls for:', word.word, {
            needsPronunciation: needsPronunciation && !fetchingPronunciation,
            needsExamples: needsExamples && !generatingExamples,
            needsEtymology: needsEtymology && !generatingEtymology
          })
          
          // Debounce and sequence API calls to avoid conflicts
          const timeoutId = setTimeout(async () => {
            console.log('[WordDetailModal] Timeout executed for:', word.word)
            
            // 1. First, fetch pronunciation if needed
            if (needsPronunciation && !fetchingPronunciation && onFetchPronunciation) {
              console.log('[WordDetailModal] Fetching pronunciation')
              onFetchPronunciation()
            }
            
            // 2. Then generate examples after a delay
            if (needsExamples && !generatingExamples && onGenerateExamples) {
              console.log('[WordDetailModal] Will generate examples')
              setTimeout(() => {
                console.log('[WordDetailModal] Calling onGenerateExamples')
                onGenerateExamples()
              }, 1000)
            }
            
            // 3. Finally generate etymology after another delay
            if (needsEtymology && !generatingEtymology && onGenerateEtymology) {
              console.log('[WordDetailModal] Will generate etymology')
              setTimeout(() => {
                console.log('[WordDetailModal] Calling onGenerateEtymology')
                onGenerateEtymology()
              }, 2000)
            }
          }, 500) // Initial delay to debounce rapid opens
          
          return () => {
            console.log('[WordDetailModal] Cleanup: clearing timeout for:', word.word)
            clearTimeout(timeoutId)
          }
        }
      }
    }, [word, open, onFetchPronunciation, onGenerateExamples, onGenerateEtymology])

    // Load synonyms when modal opens
    React.useEffect(() => {
      console.log('[WordDetailModal] Synonym effect triggered:', {
        word: word?.word,
        open,
        currentSynonyms: synonyms.length
      })
      
      if (word && open) {
        setSynonyms([]) // Reset synonyms for new word
        
        // 먼저 DB에 저장된 유사어가 있는지 확인
        if ('synonyms' in word && word.synonyms && word.synonyms.length > 0) {
          console.log('[WordDetailModal] Using DB synonyms for:', word.word, word.synonyms)
          setSynonyms(word.synonyms)
          return
        }
        
        // CacheContext에서 캐시 확인
        const cachedSynonyms = getSynonyms(word.word)
        if (cachedSynonyms) {
          console.log('[WordDetailModal] Using cached synonyms for:', word.word)
          setSynonyms(cachedSynonyms)
          return
        }
        
        // AI로 유사어 생성 (한 번도 생성하지 않은 경우만)
        if (!processedSynonyms.current.has(word.id)) {
          processedSynonyms.current.add(word.id)
          
          const generateSynonyms = async () => {
            setGeneratingSynonyms(true)
            try {
              const response = await fetch('/api/generate-synonyms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  word: word.word, 
                  definition: word.definition || ''
                })
              })
              
              if (response.ok) {
                const data = await response.json()
                const synonymList = data.synonyms || []
                setSynonyms(synonymList)
                
                // CacheContext에 저장
                setCacheSynonyms(word.word, synonymList)
                console.log('[WordDetailModal] Cached synonyms for:', word.word)
                
                // DB에 유사어 업데이트 (백그라운드에서 실행)
                if (synonymList.length > 0) {
                  updateWordSynonyms(word.id, synonymList).catch(err => {
                    console.error('[WordDetailModal] Failed to update synonyms in DB:', err)
                  })
                }
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
      }
    }, [word, open, getSynonyms, setCacheSynonyms, updateWordSynonyms])

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
          data-testid="word-detail-modal"
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
                  <p className={cn("text-lg", getTextSizeClass(textSize))}>
                    {word.definition || word.definitions?.[0]?.definition || word.definitions?.[0]?.text || 'No definition available'}
                  </p>
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
                              // 타이밍 문제 해결을 위해 약간의 지연 후 실행
                              if (onSynonymClick) {
                                onSynonymClick(synonym)
                                // onClose는 새 모달이 열리면서 자동으로 처리되도록 함
                              } else {
                                onClose() // fallback
                              }
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

              {/* 영어 정의 */}
              {word.etymology && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-1">영어 정의</h3>
                  <p className={cn("text-blue-700", getTextSizeClass(textSize))}>
                    {word.etymology}
                  </p>
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
                    {word.realEtymology ? (
                      <p className={cn("text-purple-700", getTextSizeClass(textSize))}>
                        {word.realEtymology}
                      </p>
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

              {(() => {
                // Get examples from unified structure
                const examples = word.examples || []
                
                console.log('[WordDetailModal] Rendering examples:', examples)
                
                return examples.length > 0 ? (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-green-800">예문</h3>
                    </div>
                    <div className="space-y-3">
                      {examples.slice(0, 2).map((example: string, idx: number) => (
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
                )
              })()}

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
                    {word.studyStatus?.studied ? '학습 완료' : '미학습'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">숙련도</p>
                  <p className="font-semibold">{word.studyStatus?.masteryLevel || 0}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">복습 횟수</p>
                  <p className="font-semibold">{word.studyStatus?.reviewCount || 0}회</p>
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
