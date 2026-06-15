/**
 * SAT 초급/중급/고급을 알파벳 분할 → 실제 단어 빈도 기준으로 재분류.
 * 빈도 소스: Norvig Google Web Trillion-Word Corpus (scripts/data/count_1w.txt).
 * 흔한 단어 = 쉬움(초급), 희귀 단어 = 어려움(고급). 컬렉션 크기(500/1000/500) 유지.
 *
 * dry-run(기본): 재분류 결과만 출력. 쓰기 안 함.
 * --write: vocabulary_collections 3개의 wordIds를 새 순서로 갱신 + words_v3에 zipf 백필.
 */
const admin = require('firebase-admin')
const dotenv = require('dotenv')
const path = require('path')
const fs = require('fs')

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})
const db = admin.firestore()

const WRITE = process.argv.includes('--write')
const BUCKETS = [
  { difficulty: 'beginner', label: 'SAT 초급', size: 500 },
  { difficulty: 'intermediate', label: 'SAT 중급', size: 1000 },
  { difficulty: 'advanced', label: 'SAT 고급', size: 500 },
]

// ---- load frequency corpus ----
function loadFreq(): { count: Map<string, number>; total: number } {
  const file = path.join(process.cwd(), 'scripts/data/count_1w.txt')
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const count = new Map<string, number>()
  let total = 0
  for (const ln of lines) {
    const [w, c] = ln.split('\t')
    if (!w || !c) continue
    const n = Number(c)
    count.set(w.toLowerCase(), n)
    total += n
  }
  return { count, total }
}

function zipfOf(word: string, freq: { count: Map<string, number>; total: number }): number {
  const c = freq.count.get(word.toLowerCase())
  if (!c) return 0 // not found = rarest
  // standard Zipf scale: log10(count per billion) ; ~7 (very common) .. ~1 (rare)
  return Math.log10((c / freq.total) * 1e9)
}

async function getDocsByIds(ids: string[]) {
  const out: any[] = []
  for (let i = 0; i < ids.length; i += 30) {
    const batch = ids.slice(i, i + 30)
    const refs = batch.map((id: string) => db.collection('words_v3').doc(id))
    const snaps = await db.getAll(...refs)
    snaps.forEach((s: any) => { if (s.exists) out.push({ id: s.id, ...s.data() }) })
  }
  return out
}

async function main() {
  const freq = loadFreq()
  console.log(`Loaded freq corpus: ${freq.count.size} words\n`)

  const satSnap = await db.collection('vocabulary_collections').where('category', '==', 'SAT').get()
  const order: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 }
  const colDocs = satSnap.docs.sort((a: any, b: any) =>
    (order[a.data().difficulty] ?? 9) - (order[b.data().difficulty] ?? 9))

  // map difficulty -> collection doc id
  const colByDiff: Record<string, string> = {}
  colDocs.forEach((d: any) => { colByDiff[d.data().difficulty] = d.id })

  // gather full pool (union) with current bucket label
  type W = { id: string; word: string; norm: string; zipf: number; found: boolean; currentDiff: string }
  const pool: W[] = []
  const seen = new Set<string>()
  for (const d of colDocs) {
    const data = d.data()
    const ids: string[] = (data.wordIds || data.words || []) as string[]
    const docs = await getDocsByIds(ids)
    for (const w of docs) {
      if (seen.has(w.id)) continue
      seen.add(w.id)
      const norm = (w.normalizedWord || w.word || '').toLowerCase().trim()
      const z = zipfOf(norm, freq)
      pool.push({ id: w.id, word: w.word, norm, zipf: z, found: z > 0, currentDiff: data.difficulty })
    }
  }
  console.log(`Pool: ${pool.length} unique words`)
  const foundCount = pool.filter(p => p.found).length
  console.log(`Corpus coverage: ${foundCount}/${pool.length} (${Math.round(foundCount / pool.length * 100)}%) found; ${pool.length - foundCount} not found → treated as rarest\n`)

  // sort: most common first (high zipf). ties / not-found broken by word alpha for determinism.
  pool.sort((a, b) => (b.zipf - a.zipf) || (a.norm < b.norm ? -1 : 1))

  // slice into buckets 500/1000/500
  const newBuckets: { difficulty: string; label: string; words: W[] }[] = []
  let idx = 0
  for (const b of BUCKETS) {
    const slice = pool.slice(idx, idx + b.size)
    idx += b.size
    newBuckets.push({ difficulty: b.difficulty, label: b.label, words: slice })
  }

  console.log('===== PROPOSED NEW BUCKETS (by frequency) =====')
  for (const nb of newBuckets) {
    const zs = nb.words.map(w => w.zipf)
    const zMin = Math.min(...zs).toFixed(2)
    const zMax = Math.max(...zs).toFixed(2)
    const found = nb.words.filter(w => w.found).length
    console.log(`\n${nb.label} (${nb.difficulty}) — ${nb.words.length} words`)
    console.log(`  zipf range: ${zMax} (most common) → ${zMin} (rarest) | found ${found}/${nb.words.length}`)
    console.log(`  easiest 12: ${nb.words.slice(0, 12).map(w => w.word).join(', ')}`)
    console.log(`  hardest 12: ${nb.words.slice(-12).map(w => w.word).join(', ')}`)
    // how many came from each old bucket
    const fromOld: Record<string, number> = {}
    nb.words.forEach(w => { fromOld[w.currentDiff] = (fromOld[w.currentDiff] || 0) + 1 })
    console.log(`  composition by OLD bucket: ${Object.entries(fromOld).map(([k, c]) => `${k}=${c}`).join(', ')}`)
  }

  // how many words change bucket
  const newDiffOf = new Map<string, string>()
  newBuckets.forEach(nb => nb.words.forEach(w => newDiffOf.set(w.id, nb.difficulty)))
  const moved = pool.filter(p => newDiffOf.get(p.id) !== p.currentDiff).length
  console.log(`\n===== ${moved}/${pool.length} words change level (${Math.round(moved / pool.length * 100)}%) =====`)

  if (!WRITE) {
    console.log('\n(DRY RUN — no writes. Re-run with --write to apply.)')
    process.exit(0)
  }

  // ---- WRITE ----
  console.log('\n===== WRITING =====')
  // 1) update each collection wordIds + wordCount
  for (const nb of newBuckets) {
    const colId = colByDiff[nb.difficulty]
    const newIds = nb.words.map(w => w.id)
    await db.collection('vocabulary_collections').doc(colId).update({
      wordIds: newIds,
      wordCount: newIds.length,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    console.log(`  updated ${nb.label} (${colId}): ${newIds.length} wordIds`)
  }
  // 2) backfill zipf onto words_v3 (batched)
  let batch = db.batch()
  let n = 0, written = 0
  for (const p of pool) {
    batch.update(db.collection('words_v3').doc(p.id), {
      corpusZipf: Number(p.zipf.toFixed(3)),
      corpusFound: p.found,
    })
    n++; written++
    if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0 }
  }
  if (n > 0) await batch.commit()
  console.log(`  backfilled corpusZipf on ${written} words_v3 docs`)
  console.log('\nDONE.')
  process.exit(0)
}

main().catch((e: any) => { console.error(e); process.exit(1) })
