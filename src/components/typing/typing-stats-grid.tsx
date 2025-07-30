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
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">진행률</p>
              <p className="text-2xl font-bold">
                {currentWordIndex + 1}/{totalWords}
              </p>
            </div>
            <Keyboard className="h-8 w-8 text-blue-600 opacity-20" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">정확도</p>
              <p className="text-2xl font-bold text-green-600">{accuracy}%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">경과 시간</p>
              <p className="text-2xl font-bold text-orange-600">{timeElapsed}초</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600 opacity-20" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">다음 힌트</p>
              <p className="text-2xl font-bold text-purple-600">{nextHintIn}초</p>
            </div>
            <Eye className="h-8 w-8 text-purple-600 opacity-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}