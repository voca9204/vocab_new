/**
 * 유사어 누락 단어를 청크 JSON으로 export. (Claude 서브에이전트가 채움)
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

const CHUNK = 290
const OUT = path.join(process.cwd(), 'scripts/data/syn-chunks')

function defOf(d: any): string {
  return (d.englishDefinition || d.definition || d.koreanDefinition || '').toString().replace(/\s+/g, ' ').slice(0, 160)
}

async function main() {
  const snap = await db.collection('words_v3').get()
  const missing: { id: string; word: string; def: string }[] = []
  snap.docs.forEach((d: any) => {
    const data = d.data()
    const s = data.synonyms
    const arr = Array.isArray(s) ? s.filter((x: any) => typeof x === 'string' && x.trim()) : []
    if (arr.length === 0) missing.push({ id: d.id, word: data.word, def: defOf(data) })
  })
  console.log(`Missing synonyms: ${missing.length}`)

  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  let n = 0
  for (let i = 0; i < missing.length; i += CHUNK) {
    fs.writeFileSync(path.join(OUT, `chunk-${String(n).padStart(2, '0')}.json`), JSON.stringify(missing.slice(i, i + CHUNK)))
    n++
  }
  console.log(`Wrote ${n} chunks (${CHUNK}/chunk) to ${OUT}`)
  process.exit(0)
}
main().catch((e: any) => { console.error(e); process.exit(1) })
