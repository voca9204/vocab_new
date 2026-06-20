import { db } from '../firebase/config'
import { doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore'

export type ExamCollectionType = 'official' | 'personal'

export interface ExamPlan {
  userId: string
  collectionId: string
  collectionType: ExamCollectionType
  dailyWordCount: number
  startDate: Date
  totalWords: number
  status: 'active' | 'completed'
  createdAt: Date
  updatedAt: Date
}

export interface TodayBatch {
  batchIndex: number // 0-based (오늘이 며칠째인지)
  totalDays: number
  todayIds: string[]
  done: boolean // 모든 배치를 지난 경우
}

const DAY_MS = 24 * 60 * 60 * 1000
const planDocId = (userId: string, collectionId: string) => `${userId}_${collectionId}`

function midnight(d: Date): number {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

/**
 * 시험 모드 계획(per user × collection). 날짜 기준이라 배치 인덱스는 startDate에서 파생.
 */
export class ExamPlanService {
  private readonly collectionName = 'exam_plans'

  async getExamPlan(userId: string, collectionId: string): Promise<ExamPlan | null> {
    const ref = doc(db, this.collectionName, planDocId(userId, collectionId))
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    const d = snap.data()
    return {
      userId: d.userId,
      collectionId: d.collectionId,
      collectionType: d.collectionType || 'official',
      dailyWordCount: d.dailyWordCount,
      startDate: d.startDate?.toDate?.() || new Date(d.startDate),
      totalWords: d.totalWords || 0,
      status: d.status || 'active',
      createdAt: d.createdAt?.toDate?.() || new Date(),
      updatedAt: d.updatedAt?.toDate?.() || new Date(),
    }
  }

  async createExamPlan(params: {
    userId: string
    collectionId: string
    collectionType: ExamCollectionType
    dailyWordCount: number
    totalWords: number
  }): Promise<ExamPlan> {
    const now = new Date()
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const plan: ExamPlan = {
      userId: params.userId,
      collectionId: params.collectionId,
      collectionType: params.collectionType,
      dailyWordCount: params.dailyWordCount,
      totalWords: params.totalWords,
      startDate: start,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }
    const ref = doc(db, this.collectionName, planDocId(params.userId, params.collectionId))
    await setDoc(ref, {
      ...plan,
      startDate: Timestamp.fromDate(start),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    })
    return plan
  }

  async deleteExamPlan(userId: string, collectionId: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, planDocId(userId, collectionId)))
  }

  /** 단어장의 순서 있는 wordId 배열 (단어장 자연 순서) */
  async getOrderedWordIds(collectionId: string, type: ExamCollectionType): Promise<string[]> {
    const coll = type === 'personal' ? 'personal_collections' : 'vocabulary_collections'
    const snap = await getDoc(doc(db, coll, collectionId))
    if (!snap.exists()) return []
    const data = snap.data()
    return (data.wordIds || data.words || []) as string[]
  }

  /** 단어장 문서의 이름(컨텍스트에 없을 때 폴백용). string 또는 {korean,english} */
  async getCollectionDisplayName(collectionId: string, type: ExamCollectionType): Promise<any | null> {
    const coll = type === 'personal' ? 'personal_collections' : 'vocabulary_collections'
    const snap = await getDoc(doc(db, coll, collectionId))
    if (!snap.exists()) return null
    const data = snap.data()
    return data.name ?? data.displayName ?? null
  }

  /** 날짜 기준 오늘 배치 계산 (순차) */
  computeTodayBatch(plan: ExamPlan, orderedWordIds: string[]): TodayBatch {
    const n = Math.max(plan.dailyWordCount, 1)
    const totalDays = Math.max(Math.ceil(orderedWordIds.length / n), 1)
    const dayIndex = Math.floor((midnight(new Date()) - midnight(plan.startDate)) / DAY_MS)
    const done = dayIndex >= totalDays
    const batchIndex = Math.min(Math.max(dayIndex, 0), totalDays - 1)
    const start = batchIndex * n
    const todayIds = orderedWordIds.slice(start, start + n)
    return { batchIndex, totalDays, todayIds, done }
  }

  /** 특정 Day(0-based) 배치 계산 (지난 날짜 선택용) */
  computeBatchForDay(plan: ExamPlan, orderedWordIds: string[], dayIndex: number): TodayBatch {
    const n = Math.max(plan.dailyWordCount, 1)
    const totalDays = Math.max(Math.ceil(orderedWordIds.length / n), 1)
    const batchIndex = Math.min(Math.max(dayIndex, 0), totalDays - 1)
    const start = batchIndex * n
    const todayIds = orderedWordIds.slice(start, start + n)
    return { batchIndex, totalDays, todayIds, done: false }
  }
}

export const examPlanService = new ExamPlanService()
