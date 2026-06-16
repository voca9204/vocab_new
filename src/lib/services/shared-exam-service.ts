import { db } from '../firebase/config'
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'

export interface SharedExamQuestion {
  wordId: string
  word: string
  options: string[] // 정의 4개
  optionWords?: string[] // 각 보기(정의)에 해당하는 단어
  answer: number
}

export interface SharedExamBonus {
  word: string
  format: 'cloze' | 'meaning'
  passage: string
  options: string[]
  answer: number
}

export interface SharedExam {
  id: string
  ownerId: string
  ownerName?: string
  title: string
  collectionId: string
  questions: SharedExamQuestion[]
  bonus: SharedExamBonus[]
  createdAt?: any
}

export interface SharedExamResult {
  id?: string
  takerName: string
  score: number
  total: number
  bonusScore: number
  bonusTotal: number
  submittedAt?: any
}

const COLLECTION = 'shared_exams'

/** 짧은 공유 코드 (8자) */
function shortId(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  const arr = new Uint8Array(8)
  ;(globalThis.crypto || (window as any).crypto).getRandomValues(arr)
  for (let i = 0; i < 8; i++) s += chars[arr[i] % chars.length]
  return s
}

export class SharedExamService {
  /** 공유 시험 생성 (스냅샷). 생성된 examId 반환. */
  async createSharedExam(input: Omit<SharedExam, 'id' | 'createdAt'>): Promise<string> {
    const id = shortId()
    await setDoc(doc(db, COLLECTION, id), {
      ownerId: input.ownerId,
      ownerName: input.ownerName || null,
      title: input.title,
      collectionId: input.collectionId,
      questions: input.questions,
      bonus: input.bonus || [],
      createdAt: serverTimestamp(),
    })
    return id
  }

  async getSharedExam(id: string): Promise<SharedExam | null> {
    const snap = await getDoc(doc(db, COLLECTION, id))
    if (!snap.exists()) return null
    const d = snap.data()
    return {
      id: snap.id,
      ownerId: d.ownerId,
      ownerName: d.ownerName || undefined,
      title: d.title,
      collectionId: d.collectionId,
      questions: (d.questions || []) as SharedExamQuestion[],
      bonus: (d.bonus || []) as SharedExamBonus[],
      createdAt: d.createdAt,
    }
  }

  /** 응시 결과 제출 (로그인 불필요). 출제자 id를 함께 저장해 규칙/조회에 사용. */
  async submitResult(
    examId: string,
    ownerId: string,
    result: Omit<SharedExamResult, 'id' | 'submittedAt'>
  ): Promise<void> {
    await addDoc(collection(db, COLLECTION, examId, 'results'), {
      ownerId,
      takerName: result.takerName,
      score: result.score,
      total: result.total,
      bonusScore: result.bonusScore,
      bonusTotal: result.bonusTotal,
      submittedAt: serverTimestamp(),
    })
  }

  /** 출제자용: 특정 시험의 응시 결과 목록 (최신순) */
  async listResults(examId: string): Promise<SharedExamResult[]> {
    const q = query(collection(db, COLLECTION, examId, 'results'), orderBy('submittedAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => {
      const x = d.data()
      return {
        id: d.id,
        takerName: x.takerName,
        score: x.score,
        total: x.total,
        bonusScore: x.bonusScore ?? 0,
        bonusTotal: x.bonusTotal ?? 0,
        submittedAt: x.submittedAt?.toDate?.() || null,
      }
    })
  }
}

export const sharedExamService = new SharedExamService()
