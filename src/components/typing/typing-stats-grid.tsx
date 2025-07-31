import { Card, CardContent } from '@/components/ui/card'
import { Keyboard, CheckCircle, Clock, Eye } from 'lucide-react'

interface TypingStatsGridProps {
  currentWordIndex: number
  totalWords: number
  accuracy: number
  timeElapsed: number
  nextHintIn: number
}

export function TypingStatsGrid({
  currentWordIndex,
  totalWords,
  accuracy,
  timeElapsed,
  nextHintIn,
}: TypingStatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 text-center relative">
          <Keyboard className="absolute top-4 right-4 h-6 w-6 text-blue-600 opacity-20" />
          <p className="text-sm text-gray-600">진행률</p>
          <p className="text-2xl font-bold mt-1">
            {currentWordIndex + 1}/{totalWords}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center relative">
          <CheckCircle className="absolute top-4 right-4 h-6 w-6 text-green-600 opacity-20" />
          <p className="text-sm text-gray-600">정확도</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{accuracy}%</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center relative">
          <Clock className="absolute top-4 right-4 h-6 w-6 text-orange-600 opacity-20" />
          <p className="text-sm text-gray-600">경과 시간</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{timeElapsed}초</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center relative">
          <Eye className="absolute top-4 right-4 h-6 w-6 text-purple-600 opacity-20" />
          <p className="text-sm text-gray-600">다음 힌트</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{nextHintIn}초</p>
        </CardContent>
      </Card>
    </div>
  )
}