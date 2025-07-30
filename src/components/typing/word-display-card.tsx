import { Card, CardContent } from '@/components/ui/card'
import { getMaskedWord, getHintDots } from '@/lib/typing-utils'
import type { VocabularyWord } from '@/types'

interface WordDisplayCardProps {
  word: VocabularyWord
  hintLevel: number
  timeElapsed: number
  nextHintIn: number
}

export function WordDisplayCard({
  word,
  hintLevel,
  timeElapsed,
  nextHintIn,
}: WordDisplayCardProps) {
  // 디버깅 로그
  console.log('WordDisplayCard props:', {
    word: word?.word,
    hintLevel,
    timeElapsed,
    nextHintIn,
    wordLength: word?.word?.length
  })
  return (
    <div className="text-center mb-8">
      <p className="text-gray-600 mb-4">다음 단어를 입력하세요:</p>
      <h2 className="text-xl font-semibold mb-2">
        {word.definitions[0]?.text || 'No definition available'}
      </h2>
      
      {word.etymology?.origin && (
        <p className="text-sm text-gray-500">{word.etymology.origin}</p>
      )}
      
      <div className="flex justify-center gap-2 mt-4">
        {word.partOfSpeech.map(pos => (
          <span 
            key={pos}
            className="text-sm px-3 py-1 rounded bg-gray-100 text-gray-700"
          >
            {pos}
          </span>
        ))}
      </div>
      
      {/* Hint Area */}
      <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-blue-600 font-medium">
            💡 힌트 ({hintLevel}/{word.word.length} 글자)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono text-purple-600">
              {getHintDots(timeElapsed)}
            </span>
            <span className="text-sm text-purple-600 font-medium">
              {hintLevel >= word.word.length 
                ? '완료!' 
                : `${nextHintIn}초`}
            </span>
          </div>
        </div>
        
        <div className="text-4xl font-mono tracking-wider text-gray-800 mb-2">
          {hintLevel === 0 
            ? '_'.repeat(word.word.length).split('').join(' ')
            : getMaskedWord(word.word, hintLevel)
          }
        </div>
        
        <div className="text-sm text-gray-600">
          총 {word.word.length}글자 단어 • 난이도: {word.difficulty}/10
        </div>
      </div>
    </div>
  )
}