/**
 * SAT 중급(sat_vocabulary_ii) 앞 100개 단어를 문맥문제 생성용으로 export.
 * (Day 1~5 배치 구간이라 테스트에서 바로 보너스 문제가 보임)
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

const COLLECTION_ID = 'sat_vocabulary_ii_1756394109723' // SAT 중급
const COUNT = 100
const CHUNK = 50
const OUT = path.join(process.cwd(), 'scripts/data/ctx-chunks')

function defOf(d: any): string {
  return (d.englishDefinition || d.definition || d.koreanDefinition || '').toString().replace(/\s+/g, ' ').slice(0, 200)
}

async function main() {
  const colSnap = await db.collection('vocabulary_collections').doc(COLLECTION_ID).get()
  const ids: string[] = (colSnap.data().wordIds || colSnap.data().words || []).slice(0, COUNT)
  console.log(`Taking first ${ids.length} words of 중급`)

  const items: { id: string; word: string; def: string }[] = []
  for (let i = 0; i < ids.length; i += 30) {
    const refs = ids.slice(i, i + 30).map((id) => db.collection('words_v3').doc(id))
    const snaps = await db.getAll(...refs)
    const map = new Map<string, any>()
    snaps.forEach((s: any) => { if (s.exists) map.set(s.id, s.data()) })
    ids.slice(i, i + 30).forEach((id) => {
      const d = map.get(id)
      if (d) items.push({ id, word: d.word, def: defOf(d) })
    })
  }

  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  let n = 0
  for (let i = 0; i < items.length; i += CHUNK) {
    fs.writeFileSync(path.join(OUT, `chunk-${String(n).padStart(2, '0')}.json`), JSON.stringify(items.slice(i, i + CHUNK)))
    n++
  }
  console.log(`Wrote ${n} chunks (${CHUNK}/chunk), ${items.length} words to ${OUT}`)
  process.exit(0)
}
main().catch((e: any) => { console.error(e); process.exit(1) })
