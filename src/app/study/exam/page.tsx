'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useCollectionV2 } from '@/contexts/collection-context-v2'
import { Button } from '@/components/ui'
import { Card, CardContent } from '@/components/ui/card'
import {
  ChevronLeft,
  Printer,
  Play,
  Check,
  X,
  Trophy,
  BookOpen,
  ArrowRight,
  RotateCcw,
  CalendarDays,
  Volume2,
} from 'lucide-react'
import { examPlanService, type ExamPlan, type TodayBatch, type ExamCollectionType } from '@/lib/services/exam-plan-service'
import { generateExamQuestions, type ExamQuestion } from '@/lib/exam/generate-questions'
import { ExamPrintView } from '@/components/exam/exam-print-view'
import { wordAdapterBridge } from '@/lib/adapters/word-adapter-bridge'
import { getCollectionName } from '@/lib/utils/collection-name'
import { getFieldString } from '@/lib/utils/word-field-normalizer'
import { speakText } from '@/lib/utils/speech'
import { normalizePartOfSpeech } from '@/lib/utils/part-of-speech'
import type { UnifiedWord } from '@/types/unified-word'

type View = 'loading' | 'no-collection' | 'setup' | 'overview' | 'test' | 'result'

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 단어의 예문 중 그 단어가 들어간 것을 우선 선택. 없으면 첫 예문. */
function pickExample(word: UnifiedWord): string {
  const examples = (Array.isArray(word.examples) ? word.examples : [])
    .map((e: any) => (typeof e === 'string' ? e : e?.sentence || e?.example || ''))
    .filter((s: string) => s && s.trim())
  if (examples.length === 0) return ''
  const w = (word.word || '').toLowerCase()
  return examples.find((s) => w && s.toLowerCase().includes(w)) || examples[0]
}

/** 예문에서 해당 단어를 굵게 강조해 렌더 */
function renderExample(sentence: string, word: string) {
  if (!word) return sentence
  const re = new RegExp(`(${escapeRegExp(word)})`, 'gi')
  const parts = sentence.split(re)
  return parts.map((p, i) =>
    p.toLowerCase() === word.toLowerCase() ? (
      <strong key={i} className="font-semibold text-gray-900">{p}</strong>
    ) : (
      <span key={i}>{p}</span>
    )
  )
}

function ExamPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const collectionId = searchParams.get('collectionId') || ''
  const { user } = useAuth()
  const { selectedCollections, collections } = useCollectionV2()

  const collection = useMemo(
    () =>
      selectedCollections.find((c) => c.id === collectionId) ||
      collections.find((c) => c.id === collectionId) ||
      null,
    [selectedCollections, collections, collectionId]
  )
  const [fetchedName, setFetchedName] = useState<any>(null)
  const collectionName =
    (collection?.name ? getCollectionName(collection.name) : null) ||
    (fetchedName ? getCollectionName(fetchedName) : null) ||
    '단어장'
  const collectionType: ExamCollectionType = collection?.type === 'personal' ? 'personal' : 'official'

  const [view, setView] = useState<View>('loading')
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [plan, setPlan] = useState<ExamPlan | null>(null)
  const [todayBatch, setTodayBatch] = useState<TodayBatch | null>(null)
  const [todayWords, setTodayWords] = useState<UnifiedWord[]>([])
  const [poolWords, setPoolWords] = useState<UnifiedWord[]>([])
  const [dailyCount, setDailyCount] = useState(20)

  // 테스트 상태
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongWords, setWrongWords] = useState<UnifiedWord[]>([])

  // ===== 계획 적용 + 오늘 단어 로드 =====
  const applyPlan = async (p: ExamPlan, ordered: string[]) => {
    setPlan(p)
    const batch = examPlanService.computeTodayBatch(p, ordered)
    setTodayBatch(batch)
    // 오늘 단어 + 오답 보기용 풀(컬렉션 앞부분 일부)
    const poolIds = Array.from(new Set([...batch.todayIds, ...ordered.slice(0, 12)]))
    const fetched = await wordAdapterBridge.getWordsByIds(poolIds)
    const byId = new Map(fetched.map((w) => [w.id, w]))
    setPoolWords(fetched)
    setTodayWords(batch.todayIds.map((id) => byId.get(id)).filter((w): w is UnifiedWord => Boolean(w)))
    setView('overview')
  }

  // ===== 초기화 =====
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      if (!user) return
      if (!collectionId) {
        setView('no-collection')
        return
      }
      setView('loading')
      try {
        const ordered = await examPlanService.getOrderedWordIds(collectionId, collectionType)
        if (cancelled) return
        setOrderedIds(ordered)
        // 컨텍스트에 컬렉션이 없을 때(새로고침/캐시클리어 직후) 이름 폴백
        if (!collection?.name) {
          examPlanService
            .getCollectionDisplayName(collectionId, collectionType)
            .then((nm) => { if (!cancelled && nm) setFetchedName(nm) })
            .catch(() => {})
        }
        const existing = await examPlanService.getExamPlan(user.uid, collectionId)
        if (cancelled) return
        if (!existing) {
          setView('setup')
          return
        }
        await applyPlan(existing, ordered)
      } catch (e) {
        console.error('[exam] init error:', e)
        if (!cancelled) setView('no-collection')
      }
    }
    init()
    return () => {
      cancelled = true
    }
    // collectionType은 collection 로드 후 안정화됨
  }, [user, collectionId, collectionType])

  const handleStart = async () => {
    if (!user) return
    const count = Math.max(4, Math.min(dailyCount || 20, 200))
    const created = await examPlanService.createExamPlan({
      userId: user.uid,
      collectionId,
      collectionType,
      dailyWordCount: count,
      totalWords: orderedIds.length,
    })
    await applyPlan(created, orderedIds)
  }

  const handleResetPlan = async () => {
    if (!user) return
    if (!confirm('시험 계획을 초기화하고 다시 설정할까요?')) return
    await examPlanService.deleteExamPlan(user.uid, collectionId)
    setPlan(null)
    setView('setup')
  }

  const startTest = () => {
    const qs = generateExamQuestions(todayWords, poolWords)
    setQuestions(qs)
    setQIndex(0)
    setSelected(null)
    setAnswered(false)
    setCorrectCount(0)
    setWrongWords([])
    setView('test')
  }

  const handleAnswer = (idx: number) => {
    if (answered) return
    const q = questions[qIndex]
    const isCorrect = idx === q.correctAnswer
    setSelected(idx)
    setAnswered(true)
    if (isCorrect) setCorrectCount((c) => c + 1)
    else setWrongWords((w) => [...w, q.word])

    // 진행 저장 (다른 모드와 동일 경로; quiz로 기록)
    if (user && q.word.id) {
      fetch('/api/study-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          wordId: q.word.id,
          result: isCorrect ? 'correct' : 'incorrect',
          studyType: 'quiz',
        }),
      }).catch(() => {})
    }
  }

  const nextQuestion = () => {
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1)
      setSelected(null)
      setAnswered(false)
    } else {
      setView('result')
    }
  }

  // ===== 렌더 =====
  if (!user) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="mb-4">로그인이 필요합니다.</p>
        <Button onClick={() => router.push('/login?next=/study/exam')}>로그인하기</Button>
      </div>
    )
  }

  if (view === 'loading') {
    return <div className="container mx-auto py-12 text-center text-gray-500">불러오는 중...</div>
  }

  if (view === 'no-collection') {
    return (
      <div className="container mx-auto py-12 text-center">
        <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-400" />
        <p className="text-gray-600 mb-4">먼저 단어장을 선택해주세요.</p>
        <Button onClick={() => router.push('/')}>단어장 선택하기</Button>
      </div>
    )
  }

  // ----- 테스트 화면 (모바일 전체 화면) -----
  if (view === 'test') {
    const q = questions[qIndex]
    if (!q) return null
    const progress = ((qIndex + 1) / questions.length) * 100
    return (
      <div className="fixed inset-0 z-[70] bg-white flex flex-col print:hidden">
        {/* 헤더 + 진행바 */}
        <div className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setView('overview')} className="text-gray-500 text-sm flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" /> 나가기
            </button>
            <span className="text-sm text-gray-600">
              {qIndex + 1} / {questions.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* 문제 */}
        <div className="flex-1 flex flex-col justify-center px-5">
          <p className="text-center text-sm text-gray-500 mb-3">뜻을 고르세요</p>
          <h2 className="text-4xl font-bold text-center mb-8 break-words">{q.word.word}</h2>
          <div className="space-y-3 max-w-xl w-full mx-auto">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctAnswer
              const isPicked = i === selected
              let cls = 'border-gray-200 bg-white hover:bg-gray-50'
              if (answered) {
                if (isCorrect) cls = 'border-green-500 bg-green-50'
                else if (isPicked) cls = 'border-red-500 bg-red-50'
                else cls = 'border-gray-200 bg-white opacity-60'
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={answered}
                  className={`w-full text-left px-4 py-4 rounded-xl border-2 transition-all flex items-center justify-between ${cls}`}
                >
                  <span className="text-base">{opt}</span>
                  {answered && isCorrect && <Check className="h-5 w-5 text-green-600 shrink-0" />}
                  {answered && isPicked && !isCorrect && <X className="h-5 w-5 text-red-600 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* 정답/오답 피드백 + 예문 */}
        {answered && (() => {
          const isCorrect = selected === q.correctAnswer
          const example = pickExample(q.word)
          return (
            <div className="px-5">
              <div
                className={`max-w-xl w-full mx-auto rounded-xl px-4 py-3 ${
                  isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className={`flex items-center gap-1.5 font-semibold ${isCorrect ? 'text-green-700' : 'text-red-600'}`}>
                  {isCorrect ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                  {isCorrect ? '정답!' : '오답'}
                </div>
                {example && (
                  <p className="mt-2 text-sm text-gray-700 leading-snug">
                    {renderExample(example, q.word.word)}
                  </p>
                )}
              </div>
            </div>
          )
        })()}

        {/* 하단 액션 */}
        <div className="px-5 pb-6 pt-3">
          <Button className="w-full h-12 text-base" disabled={!answered} onClick={nextQuestion}>
            {qIndex < questions.length - 1 ? '다음' : '결과 보기'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  // ----- 결과 화면 -----
  if (view === 'result') {
    const accuracy = questions.length ? Math.round((correctCount / questions.length) * 100) : 0
    return (
      <div className="container mx-auto py-10 px-4 max-w-xl print:hidden">
        <div className="text-center mb-6">
          <Trophy className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
          <h2 className="text-2xl font-bold">오늘 테스트 완료!</h2>
          <p className="text-gray-600 mt-1">
            {correctCount} / {questions.length} 정답 · 정확도 {accuracy}%
          </p>
        </div>
        {wrongWords.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <p className="font-medium mb-2 text-red-600">틀린 단어 ({wrongWords.length})</p>
              <div className="space-y-1">
                {wrongWords.map((w) => (
                  <div key={w.id} className="text-sm flex gap-2">
                    <span className="font-semibold w-32 shrink-0">{w.word}</span>
                    <span className="text-gray-600">{getFieldString(w.definition)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={startTest}>
            <RotateCcw className="h-4 w-4 mr-2" /> 다시 풀기
          </Button>
          <Button className="flex-1" onClick={() => setView('overview')}>
            돌아가기
          </Button>
        </div>
      </div>
    )
  }

  // ----- 설정 화면 -----
  if (view === 'setup') {
    const total = orderedIds.length
    const estDays = Math.ceil(total / Math.max(dailyCount || 20, 4))
    return (
      <div className="container mx-auto py-10 px-4 max-w-md print:hidden">
        <button onClick={() => router.push('/')} className="text-gray-500 text-sm flex items-center gap-1 mb-4">
          <ChevronLeft className="h-4 w-4" /> 홈
        </button>
        <h1 className="text-2xl font-bold mb-1">시험 모드 설정</h1>
        <p className="text-gray-600 mb-6">
          <span className="font-semibold">{collectionName}</span> ({total}개 단어)을 매일 나눠서 외우고 테스트합니다.
        </p>
        <Card>
          <CardContent className="p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">하루 외울 단어 개수</label>
            <input
              type="number"
              min={4}
              max={200}
              value={dailyCount}
              onChange={(e) => setDailyCount(Number(e.target.value))}
              className="w-full h-11 px-3 border border-gray-300 rounded-md text-lg"
            />
            <p className="text-sm text-gray-500 mt-2">
              하루 {Math.max(dailyCount || 20, 4)}개씩 · 약 <span className="font-semibold">{estDays}일</span> 완성
            </p>
            <Button className="w-full h-11 mt-5" onClick={handleStart}>
              <Play className="h-4 w-4 mr-2" /> 시작하기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ----- 오버뷰 화면 (오늘 배치) -----
  const done = todayBatch?.done
  return (
    <>
      <div className="container mx-auto py-8 px-4 max-w-2xl print:hidden">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push('/')} className="text-gray-500 text-sm flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" /> 홈
          </button>
          <button onClick={handleResetPlan} className="text-gray-400 text-xs hover:text-gray-600">
            계획 초기화
          </button>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          <h1 className="text-xl font-bold">{collectionName} · 시험 모드</h1>
        </div>

        {done ? (
          <Card className="mt-6">
            <CardContent className="p-8 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
              <p className="text-lg font-semibold mb-1">전체 일정을 완료했습니다! 🎉</p>
              <p className="text-gray-600 text-sm">
                총 {todayBatch?.totalDays}일 과정을 모두 마쳤어요. 복습으로 다시 다질 수 있습니다.
              </p>
              <Button className="mt-5" onClick={() => router.push('/study/review?collectionId=' + collectionId)}>
                복습하러 가기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-gray-600 mb-5">
              <span className="font-semibold text-blue-600">
                Day {(todayBatch?.batchIndex ?? 0) + 1}
              </span>{' '}
              / {todayBatch?.totalDays}일 · 오늘 {todayWords.length}개 단어
            </p>

            <div className="flex gap-3 mb-6">
              <Button className="flex-1 h-12" onClick={startTest} disabled={todayWords.length === 0}>
                <Play className="h-4 w-4 mr-2" /> 테스트 시작
              </Button>
              <Button variant="outline" className="h-12" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> 인쇄
              </Button>
            </div>

            <p className="text-sm font-medium text-gray-700 mb-2">오늘 외울 단어</p>
            <div className="space-y-2">
              {todayWords.map((w, i) => {
                const pos = normalizePartOfSpeech(w.partOfSpeech)
                const synonyms = (Array.isArray(w.synonyms) ? w.synonyms : []).slice(0, 2).map(String)
                return (
                  <Card key={w.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-gray-400 text-sm w-6 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{w.word}</span>
                          {pos.map((p) => (
                            <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              {p}
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => speakText(w.word)}
                            className="text-gray-400 hover:text-blue-600 p-0.5"
                            aria-label="발음 듣기"
                          >
                            <Volume2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-sm text-gray-600">
                          {getFieldString(w.definition)}
                          {synonyms.length > 0 && (
                            <span className="text-gray-400"> · {synonyms.join(', ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* 인쇄 전용 (오늘 배치) */}
      <ExamPrintView title={`${collectionName} · Day ${(todayBatch?.batchIndex ?? 0) + 1}`} words={todayWords} />
    </>
  )
}

export default function ExamPage() {
  return (
    <Suspense
      fallback={<div className="container mx-auto py-12 text-center text-gray-500">불러오는 중...</div>}
    >
      <ExamPageContent />
    </Suspense>
  )
}
