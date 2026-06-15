'use client'

import type { UnifiedWord } from '@/types/unified-word'
import { getFieldString } from '@/lib/utils/word-field-normalizer'

interface ExamPrintViewProps {
  title: string
  words: UnifiedWord[]
}

/**
 * 인쇄 전용 단어 목록 (단어 + 뜻). 화면에서는 숨기고 인쇄 시에만 표시(print:block).
 * 2열(columns-2) compact 레이아웃으로 한 페이지에 최대한 빽빽이 채워, 단어 수가
 * 적은 줄에서 페이지가 낭비되지 않도록 한다. 각 항목은 줄바꿈으로 잘리지 않음.
 * globals.css의 @media print 격리(.print-area)와 함께 앱 크롬 없이 목록만 출력.
 */
export function ExamPrintView({ title, words }: ExamPrintViewProps) {
  return (
    <div className="print-area hidden print:block p-5 text-black">
      <h1 className="text-lg font-bold mb-0.5">{title}</h1>
      <p className="text-xs text-gray-500 mb-3">{words.length}개 단어</p>
      <div
        className="text-[11px] leading-snug"
        style={{ columnCount: 2, columnGap: '1.5rem', columnFill: 'auto' }}
      >
        {words.map((w, i) => (
          <div
            key={w.id}
            className="flex gap-1.5 py-0.5 border-b border-gray-200"
            style={{ breakInside: 'avoid' }}
          >
            <span className="text-gray-400 shrink-0 w-5 text-right">{i + 1}</span>
            <span className="min-w-0">
              <span className="font-semibold">{w.word}</span>
              <span className="text-gray-700">{'  '}— {getFieldString(w.definition)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
