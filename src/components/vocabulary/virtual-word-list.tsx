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
  columns?: 1 | 2 | 3 // 컬럼 수 설정
}

function VirtualWordListBase({
  words,
  onWordClick,
  className,
  itemHeight = 140, // Estimated height for word cards (increased for better spacing)
  overscan = 5, // Number of items to render outside of view
  columns = 1 // Default to 1 column for mobile
}: VirtualWordListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  // 반응형 컬럼 수 결정
  const [responsiveColumns, setResponsiveColumns] = React.useState(1)

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 768) {
        setResponsiveColumns(1) // 모바일: 1개
      } else if (width < 1280) {
        setResponsiveColumns(2) // 태블릿/작은 데스크톱: 2개
      } else {
        setResponsiveColumns(3) // 큰 데스크톱: 3개
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const actualColumns = columns || responsiveColumns
  const rowCount = Math.ceil(words.length / actualColumns)

  const virtualizer = useVirtualizer({
    count: rowCount,
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
        {items.map((virtualRow) => {
          const startIndex = virtualRow.index * actualColumns
          const endIndex = Math.min(startIndex + actualColumns, words.length)
          const rowWords = words.slice(startIndex, endIndex)

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className={cn(
                "grid gap-4 p-2",
                actualColumns === 1 && "grid-cols-1",
                actualColumns === 2 && "grid-cols-2",
                actualColumns === 3 && "grid-cols-3"
              )}>
                {rowWords.map((word, idx) => (
                  <WordCard
                    key={`${virtualRow.index}-${idx}`}
                    word={word}
                    onClick={() => onWordClick?.(word)}
                  />
                ))}
                {/* 빈 셀 채우기 (마지막 행에서 필요한 경우) */}
                {rowWords.length < actualColumns && Array.from({ length: actualColumns - rowWords.length }).map((_, idx) => (
                  <div key={`empty-${idx}`} />
                ))}
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
      className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 p-4 cursor-pointer border border-gray-200 hover:border-blue-300 h-full flex flex-col"
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
      
      <p className="text-gray-700 mb-2 line-clamp-2 flex-grow">
        {word.definition || word.englishDefinition || 'No definition available'}
      </p>
      
      {word.partOfSpeech && (
        <div className="flex gap-1 flex-wrap">
          {(() => {
            const parts = Array.isArray(word.partOfSpeech) 
              ? word.partOfSpeech 
              : typeof word.partOfSpeech === 'string' 
                ? [word.partOfSpeech] 
                : [];
            return parts.map((pos, idx) => (
              <span
                key={idx}
                className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
              >
                {pos}
              </span>
            ));
          })()}
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