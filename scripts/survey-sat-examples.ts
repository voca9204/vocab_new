const admin = require('firebase-admin')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(process.cwd(), '.env.local') })
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})
const db = admin.firestore()

function exampleStrings(data: any): string[] {
  const ex = data.examples
  if (!Array.isArray(ex)) return []
  return ex.map((e: any) => (typeof e === 'string' ? e : e?.sentence || e?.example || '')).filter((s: string) => s && s.trim())
}

async function main() {
  // gather SAT collection word ids
  const satSnap = await db.collection('vocabulary_collections').where('category', '==', 'SAT').get()
  const ids = new Set<string>()
  satSnap.docs.forEach((d: any) => {
    const data = d.data()
    ;(data.wordIds || data.words || []).forEach((id: string) => ids.add(id))
  })
  console.log(`SAT unique word ids: ${ids.size}`)

  let has = 0, missing = 0, noWordInExample = 0
  const missingSamples: string[] = []
  const idList = Array.from(ids)
  for (let i = 0; i < idList.length; i += 30) {
    const refs = idList.slice(i, i + 30).map((id) => db.collection('words_v3').doc(id))
    const snaps = await db.getAll(...refs)
    snaps.forEach((s: any) => {
      if (!s.exists) return
      const data = s.data()
      const ex = exampleStrings(data)
      if (ex.length === 0) {
        missing++
        if (missingSamples.length < 25) missingSamples.push(data.word)
      } else {
        has++
        const w = (data.word || '').toLowerCase()
        if (w && !ex.some((e: string) => e.toLowerCase().includes(w))) noWordInExample++
      }
    })
  }
  console.log(`with examples (>=1): ${has}  (of which none contain the word itself: ${noWordInExample})`)
  console.log(`missing examples: ${missing}`)
  console.log(`\nmissing samples: ${missingSamples.join(', ')}`)
  process.exit(0)
}
main().catch((e: any) => { console.error(e); process.exit(1) })
