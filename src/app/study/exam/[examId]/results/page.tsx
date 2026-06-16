'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { RefreshCw, Users } from 'lucide-react'
import {
  sharedExamService,
  type SharedExam,
  type SharedExamResult,
} from '@/lib/services/shared-exam-service'

type State = 'loading' | 'forbidden' | 'notfound' | 'ready'

export default function SharedExamResultsPage() {
  const params = useParams()
  const examId = (params?.examId as string) || ''
  const { user, loading: authLoading } = useAuth()

  const [state, setState] = useState<State>('loading')
  const [exam, setExam] = useState<SharedExam | null>(null)
  const [results, setResults] = useState<SharedExamResult[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    if (!examId) return
    const e = await sharedExamService.getSharedExam(examId)
    if (!e) { setState('notfound'); return }
    setExam(e)
    if (!user || user.uid !== e.ownerId) { setState('forbidden'); return }
    const r = await sharedExamService.listResults(examId)
    setResults(r)
    setState('ready')
  }

  useEffect(() => {
    if (authLoading) return // auth 로딩 대기
    load().catch(() => setState('notfound'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, user, authLoading])

  const refresh = async () => {
    setRefreshing(true)
    try {
      const r = await sharedExamService.listResults(examId)
      setResults(r)
    } finally {
      setRefreshing(false)
    }
  }

  if (state === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">불러오는 중…</div>
  }
  if (state === 'notfound') {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">시험을 찾을 수 없습니다.</div>
  }
  if (state === 'forbidden') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold mb-1">권한이 없습니다</p>
          <p className="text-gray-500 text-sm">출제자 본인만 결과를 볼 수 있습니다. 로그인 상태를 확인하세요.</p>
        </div>
      </div>
    )
  }

  const avg =
    results.length > 0
      ? Math.round(
          (results.reduce((s, r) => s + (r.total ? r.score / r.total : 0), 0) / results.length) * 100
        )
      : 0

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-xl font-bold">{exam?.title} · 응시 결과</h1>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <p className="text-sm text-gray-500 mb-5 flex items-center gap-1">
        <Users className="h-4 w-4" /> 응시 {results.length}명 · 평균 정확도 {avg}%
      </p>

      {results.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">아직 응시한 사람이 없습니다.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {results.map((r) => {
                const acc = r.total ? Math.round((r.score / r.total) * 100) : 0
                return (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.takerName}</p>
                      <p className="text-xs text-gray-400">
                        {r.submittedAt ? new Date(r.submittedAt).toLocaleString('ko-KR') : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">
                        {r.score} / {r.total}
                        <span className="text-gray-400 font-normal"> ({acc}%)</span>
                      </p>
                      {r.bonusTotal > 0 && (
                        <p className="text-xs text-purple-600">보너스 {r.bonusScore} / {r.bonusTotal}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
