'use client'

import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { UnifiedWord } from '@/types/unified-word'
import { cn } from '@/lib/utils'

interface VirtualWordListProps {
  words: UnifiedWord[]
  onWordClick?: (word: UnifiedWord) => void
  className?: string
  itemHeight?: number
  overscan?: number
}

function VirtualWordListBase({
  words,
  onWordClick,
  className,
  itemHeight = 120, // Estimated height for word cards
  overscan = 5 // Number of items to render outside of view
}: VirtualWordListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: words.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  })
  
  const items = virtualizer.getVirtualItems()
  
  if (words.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        단어가 없습니다
      </div>
    )
  }
  
  return (
    <div
      ref={parentRef}
      className={cn(
        "h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100",
        className
      )}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualItem) => {
          const word = words[virtualItem.index]
          
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="p-2">
                <WordCard
                  word={word}
                  onClick={() => onWordClick?.(word)}
                />
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Loading indicator when scrolling */}
      {virtualizer.isScrolling && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
          스크롤 중...
        </div>
      )}
    </div>
  )
}

// Lightweight word card component optimized for virtual scrolling
interface WordCardProps {
  word: UnifiedWord
  onClick?: () => void
}

const WordCard = React.memo(function WordCard({ word, onClick }: WordCardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer border border-gray-200"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {word.word}
        </h3>
        {word.pronunciation && (
          <span className="text-sm text-gray-500">
            [{word.pronunciation}]
          </span>
        )}
      </div>
      
      <p className="text-gray-700 mb-2 line-clamp-2">
        {word.definition || word.englishDefinition || 'No definition available'}
      </p>
      
      {word.partOfSpeech && word.partOfSpeech.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {word.partOfSpeech.map((pos, idx) => (
            <span
              key={idx}
              className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
            >
              {pos}
            </span>
          ))}
        </div>
      )}
      
      <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
        <span>난이도: {word.difficulty || 5}/10</span>
        {word.quality && (
          <span className={cn(
            "px-2 py-0.5 rounded",
            word.quality.score >= 80 ? "bg-green-100 text-green-700" :
            word.quality.score >= 60 ? "bg-yellow-100 text-yellow-700" :
            "bg-red-100 text-red-700"
          )}>
            품질: {word.quality.score}%
          </span>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Only re-render if word ID or key properties change
  return (
    prevProps.word.id === nextProps.word.id &&
    prevProps.word.word === nextProps.word.word &&
    prevProps.word.definition === nextProps.word.definition &&
    prevProps.word.quality?.score === nextProps.word.quality?.score
  )
})

// Export memoized VirtualWordList
export const VirtualWordList = React.memo(VirtualWordListBase, (prevProps, nextProps) => {
  // Only re-render if words array reference or length changes
  return (
    prevProps.words === nextProps.words &&
    prevProps.className === nextProps.className &&
    prevProps.itemHeight === nextProps.itemHeight &&
    prevProps.overscan === nextProps.overscan
  )
})