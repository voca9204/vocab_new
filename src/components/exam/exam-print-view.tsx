'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UnifiedWord } from '@/types/unified-word'
import { getFieldString } from '@/lib/utils/word-field-normalizer'

interface ExamPrintViewProps {
  title: string
  words: UnifiedWord[]
}

/**
 * 인쇄 전용 단어 목록 (단어 + 뜻).
 * body 직속으로 포털해, 인쇄 시 앱 레이아웃을 숨기고(globals.css의 @media print)
 * 이 목록만 출력한다. 2열 compact 레이아웃으로 페이지를 빽빽이 채운다.
 * 화면에서는 hidden, 인쇄 시에만 print:block.
 */
export function ExamPrintView({ title, words }: ExamPrintViewProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const content = (
    <div className="print-area hidden print:block p-5 text-black">
      <h1 className="text-lg font-bold mb-0.5">{title}</h1>
      <p className="text-xs text-gray-500 mb-3">{words.length}개 단어</p>
      {/* multi-column 대신 grid 2열: 인쇄 시 빈 페이지/제목 분리 없이 안정적으로 페이지네이션 */}
      <div
        className="text-[11px] leading-snug"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '1.5rem' }}
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

  return createPortal(content, document.body)
}
