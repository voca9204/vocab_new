'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UnifiedWord } from '@/types/unified-word'
import { getFieldString } from '@/lib/utils/word-field-normalizer'
import { formatPartOfSpeech } from '@/lib/utils/part-of-speech'

interface ExamPrintViewProps {
  title: string
  words: UnifiedWord[]
}

const PER_PAGE = 25

/**
 * 인쇄 전용 단어 목록 (단어 + 품사 + 뜻 + 유의어).
 * body 직속으로 포털해, 인쇄 시 앱 레이아웃을 숨기고(globals.css의 @media print)
 * 이 목록만 출력한다. 페이지당 25개씩 끊어 강제 분할하고 줄 간격을 넉넉히 둔다.
 * 화면에서는 hidden, 인쇄 시에만 print:block.
 */
export function ExamPrintView({ title, words }: ExamPrintViewProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  // 25개씩 페이지 단위로 분할
  const pages: UnifiedWord[][] = []
  for (let i = 0; i < words.length; i += PER_PAGE) {
    pages.push(words.slice(i, i + PER_PAGE))
  }

  const content = (
    <div className="print-area hidden print:block text-black">
      {pages.map((pageWords, pageIdx) => (
        <div
          key={pageIdx}
          className="p-6"
          // 마지막 페이지 외에는 다음 단어 묶음을 새 페이지로
          style={pageIdx < pages.length - 1 ? { breakAfter: 'page' } : undefined}
        >
          <h1 className="text-lg font-bold mb-0.5">{title}</h1>
          <p className="text-xs text-gray-500 mb-4">
            {words.length}개 단어 · {pageIdx + 1}/{pages.length} 페이지
          </p>
          <div className="text-[11pt] leading-relaxed">
            {pageWords.map((w, i) => {
              const pos = formatPartOfSpeech(w.partOfSpeech)
              const synonyms = (Array.isArray(w.synonyms) ? w.synonyms : []).slice(0, 2).map(String)
              const num = pageIdx * PER_PAGE + i + 1
              return (
                <div
                  key={w.id}
                  className="flex gap-2 py-2 border-b border-gray-200"
                  style={{ breakInside: 'avoid' }}
                >
                  <span className="text-gray-400 shrink-0 w-6 text-right">{num}</span>
                  <span className="min-w-0">
                    <span className="font-semibold">{w.word}</span>
                    {pos && <span className="text-gray-500"> ({pos})</span>}
                    <span className="text-gray-700">{'  '}— {getFieldString(w.definition)}</span>
                    {synonyms.length > 0 && (
                      <span className="text-gray-500"> · 유의어: {synonyms.join(', ')}</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  return createPortal(content, document.body)
}
