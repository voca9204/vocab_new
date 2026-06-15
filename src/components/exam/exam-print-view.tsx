'use client'

import type { UnifiedWord } from '@/types/unified-word'
import { getFieldString } from '@/lib/utils/word-field-normalizer'

interface ExamPrintViewProps {
  title: string
  words: UnifiedWord[]
}

/**
 * 인쇄 전용 단어 목록 (단어 + 뜻). 화면에서는 숨기고 인쇄 시에만 표시(print:block).
 * 메인 UI에는 print:hidden을 적용해, window.print() 시 이 목록만 출력되도록 한다.
 */
export function ExamPrintView({ title, words }: ExamPrintViewProps) {
  return (
    <div className="print-area hidden print:block p-6 text-black">
      <h1 className="text-xl font-bold mb-1">{title}</h1>
      <p className="text-sm text-gray-500 mb-4">{words.length}개 단어</p>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {words.map((w, i) => (
            <tr key={w.id} className="border-b border-gray-300 break-inside-avoid">
              <td className="py-1 pr-2 align-top w-8 text-gray-500">{i + 1}</td>
              <td className="py-1 pr-4 align-top font-semibold w-40">{w.word}</td>
              <td className="py-1 align-top">{getFieldString(w.definition)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
