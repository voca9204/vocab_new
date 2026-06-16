'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui'
import { Card, CardContent } from '@/components/ui/card'
import { Check, X, ArrowRight, Trophy } from 'lucide-react'
import {
  sharedExamService,
  type SharedExam,
} from '@/lib/services/shared-exam-service'

type View = 'loading' | 'notfound' | 'name' | 'test' | 'bonus' | 'done'

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
function renderPassage(sentence: string, word: string) {
  if (!word) return sentence
  const re = new RegExp(`(${escapeRegExp(word)})`, 'gi')
  return sentence.split(re).map((p, i) =>
    p.toLowerCase() === word.toLowerCase() ? <strong key={i} className="font-semibold">{p}</strong> : <span key={i}>{p}</span>
  )
}

export default function TakeSharedExamPage() {
  const params = useParams()
  const examId = (params?.examId as string) || ''

  const [view, setView] = useState<View>('loading')
  const [exam, setExam] = useState<SharedExam | null>(null)
  const [name, setName] = useState('')

  // 본 시험 상태
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [correct, setCorrect] = useState(0)

  // 보너스 상태
  const [bIndex, setBIndex] = useState(0)
  const [bSelected, setBSelected] = useState<number | null>(null)
  const [bAnswered, setBAnswered] = useState(false)
  const [bonusCorrect, setBonusCorrect] = useState(0)

  const [submitting, setSubmitting] = useState(false)

  // 풀스크린 응시 중에는 하단 모바일 네비 숨김
  useEffect(() => {
    if (view === 'test' || view === 'bonus') {
      document.body.classList.add('exam-fullscreen')
      return () => document.body.classList.remove('exam-fullscreen')
    }
  }, [view])

  useEffect(() => {
    let cancelled = false
    if (!examId) return
    sharedExamService
      .getSharedExam(examId)
      .then((e) => {
        if (cancelled) return
        if (!e || !e.questions?.length) setView('notfound')
        else { setExam(e); setView('name') }
      })
      .catch(() => { if (!cancelled) setView('notfound') })
    return () => { cancelled = true }
  }, [examId])

  if (view === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">불러오는 중…</div>
  }
  if (view === 'notfound' || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold mb-1">시험을 찾을 수 없어요</p>
          <p className="text-gray-500 text-sm">링크가 만료되었거나 잘못된 주소입니다.</p>
        </div>
      </div>
    )
  }

  // ----- 이름 입력 -----
  if (view === 'name') {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <h1 className="text-xl font-bold mb-1">{exam.title}</h1>
            <p className="text-sm text-gray-600 mb-5">
              총 {exam.questions.length}문제{exam.bonus.length > 0 ? ` + 보너스 ${exam.bonus.length}문제` : ''}
            </p>
            <label className="text-sm font-medium text-gray-700">이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full mt-1 mb-4 px-3 py-2.5 border rounded-lg"
              maxLength={40}
            />
            <Button
              className="w-full h-12"
              disabled={name.trim().length === 0}
              onClick={() => setView('test')}
            >
              시험 시작 <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ----- 본 시험 -----
  if (view === 'test') {
    const q = exam.questions[qIndex]
    const progress = ((qIndex + 1) / exam.questions.length) * 100
    const onAnswer = (i: number) => {
      if (answered) return
      setSelected(i)
      setAnswered(true)
      if (i === q.answer) setCorrect((c) => c + 1)
    }
    const next = () => {
      if (qIndex < exam.questions.length - 1) {
        setQIndex((i) => i + 1); setSelected(null); setAnswered(false)
      } else if (exam.bonus.length > 0) {
        setView('bonus'); setBIndex(0); setBSelected(null); setBAnswered(false)
      } else {
        finish()
      }
    }
    return (
      <div className="fixed inset-0 bg-white flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 truncate">{exam.title}</span>
            <span className="text-sm text-gray-600">{qIndex + 1} / {exam.questions.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center px-5">
          <p className="text-center text-sm text-gray-500 mb-3">뜻을 고르세요</p>
          <h2 className="text-4xl font-bold text-center mb-8 break-words">{q.word}</h2>
          <div className="space-y-3 max-w-xl w-full mx-auto">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.answer
              const isPicked = i === selected
              let cls = 'border-gray-200 bg-white hover:bg-gray-50'
              if (answered) {
                if (isCorrect) cls = 'border-green-500 bg-green-50'
                else if (isPicked) cls = 'border-red-500 bg-red-50'
                else cls = 'border-gray-200 bg-white opacity-60'
              }
              return (
                <button key={i} onClick={() => onAnswer(i)} disabled={answered}
                  className={`w-full text-left px-4 py-4 rounded-xl border-2 transition-all flex items-center justify-between ${cls}`}>
                  <span className="text-base">
                    {opt}
                    {answered && q.optionWords?.[i] && (
                      <span className="ml-1.5 text-sm font-medium text-gray-700">— {q.optionWords[i]}</span>
                    )}
                  </span>
                  {answered && isCorrect && <Check className="h-5 w-5 text-green-600 shrink-0" />}
                  {answered && isPicked && !isCorrect && <X className="h-5 w-5 text-red-600 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
        <div className="px-5 pb-6 pt-3">
          <Button className="w-full h-12 text-base" disabled={!answered} onClick={next}>
            {qIndex < exam.questions.length - 1 ? '다음' : exam.bonus.length > 0 ? '보너스 문제' : '제출'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  // ----- 보너스 (문맥 속 어휘) -----
  if (view === 'bonus') {
    const bq = exam.bonus[bIndex]
    const progress = ((bIndex + 1) / exam.bonus.length) * 100
    const isCloze = bq.format === 'cloze'
    const onAnswer = (i: number) => {
      if (bAnswered) return
      setBSelected(i); setBAnswered(true)
      if (i === bq.answer) setBonusCorrect((c) => c + 1)
    }
    const next = () => {
      if (bIndex < exam.bonus.length - 1) { setBIndex((i) => i + 1); setBSelected(null); setBAnswered(false) }
      else finish()
    }
    return (
      <div className="fixed inset-0 bg-white flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 truncate">{exam.title}</span>
            <span className="text-sm font-medium text-purple-600">보너스 {bIndex + 1} / {exam.bonus.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="max-w-xl w-full mx-auto">
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-[15px] leading-relaxed text-gray-800">
              {isCloze ? bq.passage : renderPassage(bq.passage, bq.word)}
            </div>
            <p className="mt-4 mb-3 font-medium text-gray-900">
              {isCloze ? '빈칸에 들어갈 가장 알맞은 단어는?' : <>본문에서 <span className="font-bold">'{bq.word}'</span>의 의미로 가장 가까운 것은?</>}
            </p>
            <div className="space-y-3">
              {bq.options.map((opt, i) => {
                const isCorrect = i === bq.answer
                const isPicked = i === bSelected
                let cls = 'border-gray-200 bg-white hover:bg-gray-50'
                if (bAnswered) {
                  if (isCorrect) cls = 'border-green-500 bg-green-50'
                  else if (isPicked) cls = 'border-red-500 bg-red-50'
                  else cls = 'border-gray-200 bg-white opacity-60'
                }
                return (
                  <button key={i} onClick={() => onAnswer(i)} disabled={bAnswered}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all flex items-center justify-between ${cls}`}>
                    <span className="text-base"><span className="text-gray-400 mr-2">{String.fromCharCode(65 + i)}</span>{opt}</span>
                    {bAnswered && isCorrect && <Check className="h-5 w-5 text-green-600 shrink-0" />}
                    {bAnswered && isPicked && !isCorrect && <X className="h-5 w-5 text-red-600 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="px-5 pb-6 pt-3 border-t">
          <Button className="w-full h-12 text-base" disabled={!bAnswered} onClick={next}>
            {bIndex < exam.bonus.length - 1 ? '다음' : '제출'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  // ----- 완료 -----
  if (view === 'done') {
    const accuracy = exam.questions.length ? Math.round((correct / exam.questions.length) * 100) : 0
    return (
      <div className="min-h-screen flex items-center justify-center px-5 bg-gray-50">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <Trophy className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
            <h1 className="text-2xl font-bold">제출 완료!</h1>
            <p className="text-gray-600 mt-2">{name} 님</p>
            <p className="text-lg mt-3">{correct} / {exam.questions.length} 정답 · 정확도 {accuracy}%</p>
            {exam.bonus.length > 0 && (
              <p className="text-purple-600 text-sm mt-1">보너스 {bonusCorrect} / {exam.bonus.length} 정답</p>
            )}
            <p className="text-sm text-gray-400 mt-5 mb-4">결과가 출제자에게 전송되었습니다.</p>
            <Button variant="outline" className="w-full" onClick={() => (window.location.href = `/exam/${exam.id}/results`)}>
              전체 결과 보기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // submit + done
  async function finish() {
    if (submitting) return
    setSubmitting(true)
    try {
      await sharedExamService.submitResult(exam!.id, exam!.ownerId, {
        takerName: name.trim().slice(0, 40),
        score: correct,
        total: exam!.questions.length,
        bonusScore: bonusCorrect,
        bonusTotal: exam!.bonus.length,
      })
    } catch (e) {
      console.error('[take] submit error:', e)
    } finally {
      setView('done')
    }
  }

  return null
}
