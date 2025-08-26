'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, AlertTriangle, Check, Loader2 } from 'lucide-react'

interface FixResult {
  success: boolean
  totalWords: number
  fixedWords?: number
  problematicWords?: number
  failedWords?: number
  sampleFixes?: Array<{word: string, before: string, after: string}>
  sampleProblems?: Array<{word: string, definition: string, issues: string[]}>
  message: string
}

export default function FixAllWordsPage() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [checkResult, setCheckResult] = useState<FixResult | null>(null)
  const [fixResult, setFixResult] = useState<FixResult | null>(null)

  if (!user || loading) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>관리자만 접근할 수 있습니다.</p>
        <Button onClick={() => router.push('/unified-dashboard')} className="mt-4">
          대시보드로 돌아가기
        </Button>
      </div>
    )
  }

  const checkProblems = async () => {
    setIsChecking(true)
    try {
      const response = await fetch('/api/fix-all-definitions')
      const data = await response.json()
      setCheckResult(data)
    } catch (error) {
      console.error('검사 중 오류:', error)
      alert('검사 중 오류가 발생했습니다.')
    } finally {
      setIsChecking(false)
    }
  }

  const fixAllProblems = async () => {
    const confirmed = confirm(
      `정말로 ${checkResult?.problematicWords || 0}개의 문제가 있는 단어들을 모두 수정하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
    )
    if (!confirmed) return

    setIsFixing(true)
    try {
      const response = await fetch('/api/fix-all-definitions', {
        method: 'POST'
      })
      const data = await response.json()
      setFixResult(data)
      setCheckResult(null) // 검사 결과 초기화
    } catch (error) {
      console.error('수정 중 오류:', error)
      alert('수정 중 오류가 발생했습니다.')
    } finally {
      setIsFixing(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push('/settings')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          설정으로 돌아가기
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">모든 단어 정의 일괄 수정</h1>
          <p className="text-gray-600">데이터베이스의 모든 문제가 있는 정의를 한번에 수정합니다</p>
        </div>
      </div>

      {/* 안내 카드 */}
      <Card className="mb-6 border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            주의사항
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
            <li>이 작업은 데이터베이스의 모든 단어를 검사하고 수정합니다.</li>
            <li>한글 정의에 섞여있는 다른 영어 단어들을 자동으로 제거합니다.</li>
            <li>예: "습득하다, 얻다 apologize 사과하다" → "습득하다, 얻다"</li>
            <li>작업 시간은 단어 수에 따라 몇 분 정도 걸릴 수 있습니다.</li>
          </ul>
        </CardContent>
      </Card>

      {/* 검사 섹션 */}
      {!fixResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1단계: 문제 검사</CardTitle>
            <CardDescription>먼저 문제가 있는 단어들을 검사합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={checkProblems}
              disabled={isChecking}
              className="w-full"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  검사 중...
                </>
              ) : (
                '문제가 있는 단어 검사하기'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 검사 결과 */}
      {checkResult && !fixResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>검사 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-lg font-medium">
                  전체 {checkResult.totalWords}개 단어 중 <span className="text-red-600 font-bold">{checkResult.problematicWords}</span>개에서 문제 발견
                </p>
              </div>

              {checkResult.sampleProblems && checkResult.sampleProblems.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">문제 예시 (최대 10개):</h4>
                  <div className="space-y-2">
                    {checkResult.sampleProblems.map((problem, index) => (
                      <div key={index} className="bg-red-50 p-3 rounded border border-red-200">
                        <p className="font-medium">{problem.word}</p>
                        <p className="text-sm text-gray-600">{problem.definition}</p>
                        <p className="text-xs text-red-600 mt-1">
                          문제 단어: {problem.issues.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {checkResult.problematicWords && checkResult.problematicWords > 0 && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-blue-800">2단계: 일괄 수정</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={fixAllProblems}
                      disabled={isFixing}
                      variant="destructive"
                      className="w-full"
                    >
                      {isFixing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          수정 중... (잠시만 기다려주세요)
                        </>
                      ) : (
                        `${checkResult.problematicWords}개 단어 모두 수정하기`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {checkResult.problematicWords === 0 && (
                <div className="text-center py-8">
                  <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">모든 단어 정의가 정상입니다!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 수정 결과 */}
      {fixResult && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <Check className="h-5 w-5" />
              수정 완료!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <p className="text-lg">
                  전체 {fixResult.totalWords}개 단어 중 <span className="text-green-600 font-bold">{fixResult.fixedWords}</span>개 수정 완료
                </p>
                {fixResult.failedWords && fixResult.failedWords > 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    {fixResult.failedWords}개 수정 실패
                  </p>
                )}
              </div>

              {fixResult.sampleFixes && fixResult.sampleFixes.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">수정 내역 예시:</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {fixResult.sampleFixes.map((fix, index) => (
                      <div key={index} className="bg-white p-3 rounded border border-gray-200">
                        <p className="font-medium text-green-700">{fix.word}</p>
                        <p className="text-sm text-gray-500 line-through">이전: {fix.before}</p>
                        <p className="text-sm text-gray-900">이후: {fix.after}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-6">
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1"
                >
                  다시 검사하기
                </Button>
                <Button 
                  onClick={() => router.push('/unified-dashboard')}
                  className="flex-1"
                >
                  대시보드로 이동
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}