import * as React from 'react'
import { Button } from '@/components/ui'
import { Card } from '@/components/ui/card'
import { X, Sparkles, Save, BookOpen, AlertCircle, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings, getTextSizeClass } from '@/components/providers/settings-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { useCache } from '@/contexts/cache-context'

interface DiscoveredWord {
  word: string
  normalizedWord: string
  pronunciation?: string
  partOfSpeech: string[]
  definitions: Array<{
    id: string
    definition: string
    examples: string[]
    source: string
    language: string
    createdAt: Date
  }>
  etymology?: string
  realEtymology?: string
  synonyms?: string[]
  antonyms?: string[]
  difficulty?: number
  frequency?: number
  isSAT?: boolean
  source: {
    type: string
    origin: string
    addedAt: Date
    metadata?: any
  }
  aiGenerated?: {
    examples: boolean
    etymology: boolean
    generatedAt: Date
  }
  relationshipId?: string
}

export interface DiscoveryModalProps {
  open: boolean
  onClose: () => void
  word: string
  sourceWord?: string
  relationship?: string
  onSave?: (word: DiscoveredWord) => Promise<void>
  onStudy?: (word: DiscoveredWord) => void
  onViewExisting?: (word: any) => void  // Callback for viewing existing words
}

export const DiscoveryModal = React.forwardRef<HTMLDivElement, DiscoveryModalProps>(
  ({ open, onClose, word, sourceWord, relationship = 'synonym', onSave, onStudy, onViewExisting }, ref) => {
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [saved, setSaved] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [discoveredWord, setDiscoveredWord] = React.useState<DiscoveredWord | null>(null)
    const [existingWord, setExistingWord] = React.useState<any>(null)
    const { textSize } = useSettings()
    const { user } = useAuth()
    const { getDiscovery, setDiscovery } = useCache()

    // Discover word when modal opens
    React.useEffect(() => {
      if (open && word) {
        // Reset state when opening with a new word
        setDiscoveredWord(null)
        setExistingWord(null)
        setError(null)
        setSaved(false)
        discoverWord()
      }
    }, [open, word])

    const discoverWord = async () => {
      if (!user) {
        setError('로그인이 필요합니다.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      setSaved(false)
      
      // CacheContext에서 캐시 확인
      const cached = getDiscovery(word)
      
      if (cached) {
        console.log('Using cached word data for:', word)
        if (cached.exists) {
          setExistingWord(cached.word)
          setDiscoveredWord(null)
        } else {
          setDiscoveredWord(cached.word)
          setExistingWord(null)
        }
        setLoading(false)
        return
      }
      
      try {
        const response = await fetch('/api/vocabulary/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word,
            sourceWordId: sourceWord,
            userId: user.uid
          })
        })

        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to discover word')
        }

        if (data.exists) {
          // Word already exists in database
          // If onViewExisting is provided, call it directly and close modal
          if (onViewExisting) {
            onViewExisting(data.word)
            onClose()
            return
          }
          // Otherwise show existing word in modal
          setExistingWord(data.word)
          setDiscoveredWord(null)
          // CacheContext에 저장
          setDiscovery(word, data.word, true)
        } else {
          setDiscoveredWord(data.word)
          setExistingWord(null)
          // CacheContext에 저장
          setDiscovery(word, data.word, false)
        }
      } catch (err) {
        console.error('Error discovering word:', err)
        setError(err instanceof Error ? err.message : 'Failed to discover word')
      } finally {
        setLoading(false)
      }
    }

    const handleSave = async () => {
      if (!discoveredWord || !onSave) return
      
      setSaving(true)
      setError(null)
      
      try {
        await onSave(discoveredWord)
        setSaved(true)
        
        // 저장된 단어를 CacheContext에 업데이트 (이제는 존재하는 단어로)
        setDiscovery(discoveredWord.word, discoveredWord, true)
        
        // Auto close after successful save
        setTimeout(() => {
          onClose()
        }, 1500)
      } catch (err) {
        console.error('Error saving word:', err)
        setError(err instanceof Error ? err.message : 'Failed to save word')
      } finally {
        setSaving(false)
      }
    }

    const handleStudy = () => {
      if (!discoveredWord || !onStudy) return
      onStudy(discoveredWord)
      onClose()
    }

    if (!open) return null

    const getPartOfSpeechColor = (pos: string) => {
      switch (pos.toLowerCase()) {
        case 'n.':
        case 'noun':
          return 'bg-blue-100 text-blue-700'
        case 'v.':
        case 'verb':
          return 'bg-green-100 text-green-700'
        case 'adj.':
        case 'adjective':
          return 'bg-purple-100 text-purple-700'
        case 'adv.':
        case 'adverb':
          return 'bg-orange-100 text-orange-700'
        default:
          return 'bg-gray-100 text-gray-700'
      }
    }

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <Card 
          ref={ref}
          className="max-w-2xl w-full max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <h2 className="text-xl font-bold">새로운 단어 발견</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Relationship info */}
            {sourceWord && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{sourceWord}</span>의 {relationship === 'synonym' ? '유사어' : '관련어'}
                </p>
              </div>
            )}

            {/* Content */}
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-500" />
                <p className="text-gray-600">AI가 단어 정보를 생성하고 있습니다...</p>
              </div>
            ) : error ? (
              <div className="py-8">
                <div className="flex items-center gap-3 text-red-600 mb-4">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
                <Button onClick={onClose} variant="outline" className="w-full">
                  닫기
                </Button>
              </div>
            ) : existingWord ? (
              // Show existing word
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <p className="text-blue-800 font-medium">이미 등록된 단어입니다</p>
                  </div>
                  <p className="text-sm text-blue-700">이 단어는 이미 단어장에 있습니다. 아래에서 단어 정보를 확인하세요.</p>
                </div>

                {/* Word header */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold">{existingWord.word}</h3>
                    {existingWord.partOfSpeech?.map((pos: string) => (
                      <span 
                        key={pos}
                        className={cn("text-sm px-2 py-0.5 rounded", getPartOfSpeechColor(pos))}
                      >
                        {pos}
                      </span>
                    ))}
                  </div>
                  {existingWord.pronunciation && (
                    <p className="text-gray-600">[{existingWord.pronunciation}]</p>
                  )}
                </div>

                {/* Definition */}
                <div>
                  <h4 className="font-medium mb-2">정의</h4>
                  <p className={cn("text-gray-700", getTextSizeClass(textSize))}>
                    {existingWord.definitions?.[0]?.definition || existingWord.definition || 'No definition available'}
                  </p>
                </div>

                {/* Examples */}
                {(existingWord.definitions?.[0]?.examples?.length > 0 || existingWord.examples?.length > 0) && (
                  <div>
                    <h4 className="font-medium mb-2">예문</h4>
                    <ul className="space-y-2">
                      {(existingWord.definitions?.[0]?.examples || existingWord.examples || []).map((example: string, idx: number) => (
                        <li key={idx} className="text-gray-700 text-sm">
                          • {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Etymology - Only show real etymology, not English definition */}
                {existingWord.etymology && (
                  <div>
                    <h4 className="font-medium mb-2">어원</h4>
                    <p className="text-gray-700 text-sm">
                      {typeof existingWord.etymology === 'string' 
                        ? existingWord.etymology 
                        : typeof existingWord.etymology === 'object' && existingWord.etymology !== null
                          ? (existingWord.etymology as any).origin || (existingWord.etymology as any).meaning || ''
                          : String(existingWord.etymology)}
                    </p>
                  </div>
                )}

                {/* Actions for existing word */}
                <div className="flex gap-3 pt-4">
                  {onViewExisting && (
                    <Button
                      onClick={() => {
                        onViewExisting(existingWord)
                        onClose()
                      }}
                      className="flex-1"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      상세 정보 보기
                    </Button>
                  )}
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1"
                  >
                    닫기
                  </Button>
                </div>
              </div>
            ) : discoveredWord ? (
              <div className="space-y-4">
                {/* Word header */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold">{discoveredWord.word}</h3>
                    {discoveredWord.partOfSpeech.map(pos => (
                      <span 
                        key={pos}
                        className={cn("text-sm px-2 py-0.5 rounded", getPartOfSpeechColor(pos))}
                      >
                        {pos}
                      </span>
                    ))}
                  </div>
                  {discoveredWord.pronunciation && (
                    <p className="text-gray-600">[{discoveredWord.pronunciation}]</p>
                  )}
                </div>

                {/* Definition */}
                <div>
                  <h4 className="font-medium mb-2">정의</h4>
                  <p className={cn("text-gray-700", getTextSizeClass(textSize))}>
                    {discoveredWord.definitions[0]?.definition || 'No definition available'}
                  </p>
                </div>

                {/* Examples */}
                {discoveredWord.definitions[0]?.examples && discoveredWord.definitions[0].examples.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">예문</h4>
                    <ul className="space-y-2">
                      {discoveredWord.definitions[0].examples.map((example, idx) => (
                        <li key={idx} className="text-gray-700 text-sm">
                          • {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Etymology */}
                {discoveredWord.etymology && (
                  <div>
                    <h4 className="font-medium mb-2">어원</h4>
                    <p className="text-gray-700 text-sm">
                      {typeof discoveredWord.etymology === 'string' 
                        ? discoveredWord.etymology 
                        : typeof discoveredWord.etymology === 'object' && discoveredWord.etymology !== null
                          ? (discoveredWord.etymology as any).origin || (discoveredWord.etymology as any).meaning || ''
                          : String(discoveredWord.etymology)}
                    </p>
                  </div>
                )}

                {/* Confidence indicator */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Sparkles className="h-4 w-4" />
                  <span>AI 생성 정의 (신뢰도: 85%)</span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving || saved}
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        추가 중...
                      </>
                    ) : saved ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        추가됨
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        개인 단어장에 추가
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleStudy}
                    variant="outline"
                    disabled={saving}
                    className="flex-1"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    바로 학습하기
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    )
  }
)

DiscoveryModal.displayName = 'DiscoveryModal'