// News Components - Article Card

import * as React from 'react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Badge, DifficultyBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { ProcessedNewsArticle } from '@/types/news'
import { cn } from '@/lib/utils'

export interface NewsArticleCardProps {
  article: ProcessedNewsArticle
  onRead?: (articleId: string) => void
  onWordClick?: (wordId: string) => void
  onBookmark?: (articleId: string) => void
  showSATWords?: boolean
  compact?: boolean
  className?: string
}

export const NewsArticleCard = React.forwardRef<HTMLDivElement, NewsArticleCardProps>(
  ({ 
    article, 
    onRead, 
    onWordClick, 
    onBookmark,
    showSATWords = true,
    compact = false,
    className,
    ...props 
  }, ref) => {
    const [isBookmarked, setIsBookmarked] = React.useState(false)
    const [showFullSummary, setShowFullSummary] = React.useState(false)

    const handleReadClick = () => {
      onRead?.(article.id)
    }

    const handleBookmarkClick = () => {
      setIsBookmarked(!isBookmarked)
      onBookmark?.(article.id)
    }

    const formatTimeAgo = (date: Date) => {
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)

      if (diffDays > 7) {
        return date.toLocaleDateString()
      } else if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      } else {
        return 'Just now'
      }
    }

    const getQualityColor = (quality: number) => {
      if (quality >= 8) return 'text-green-600 dark:text-green-400'
      if (quality >= 6) return 'text-orange-600 dark:text-orange-400'
      return 'text-red-600 dark:text-red-400'
    }

    const summary = showFullSummary ? article.summary : 
      article.summary.length > 120 ? `${article.summary.substring(0, 120)}...` : article.summary

    return (
      <Card
        ref={ref}
        variant="interactive"
        className={cn(
          "group transition-all duration-200 hover:shadow-lg",
          compact && "p-4",
          className
        )}
        {...props}
      >
        <CardHeader className={compact ? "p-0 pb-3" : ""}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-primary">
                  {article.source}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(article.publishedAt)}
                </span>
                {article.ageAppropriate && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <Badge variant="success" size="sm">
                      Age Appropriate
                    </Badge>
                  </>
                )}
              </div>

              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                {article.title}
              </h3>

              <div className="flex flex-wrap gap-2 mb-3">
                {showSATWords && (
                  <Badge variant="outline" size="sm">
                    {article.satWordCount} SAT words
                  </Badge>
                )}
                
                <DifficultyBadge difficulty={article.difficulty} size="sm" />
                
                <Badge 
                  variant="outline" 
                  size="sm"
                  className={getQualityColor(article.contentQuality)}
                >
                  Quality: {article.contentQuality}/10
                </Badge>

                {article.isEducational && (
                  <Badge variant="mastery" size="sm">
                    Educational
                  </Badge>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-3">
                {article.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="category" size="sm">
                    {tag}
                  </Badge>
                ))}
                {article.tags.length > 3 && (
                  <Badge variant="outline" size="sm">
                    +{article.tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleBookmarkClick}
              className={cn(
                "h-8 w-8 p-0 rounded-full flex-shrink-0",
                isBookmarked && "text-yellow-500 hover:text-yellow-600"
              )}
              title={isBookmarked ? "Remove bookmark" : "Bookmark article"}
            >
              <svg 
                className="h-4 w-4" 
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
        </CardHeader>

        <CardContent className={compact ? "p-0 pb-3" : "pt-0"}>
          {/* Summary */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {summary}
            {article.summary.length > 120 && (
              <button
                onClick={() => setShowFullSummary(!showFullSummary)}
                className="ml-1 text-primary hover:underline"
              >
                {showFullSummary ? 'Show less' : 'Read more'}
              </button>
            )}
          </p>

          {/* SAT Words Preview */}
          {showSATWords && article.satWords.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">SAT Words in this article:</h4>
              <div className="flex flex-wrap gap-1">
                {article.satWords.slice(0, 6).map((word, index) => (
                  <button
                    key={index}
                    onClick={() => onWordClick?.(word)}
                    className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
                  >
                    {word}
                  </button>
                ))}
                {article.satWords.length > 6 && (
                  <span className="px-2 py-1 text-xs text-muted-foreground">
                    +{article.satWords.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Reading Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Reading time</span>
              <span className="text-xs text-muted-foreground">
                {article.readingTime} min • {article.wordCount} words
              </span>
            </div>
            <Progress
              value={article.satWordDensity}
              max={5} // 5% is considered high density
              variant="gradient"
              size="sm"
              className="h-1"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                SAT word density: {article.satWordDensity.toFixed(1)}%
              </span>
            </div>
          </div>
        </CardContent>

        {!compact && (
          <CardFooter className="pt-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(article.url, '_blank')}
                  className="text-xs"
                >
                  <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Original
                </Button>
                
                <span className="text-xs text-muted-foreground">
                  Processed: {formatTimeAgo(article.processedAt)}
                </span>
              </div>
              
              <Button 
                onClick={handleReadClick}
                size="sm"
                variant="default"
              >
                Read with SAT Words
                <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    )
  }
)
NewsArticleCard.displayName = "NewsArticleCard"
