import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { Trophy, RotateCcw } from 'lucide-react'
import type { TypingResult } from '@/hooks/use-typing-practice'

interface PracticeCompleteScreenProps {
  results: TypingResult[]
  accuracy: number
  avgTime: string
  avgHints: string
  correctCount: number
  totalWords: number
  onRestart: () => void
  onGoToStudy: () => void
}

export function PracticeCompleteScreen({
  results,
  accuracy,
  avgTime,
  avgHints,
  correctCount,
  totalWords,
  onRestart,
  onGoToStudy,
}: PracticeCompleteScreenProps) {
  const incorrectResults = results.filter(r => !r.correct)

  return (
    <Card>
      <CardHeader className="text-center">
        <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
        <CardTitle className="text-2xl">타이핑 연습 완료!</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">정확도</p>
              <p className="text-3xl font-bold text-blue-600">{accuracy}%</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">평균 시간</p>
              <p className="text-3xl font-bold text-green-600">{avgTime}초</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">완료 단어</p>
              <p className="text-3xl font-bold text-purple-600">{correctCount}/{totalWords}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">평균 힌트</p>
              <p className="text-3xl font-bold text-orange-600">{avgHints}개</p>
            </div>
          </div>
          
          {/* Incorrect words list */}
          {incorrectResults.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">틀린 단어</h3>
              <div className="space-y-2">
                {incorrectResults.map((result, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded">
                    <div>
                      <span className="font-medium">{result.word.word}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        (입력: {result.typed || '(비어있음)'})
                      </span>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-red-600">{result.time.toFixed(1)}초</div>
                      <div className="text-gray-500">힌트 {result.hintsUsed}개</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-4 mt-6">
            <Button className="flex-1" onClick={onRestart}>
              <RotateCcw className="h-4 w-4 mr-2" />
              새로운 단어로 연습
            </Button>
            <Button variant="outline" className="flex-1" onClick={onGoToStudy}>
              학습 메뉴로
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}