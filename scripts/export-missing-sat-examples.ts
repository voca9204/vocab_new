/**
 * 예문 누락 SAT 단어를 청크 JSON으로 export. (Claude 서브에이전트가 예문 작성)
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

const CHUNK = 130
const OUT = path.join(process.cwd(), 'scripts/data/ex-chunks')

function defOf(d: any): string {
  return (d.englishDefinition || d.definition || d.koreanDefinition || '').toString().replace(/\s+/g, ' ').slice(0, 160)
}
function exampleStrings(data: any): string[] {
  const ex = data.examples
  if (!Array.isArray(ex)) return []
  return ex.map((e: any) => (typeof e === 'string' ? e : e?.sentence || e?.example || '')).filter((s: string) => s && s.trim())
}

async function main() {
  const satSnap = await db.collection('vocabulary_collections').where('category', '==', 'SAT').get()
  const ids = new Set<string>()
  satSnap.docs.forEach((d: any) => (d.data().wordIds || d.data().words || []).forEach((id: string) => ids.add(id)))

  const missing: { id: string; word: string; def: string }[] = []
  const idList = Array.from(ids)
  for (let i = 0; i < idList.length; i += 30) {
    const refs = idList.slice(i, i + 30).map((id) => db.collection('words_v3').doc(id))
    const snaps = await db.getAll(...refs)
    snaps.forEach((s: any) => {
      if (!s.exists) return
      const data = s.data()
      if (exampleStrings(data).length === 0) missing.push({ id: s.id, word: data.word, def: defOf(data) })
    })
  }
  console.log(`Missing examples (SAT): ${missing.length}`)

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
