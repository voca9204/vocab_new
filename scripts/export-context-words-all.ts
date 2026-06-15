/**
 * 문맥문제(contextQuestion)가 아직 없는 SAT 단어 전부를 청크로 export.
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

const CHUNK = 100
const OUT = path.join(process.cwd(), 'scripts/data/ctx-chunks')

function defOf(d: any): string {
  return (d.englishDefinition || d.definition || d.koreanDefinition || '').toString().replace(/\s+/g, ' ').slice(0, 200)
}
function hasContext(d: any): boolean {
  const c = d.contextQuestion
  return !!c && typeof c === 'object' && Array.isArray(c.options) && c.options.length === 4 && typeof c.passage === 'string'
}

async function main() {
  const satSnap = await db.collection('vocabulary_collections').where('category', '==', 'SAT').get()
  const ids = new Set<string>()
  satSnap.docs.forEach((d: any) => (d.data().wordIds || d.data().words || []).forEach((id: string) => ids.add(id)))
  console.log(`SAT unique word ids: ${ids.size}`)

  const items: { id: string; word: string; def: string }[] = []
  let already = 0
  const idList = Array.from(ids)
  for (let i = 0; i < idList.length; i += 30) {
    const refs = idList.slice(i, i + 30).map((id) => db.collection('words_v3').doc(id))
    const snaps = await db.getAll(...refs)
    snaps.forEach((s: any) => {
      if (!s.exists) return
      const d = s.data()
      if (hasContext(d)) { already++; return }
      items.push({ id: s.id, word: d.word, def: defOf(d) })
    })
  }
  console.log(`already have contextQuestion: ${already}`)
  console.log(`to generate: ${items.length}`)

  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  let n = 0
  for (let i = 0; i < items.length; i += CHUNK) {
    fs.writeFileSync(path.join(OUT, `chunk-${String(n).padStart(2, '0')}.json`), JSON.stringify(items.slice(i, i + CHUNK)))
    n++
  }
  console.log(`Wrote ${n} chunks (${CHUNK}/chunk) to ${OUT}`)
  process.exit(0)
}
main().catch((e: any) => { console.error(e); process.exit(1) })
