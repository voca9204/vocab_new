import { CheckCircle, XCircle } from 'lucide-react'
import type { TypingResult } from '@/hooks/use-typing-practice'

interface TypingResultDisplayProps {
  result: TypingResult
}

export function TypingResultDisplay({ result }: TypingResultDisplayProps) {
  const typedCorrectly = result.typed.toLowerCase() === result.word.word.toLowerCase()
  const allHintsUsed = result.hintsUsed >= result.word.word.length
  
  const getResultMessage = () => {
    if (result.correct) {
      return '정답!'
    } else if (typedCorrectly && allHintsUsed) {
      return '오답! (모든 힌트 사용됨)'
    } else {
      return '오답!'
    }
  }

  return (
    <div className={`mt-4 p-4 rounded-lg ${
      result.correct
        ? 'bg-green-50 border border-green-200'
        : 'bg-red-50 border border-red-200'
    }`}>
      <div className="flex items-center justify-center gap-2 mb-2">
        {result.correct ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        )}
        <span className={`font-semibold ${
          result.correct
            ? 'text-green-600'
            : 'text-red-600'
        }`}>
          {getResultMessage()}
        </span>
      </div>
      
      <div className="text-center">
        <p className="text-lg font-mono">
          정답: <strong>{result.word.word}</strong>
        </p>
        {!result.correct && (
          <p className="text-sm text-red-600 mt-1">
            입력: {result.typed || '(비어있음)'}
            {typedCorrectly && allHintsUsed && (
              <span className="block text-xs text-orange-600 mt-1">
                ※ 철자는 맞지만 모든 힌트를 사용했습니다
              </span>
            )}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          힌트 사용: {result.hintsUsed}/{result.word.word.length} 글자 ({result.time.toFixed(1)}초)
        </p>
      </div>
    </div>
  )
}