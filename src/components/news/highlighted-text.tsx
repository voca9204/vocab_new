// News Components - Highlighted Text

import * as React from 'react'
import { Modal } from '@/components/ui/modal'
import { Badge, DifficultyBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { NewsHighlight, VocabularyWord } from '@/types'
import { cn } from '@/lib/utils'

export interface HighlightedTextProps {
  text: string
  highlights: NewsHighlight[]
  onWordClick?: (wordId: string, word: string) => void
  onWordDefinition?: (wordId: string) => Promise<VocabularyWord | null>
  className?: string
}

export const HighlightedText = React.forwardRef<HTMLDivElement, HighlightedTextProps>(
  ({ 
    text, 
    highlights, 
    onWordClick, 
    onWordDefinition,
    className,
    ...props 
  }, ref) => {
    const [selectedWord, setSelectedWord] = React.useState<{
      highlight: NewsHighlight
      word?: VocabularyWord
      position: { x: number; y: number }
    } | null>(null)
    const [loading, setLoading] = React.useState(false)

    // Sort highlights by position to avoid overlap issues
    const sortedHighlights = [...highlights].sort((a, b) => a.startIndex - b.startIndex)

    const handleWordClick = async (highlight: NewsHighlight, event: React.MouseEvent) => {
      event.preventDefault()
      
      const rect = (event.target as HTMLElement).getBoundingClientRect()
      const position = {
        x: rect.left + rect.width / 2,
        y: rect.top
      }

      setSelectedWord({ highlight, position })
      onWordClick?.(highlight.wordId, highlight.word)

      if (onWordDefinition) {
        setLoading(true)
        try {
          const word = await onWordDefinition(highlight.wordId)
          setSelectedWord(prev => prev ? { ...prev, word: word || undefined } : null)
        } catch (error) {
          console.error('Error loading word definition:', error)
        } finally {
          setLoading(false)
        }
      }
    }

    const renderHighlightedText = () => {
      if (sortedHighlights.length === 0) {
        return <span>{text}</span>
      }

      const parts: React.ReactNode[] = []
      let lastIndex = 0

      sortedHighlights.forEach((highlight, index) => {
        // Add text before highlight
        if (highlight.startIndex > lastIndex) {
          parts.push(
            <span key={`text-${index}`}>
              {text.slice(lastIndex, highlight.startIndex)}
            </span>
          )
        }

        // Add highlighted word
        const highlightedWord = text.slice(highlight.startIndex, highlight.endIndex)
        parts.push(
          <button
            key={`highlight-${index}`}
            onClick={(e) => handleWordClick(highlight, e)}
            className={cn(
              "sat-word-highlight relative inline",
              "hover:bg-yellow-300 dark:hover:bg-yellow-800",
              "focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1",
              "transition-colors duration-200"
            )}
            title={`SAT Word: ${highlight.word} (Click for definition)`}
            data-word-id={highlight.wordId}
            data-difficulty={highlight.difficulty}
          >
            {highlightedWord}
            {/* Difficulty indicator */}
            <span 
              className={cn(
                "absolute -top-1 -right-1 w-2 h-2 rounded-full text-xs",
                highlight.difficulty <= 3 && "bg-green-500",
                highlight.difficulty > 3 && highlight.difficulty <= 6 && "bg-orange-500",
                highlight.difficulty > 6 && "bg-red-500"
              )}
              aria-hidden="true"
            />
          </button>
        )

        lastIndex = highlight.endIndex
      })

      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(
          <span key="text-end">
            {text.slice(lastIndex)}
          </span>
        )
      }

      return parts
    }

    return (
      <>
        <div
          ref={ref}
          className={cn("leading-relaxed", className)}
          {...props}
        >
          {renderHighlightedText()}
        </div>

        {/* Word Definition Tooltip/Modal */}
        {selectedWord && (
          <WordDefinitionPopover
            highlight={selectedWord.highlight}
            word={selectedWord.word}
            position={selectedWord.position}
            loading={loading}
            onClose={() => setSelectedWord(null)}
          />
        )}
      </>
    )
  }
)
HighlightedText.displayName = "HighlightedText"

// Word Definition Popover Component
interface WordDefinitionPopoverProps {
  highlight: NewsHighlight
  word?: VocabularyWord
  position: { x: number; y: number }
  loading: boolean
  onClose: () => void
}

const WordDefinitionPopover: React.FC<WordDefinitionPopoverProps> = ({
  highlight,
  word,
  position,
  loading,
  onClose
}) => {
  const popoverRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 max-w-sm bg-background border border-border rounded-lg shadow-lg p-4 animate-scale-in"
      style={{
        left: `${Math.min(position.x - 150, window.innerWidth - 320)}px`,
        top: `${Math.max(position.y - 10, 10)}px`,
        transform: 'translateY(-100%)'
      }}
    >
      {/* Arrow */}
      <div 
        className="absolute bottom-[-6px] w-3 h-3 bg-background border-r border-b border-border transform rotate-45"
        style={{ left: '50%', transform: 'translateX(-50%) rotate(45deg)' }}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-foreground">
            {highlight.word}
          </h4>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close definition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2">
          <DifficultyBadge difficulty={highlight.difficulty} size="sm" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm text-foreground leading-relaxed">
                {highlight.definition}
              </p>
            </div>

            {word?.pronunciation && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Pronunciation:</span> {word.pronunciation}
              </div>
            )}

            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground italic">
                <span className="font-medium">Context:</span> "...{highlight.context}..."
              </p>
            </div>

            {word && (
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="text-xs">
                  Study Word
                </Button>
                <Button size="sm" variant="ghost" className="text-xs">
                  More Details
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Statistics component for highlighted text
export interface HighlightStatsProps {
  highlights: NewsHighlight[]
  className?: string
}

export const HighlightStats: React.FC<HighlightStatsProps> = ({ 
  highlights, 
  className 
}) => {
  const stats = React.useMemo(() => {
    const totalWords = highlights.length
    const difficultyGroups = {
      easy: highlights.filter(h => h.difficulty <= 3).length,
      medium: highlights.filter(h => h.difficulty > 3 && h.difficulty <= 6).length,
      hard: highlights.filter(h => h.difficulty > 6).length,
    }
    const avgDifficulty = totalWords > 0 
      ? highlights.reduce((sum, h) => sum + h.difficulty, 0) / totalWords 
      : 0

    return { totalWords, difficultyGroups, avgDifficulty }
  }, [highlights])

  return (
    <div className={cn("flex items-center gap-4 text-sm", className)}>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">SAT Words:</span>
        <Badge variant="outline" size="sm">
          {stats.totalWords}
        </Badge>
      </div>
      
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs">{stats.difficultyGroups.easy}</span>
        
        <span className="w-2 h-2 rounded-full bg-orange-500 ml-2" />
        <span className="text-xs">{stats.difficultyGroups.medium}</span>
        
        <span className="w-2 h-2 rounded-full bg-red-500 ml-2" />
        <span className="text-xs">{stats.difficultyGroups.hard}</span>
      </div>

      <div className="text-muted-foreground">
        Avg Difficulty: {stats.avgDifficulty.toFixed(1)}/10
      </div>
    </div>
  )
}

export { WordDefinitionPopover }
