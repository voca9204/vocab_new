import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProgressBar } from "@/components/ui/progress-bar"
import { cn } from "@/lib/utils"
import type { VocabularyWord } from "@/types"

interface VocabularyCardProps extends React.HTMLAttributes<HTMLDivElement> {
  word: VocabularyWord
  showProgress?: boolean
  onStudy?: (wordId: string) => void
  onBookmark?: (wordId: string) => void
  isBookmarked?: boolean
}

const VocabularyCard: React.FC<VocabularyCardProps> = ({
  word,
  showProgress = false,
  onStudy,
  onBookmark,
  isBookmarked = false,
  className,
  ...props
}) => {
  const handleStudy = () => {
    if (onStudy) {
      onStudy(word.id)
    }
  }

  const handleBookmark = () => {
    if (onBookmark) {
      onBookmark(word.id)
    }
  }

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)} {...props}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-1">{word.word}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="capitalize">{word.partOfSpeech}</span>
              {word.difficulty && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  Level {word.difficulty}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmark}
            className={cn(
              "text-gray-400 hover:text-gray-600",
              isBookmarked && "text-yellow-500 hover:text-yellow-600"
            )}
          >
            ★
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Definition:</p>
            <p className="text-sm text-gray-600">{word.definition}</p>
          </div>

          {word.example && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Example:</p>
              <p className="text-sm text-gray-600 italic">"{word.example}"</p>
            </div>
          )}

          {word.pronunciation && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Pronunciation:</p>
              <p className="text-sm text-gray-600 font-mono">{word.pronunciation}</p>
            </div>
          )}

          {showProgress && word.masteryLevel !== undefined && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Mastery Progress:</p>
              <ProgressBar 
                value={word.masteryLevel} 
                variant={word.masteryLevel >= 80 ? "success" : "default"}
                showLabel
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleStudy} className="flex-1">
              Study Word
            </Button>
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { VocabularyCard }
