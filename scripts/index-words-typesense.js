/**
 * words_v3 + 공식 단어장 멤버십을 Typesense(vocabulary_words)에 일괄 인덱싱.
 * 재실행 가능(컬렉션 재생성 후 upsert). 개인/사진/AI 단어장은 별도 저장소라 제외.
 *
 *   node scripts/index-words-typesense.js
 */
require('dotenv').config({ path: '.env.local' })
const admin = require('firebase-admin')
const Typesense = require('typesense')

// ---- Firebase Admin ----
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n')
if (!projectId || !clientEmail || !privateKey) {
  console.error('ERROR: missing FIREBASE_ADMIN_* env')
  process.exit(1)
}
admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) })
const db = admin.firestore()

// ---- Typesense ----
const COLLECTION = process.env.TYPESENSE_COLLECTION || 'vocabulary_words'
const client = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST,
      port: Number(process.env.TYPESENSE_PORT || 443),
      protocol: process.env.TYPESENSE_PROTOCOL || 'https',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY,
  connectionTimeoutSeconds: 20,
})

const SCHEMA = {
  name: COLLECTION,
  fields: [
    { name: 'word', type: 'string' },
    { name: 'koreanDefinition', type: 'string', optional: true },
    { name: 'englishDefinition', type: 'string', optional: true },
    { name: 'definition', type: 'string', optional: true },
    { name: 'partOfSpeech', type: 'string[]', optional: true, facet: true },
    { name: 'difficulty', type: 'int32', optional: true, facet: true },
    { name: 'collections', type: 'string[]', facet: true },
  ],
}

// 객체형({korean,english})·문자열 모두 안전하게 문자열로
function str(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object') return String(v.korean || v.english || v.ko || v.en || '')
  return String(v)
}

;(async () => {
  if (!process.env.TYPESENSE_HOST || !process.env.TYPESENSE_API_KEY) {
    console.error('ERROR: missing TYPESENSE_HOST / TYPESENSE_API_KEY')
    process.exit(1)
  }

  // 1) 공식 단어장 멤버십: wordId -> [collectionId]
  console.log('Reading vocabulary_collections...')
  const collSnap = await db.collection('vocabulary_collections').get()
  const membership = new Map()
  collSnap.forEach((doc) => {
    const data = doc.data()
    const ids = data.wordIds || data.words || []
    ids.forEach((wid) => {
      if (!membership.has(wid)) membership.set(wid, new Set())
      membership.get(wid).add(doc.id)
    })
  })
  console.log(`  ${collSnap.size} collections, ${membership.size} words mapped`)

  // 2) words_v3 → Typesense 문서
  console.log('Reading words_v3...')
  const wordsSnap = await db.collection('words_v3').get()
  const docs = []
  wordsSnap.forEach((doc) => {
    const d = doc.data()
    const word = str(d.word)
    if (!word) return
    docs.push({
      id: doc.id,
      word,
      koreanDefinition: str(d.koreanDefinition) || str(d.korean),
      englishDefinition: str(d.englishDefinition),
      definition: str(d.definition),
      partOfSpeech: Array.isArray(d.partOfSpeech)
        ? d.partOfSpeech.map(String)
        : d.partOfSpeech
        ? [String(d.partOfSpeech)]
        : [],
      difficulty: typeof d.difficulty === 'number' ? d.difficulty : 5,
      collections: Array.from(membership.get(doc.id) || []),
    })
  })
  console.log(`  ${wordsSnap.size} words read, ${docs.length} indexable`)

  // 3) 컬렉션 재생성
  try {
    await client.collections(COLLECTION).delete()
    console.log(`Dropped existing '${COLLECTION}'`)
  } catch (e) {
    /* not found — ok */
  }
  await client.collections().create(SCHEMA)
  console.log(`Created '${COLLECTION}'`)

  // 4) 배치 업서트
  const BATCH = 1000
  let ok = 0
  let fail = 0
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH)
    const results = await client.collections(COLLECTION).documents().import(batch, { action: 'upsert' })
    results.forEach((r) => (r.success ? ok++ : (fail++, fail <= 5 && console.error('  fail:', r.error))))
    console.log(`  imported ${Math.min(i + BATCH, docs.length)}/${docs.length}`)
  }

  console.log(`DONE: ${ok} indexed, ${fail} failed`)
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
