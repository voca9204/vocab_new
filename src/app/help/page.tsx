'use client'

import { Button } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeft,
  BookOpen,
  Target,
  TrendingUp,
  RotateCw,
  Star,
  Brain,
  Clock,
  Lightbulb,
  Info
} from 'lucide-react'

export default function HelpPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          돌아가기
        </Button>
        <h1 className="text-3xl font-bold">학습 도움말</h1>
      </div>

      {/* 소개 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            SAT 어휘 학습 시스템 소개
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">
            이 시스템은 효과적인 SAT 어휘 학습을 위해 과학적인 학습 방법론을 적용한 플랫폼입니다. 
            간격 반복 학습법(Spaced Repetition)과 능동적 회상(Active Recall) 원리를 기반으로 
            장기 기억 형성을 돕습니다.
          </p>
        </CardContent>
      </Card>

      {/* 학습 상태 용어 설명 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            학습 상태 분류
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              미학습 (Not Studied)
            </h3>
            <p className="text-gray-700 ml-4">
              • 아직 한 번도 학습하지 않은 단어<br />
              • 복습 횟수(Review Count): 0회<br />
              • 새로운 단어를 학습할 준비가 된 상태
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              학습완료 (Studied)
            </h3>
            <p className="text-gray-700 ml-4">
              • 최소 1회 이상 학습한 단어<br />
              • 복습 횟수(Review Count): 1회 이상<br />
              • 지속적인 복습이 필요한 상태
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              마스터 (Mastered)
            </h3>
            <p className="text-gray-700 ml-4">
              • 숙련도(Mastery Level) 80% 이상 달성<br />
              • 장기 기억에 안정적으로 저장된 상태<br />
              • 주기적인 재확인만 필요한 단계
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 핵심 지표 설명 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            핵심 학습 지표
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              숙련도 (Mastery Level)
            </h3>
            <p className="text-gray-700">
              • 0-100% 척도로 단어 습득 정도를 표시<br />
              • 정답률, 학습 빈도, 마지막 학습 시간을 종합적으로 계산<br />
              • 80% 이상: 마스터 단계<br />
              • 50-79%: 중급 숙련도<br />
              • 50% 미만: 추가 학습 필요
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <RotateCw className="h-4 w-4 text-blue-600" />
              복습 횟수 (Review Count)
            </h3>
            <p className="text-gray-700">
              • 해당 단어를 학습한 총 횟수<br />
              • 플래시카드, 퀴즈 등 모든 학습 활동 포함<br />
              • 많을수록 장기 기억 형성에 유리
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              마지막 학습 시간 (Last Studied)
            </h3>
            <p className="text-gray-700">
              • 가장 최근에 학습한 날짜와 시간<br />
              • 간격 반복 학습법의 핵심 지표<br />
              • 오래될수록 복습의 필요성 증가
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 학습 방법론 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-pink-500" />
            과학적 학습 방법론
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">간격 반복 학습법 (Spaced Repetition)</h3>
            <p className="text-gray-700 mb-3">
              기억이 희미해지기 직전에 복습하여 장기 기억을 강화하는 방법입니다.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">권장 복습 주기:</p>
              • 1일 후 → 3일 후 → 7일 후 → 14일 후 → 30일 후
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">능동적 회상 (Active Recall)</h3>
            <p className="text-gray-700">
              • 단순히 읽기만 하지 않고 능동적으로 기억을 끄집어내는 학습<br />
              • 플래시카드: 단어를 보고 뜻을 회상<br />
              • 퀴즈: 다양한 형식으로 단어 지식 테스트<br />
              • 문맥 학습: 실제 문장에서 단어 의미 파악
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">다감각 학습 (Multi-sensory Learning)</h3>
            <p className="text-gray-700">
              • 시각: 단어 카드와 예문 읽기<br />
              • 청각: 발음 듣기 기능 활용<br />
              • 운동감각: 직접 타이핑하며 학습<br />
              • 문맥: 뉴스 기사에서 실제 사용 예시 확인
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 학습 팁 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            효과적인 학습 팁
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>매일 꾸준히 10-20개씩 학습하는 것이 한 번에 많이 하는 것보다 효과적</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>새로운 단어 학습과 복습을 7:3 비율로 균형 있게 진행</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>어원(Etymology)을 함께 학습하면 연관 단어 암기에 도움</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>예문을 소리 내어 읽으며 문맥 속에서 단어 의미 파악</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>유사어(Synonyms)와 반의어(Antonyms)를 함께 학습하여 어휘력 확장</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* 난이도 설명 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            단어 난이도 기준
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="font-medium">쉬움 (1-3)</span>
              <span className="text-gray-600">: 기초 어휘, 일상적으로 사용</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="font-medium">보통 (4-7)</span>
              <span className="text-gray-600">: 중급 어휘, SAT 기본 수준</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="font-medium">어려움 (8-10)</span>
              <span className="text-gray-600">: 고급 어휘, SAT 고득점 필수</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}