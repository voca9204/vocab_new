'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { RefreshCw, Users } from 'lucide-react'
import {
  sharedExamService,
  type SharedExam,
  type SharedExamResult,
} from '@/lib/services/shared-exam-service'

type State = 'loading' | 'notfound' | 'ready'

export default function SharedExamResultsPage() {
  const params = useParams()
  const examId = (params?.examId as string) || ''

  const [state, setState] = useState<State>('loading')
  const [exam, setExam] = useState<SharedExam | null>(null)
  const [results, setResults] = useState<SharedExamResult[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    if (!examId) return
    const e = await sharedExamService.getSharedExam(examId)
    if (!e) { setState('notfound'); return }
    setExam(e)
    const r = await sharedExamService.listResults(examId)
    setResults(r)
    setState('ready')
  }

  useEffect(() => {
    load().catch(() => setState('notfound'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId])

  const refresh = async () => {
    setRefreshing(true)
    try {
      setResults(await sharedExamService.listResults(examId))
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

  // 점수 높은 순 정렬 (정확도 기준)
  const ranked = [...results].sort((a, b) => {
    const aa = a.total ? a.score / a.total : 0
    const bb = b.total ? b.score / b.total : 0
    return bb - aa
  })
  const avg =
    results.length > 0
      ? Math.round((results.reduce((s, r) => s + (r.total ? r.score / r.total : 0), 0) / results.length) * 100)
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

      {ranked.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">아직 응시한 사람이 없습니다.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {ranked.map((r, idx) => {
                const acc = r.total ? Math.round((r.score / r.total) * 100) : 0
                return (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-semibold text-gray-400 w-5 text-right shrink-0">{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{r.takerName}</p>
                        <p className="text-xs text-gray-400">
                          {r.submittedAt ? new Date(r.submittedAt).toLocaleString('ko-KR') : ''}
                        </p>
                      </div>
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
