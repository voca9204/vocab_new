// Vocabulary Components - Word Detail Modal

import * as React from 'react'
import { 
  Modal, 
  ModalHeader, 
  ModalTitle, 
  ModalBody, 
  ModalFooter 
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge, DifficultyBadge, MasteryBadge } from '@/components/ui/badge'
import { Progress, LearningProgress } from '@/components/ui/progress'
import { LoadingSpinner } from '@/components/ui/loading'
import type { VocabularyWord, UserProgress, NewsArticle } from '@/types'
import { cn } from '@/lib/utils'

export interface WordDetailModalProps {
  open: boolean
  onClose: () => void
  word?: VocabularyWord
  userProgress?: UserProgress
  relatedArticles?: NewsArticle[]
  loading?: boolean
  onStartQuiz?: (wordId: string) => void
  onBookmark?: (wordId: string) => void
  onPlayPronunciation?: (word: string) => void
  onViewInContext?: (articleId: string) => void
}

export const WordDetailModal = React.forwardRef<HTMLDivElement, WordDetailModalProps>(
  ({ 
    open, 
    onClose, 
    word, 
    userProgress, 
    relatedArticles = [],
    loading = false,
    onStartQuiz,
    onBookmark,
    onPlayPronunciation,
    onViewInContext,
    ...props 
  }, ref) => {
    const [activeTab, setActiveTab] = React.useState<'definitions' | 'examples' | 'articles'>('definitions')
    const [isBookmarked, setIsBookmarked] = React.useState(false)

    const masteryLevel = userProgress 
      ? userProgress.correctAttempts / Math.max(userProgress.totalAttempts, 1)
      : 0

    const handleBookmarkClick = () => {
      if (!word) return
      setIsBookmarked(!isBookmarked)
      onBookmark?.(word.id)
    }

    const handlePronunciationClick = () => {
      if (!word) return
      onPlayPronunciation?.(word.word)
    }

    const handleQuizClick = () => {
      if (!word) return
      onStartQuiz?.(word.id)
    }

    const tabButton = (tab: typeof activeTab, label: string, count?: number) => (
      <button
        onClick={() => setActiveTab(tab)}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-md transition-colors",
          activeTab === tab
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        {label}
        {count !== undefined && (
          <span className="ml-1 text-xs opacity-75">({count})</span>
        )}
      </button>
    )

    if (loading) {
      return (
        <Modal open={open} onClose={onClose} size="lg">
          <ModalBody>
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" label="Loading word details..." />
            </div>
          </ModalBody>
        </Modal>
      )
    }

    if (!word) {
      return null
    }

    return (
      <Modal 
        ref={ref}
        open={open} 
        onClose={onClose} 
        size="2xl"
        {...props}
      >
        <ModalHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <ModalTitle className="text-3xl">
                  {word.word}
                </ModalTitle>
                
                {word.pronunciation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePronunciationClick}
                    className="h-8 w-8 p-0 rounded-full"
                    title="Play pronunciation"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                  </Button>
                )}
                
                <span className="text-lg text-muted-foreground font-mono">
                  {word.pronunciation}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {word.partOfSpeech.map((pos, index) => (
                  <Badge key={index} variant="secondary">
                    {pos}
                  </Badge>
                ))}
                
                <DifficultyBadge difficulty={word.difficulty} />
                
                {word.satLevel && (
                  <Badge variant="sat">
                    SAT Level
                  </Badge>
                )}

                {userProgress && (
                  <MasteryBadge masteryLevel={masteryLevel} />
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleBookmarkClick}
              className={cn(
                "h-10 w-10 p-0 rounded-full",
                isBookmarked && "text-yellow-500 hover:text-yellow-600"
              )}
              title={isBookmarked ? "Remove bookmark" : "Bookmark word"}
            >
              <svg 
                className="h-5 w-5" 
                fill={isBookmarked ? "currentColor" : "none"}
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" 
                />
              </svg>
            </Button>
          </div>
        </ModalHeader>

        <ModalBody>
          {/* Progress Section */}
          {userProgress && (
            <div className="mb-6 p-4 bg-accent/30 rounded-lg">
              <h4 className="font-medium mb-3">Your Progress</h4>
              <LearningProgress
                wordsLearned={userProgress.correctAttempts}
                totalWords={userProgress.totalAttempts || 1}
                masteryLevel={masteryLevel}
              />
              <div className="grid grid-cols-3 gap-4 mt-3 text-center text-sm">
                <div>
                  <div className="font-medium text-foreground">{userProgress.correctAttempts}</div>
                  <div className="text-muted-foreground">Correct</div>
                </div>
                <div>
                  <div className="font-medium text-foreground">{userProgress.streak}</div>
                  <div className="text-muted-foreground">Streak</div>
                </div>
                <div>
                  <div className="font-medium text-foreground">
                    {Math.round(masteryLevel * 100)}%
                  </div>
                  <div className="text-muted-foreground">Mastery</div>
                </div>
              </div>
            </div>
          )}

          {/* Categories and Frequency */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Categories</h4>
                <div className="flex flex-wrap gap-1">
                  {word.categories.map((category, index) => (
                    <Badge key={index} variant="category" size="sm">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Word Statistics</h4>
                <div className="space-y-1 text-sm">
                  <div>Frequency: {word.frequency}/10</div>
                  <div>Sources: {word.sources.length}</div>
                  {word.apiSource && <div>API: {word.apiSource}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b">
            {tabButton('definitions', 'Definitions', word.definitions.length)}
            {tabButton('examples', 'Examples', word.examples.length)}
            {tabButton('articles', 'In Context', relatedArticles.length)}
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px]">
            {activeTab === 'definitions' && (
              <div className="space-y-4">
                {word.definitions.map((definition, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary" size="sm">
                        {definition.partOfSpeech}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {definition.source}
                      </span>
                    </div>
                    <p className="text-foreground leading-relaxed">
                      {definition.text}
                    </p>
                  </div>
                ))}

                {/* Etymology */}
                {word.etymology && (
                  <div className="p-4 bg-accent/30 rounded-lg">
                    <h4 className="font-medium mb-2">Etymology</h4>
                    <p className="text-sm">
                      <span className="font-medium">{word.etymology.origin}</span>
                      {" "}({word.etymology.language}) - {word.etymology.meaning}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'examples' && (
              <div className="space-y-3">
                {word.examples.map((example, index) => (
                  <div key={index} className="p-3 border-l-4 border-primary bg-accent/20 rounded-r-lg">
                    <p className="italic text-foreground">"{example}"</p>
                  </div>
                ))}
                {word.examples.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No examples available for this word.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'articles' && (
              <div className="space-y-3">
                {relatedArticles.map((article, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <h5 className="font-medium mb-2">{article.title}</h5>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {article.content.substring(0, 150)}...
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {article.source} • {new Date(article.publishedAt).toLocaleDateString()}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewInContext?.(article.id)}
                      >
                        Read Article
                      </Button>
                    </div>
                  </div>
                ))}
                {relatedArticles.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No related articles found for this word.
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleQuizClick} variant="default">
              Start Quiz
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    )
  }
)
WordDetailModal.displayName = "WordDetailModal"
