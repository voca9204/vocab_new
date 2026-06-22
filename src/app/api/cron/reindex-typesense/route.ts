import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import {
  getTypesenseClient,
  isTypesenseConfigured,
  TYPESENSE_COLLECTION,
  VOCABULARY_WORDS_SCHEMA,
} from '@/lib/typesense'
import { getFieldString } from '@/lib/utils/word-field-normalizer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * words_v3 + 공식 단어장 멤버십을 Typesense(vocabulary_words)에 재인덱싱(upsert).
 * Vercel Cron이 주기적으로 호출. 수동 호출 시 Authorization: Bearer <CRON_SECRET> 필요.
 *
 * upsert 방식이라 컬렉션을 유지하며 추가/수정을 반영(무중단). 삭제된 단어 제거는
 * 별도 전체 재빌드(scripts/index-words-typesense.js)에서 처리.
 */
async function reindex(): Promise<{ collections: number; words: number; indexed: number; failed: number }> {
  const client = getTypesenseClient()

  // 1) 멤버십: wordId -> [collectionId]
  const collSnap = await adminDb.collection('vocabulary_collections').get()
  const membership = new Map<string, Set<string>>()
  collSnap.forEach((doc) => {
    const data = doc.data()
    const ids: string[] = data.wordIds || data.words || []
    ids.forEach((wid) => {
      if (!membership.has(wid)) membership.set(wid, new Set())
      membership.get(wid)!.add(doc.id)
    })
  })

  // 2) words_v3 -> Typesense 문서
  const wordsSnap = await adminDb.collection('words_v3').get()
  const docs: any[] = []
  wordsSnap.forEach((doc) => {
    const d = doc.data()
    const word = getFieldString(d.word)
    if (!word) return
    docs.push({
      id: doc.id,
      word,
      koreanDefinition: getFieldString(d.koreanDefinition) || getFieldString(d.korean),
      englishDefinition: getFieldString(d.englishDefinition),
      definition: getFieldString(d.definition),
      partOfSpeech: Array.isArray(d.partOfSpeech)
        ? d.partOfSpeech.map(String)
        : d.partOfSpeech
        ? [String(d.partOfSpeech)]
        : [],
      difficulty: typeof d.difficulty === 'number' ? d.difficulty : 5,
      collections: Array.from(membership.get(doc.id) || []),
    })
  })

  // 3) 컬렉션 없으면 생성
  try {
    await client.collections(TYPESENSE_COLLECTION).retrieve()
  } catch {
    await client.collections().create(VOCABULARY_WORDS_SCHEMA)
  }

  // 4) 배치 upsert
  const BATCH = 1000
  let indexed = 0
  let failed = 0
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH)
    const results = await client
      .collections(TYPESENSE_COLLECTION)
      .documents()
      .import(batch, { action: 'upsert' })
    results.forEach((r: any) => (r.success ? indexed++ : failed++))
  }

  return { collections: collSnap.size, words: wordsSnap.size, indexed, failed }
}

export async function GET(req: NextRequest) {
  // 인증: Vercel Cron은 Authorization: Bearer <CRON_SECRET>를 자동 첨부.
  // 시크릿 미설정 시 fail-open 되지 않도록 부정 조건으로 강제(누구나 전체 재색인 트리거 방지).
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isTypesenseConfigured()) {
    return NextResponse.json({ error: 'Typesense not configured' }, { status: 503 })
  }

  try {
    const result = await reindex()
    console.log('[cron/reindex-typesense]', result)
    return NextResponse.json({ ok: true, ...result })
  } catch (error: any) {
    console.error('[cron/reindex-typesense] error:', error?.message || error)
    return NextResponse.json({ ok: false, error: error?.message || 'reindex failed' }, { status: 500 })
  }
}
