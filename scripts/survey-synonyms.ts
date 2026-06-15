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

async function main() {
  const snap = await db.collection('words_v3').get()
  let has = 0, missing = 0, one = 0
  const missingSamples: string[] = []
  let withDef = 0
  snap.docs.forEach((d: any) => {
    const data = d.data()
    const s = data.synonyms
    const arr = Array.isArray(s) ? s.filter((x: any) => typeof x === 'string' && x.trim()) : []
    if (arr.length === 0) {
      missing++
      if (data.definition || data.englishDefinition || data.koreanDefinition) withDef++
      if (missingSamples.length < 25) missingSamples.push(data.word)
    } else {
      has++
      if (arr.length === 1) one++
    }
  })
  console.log(`Total: ${snap.size}`)
  console.log(`with synonyms (>=1): ${has}  (of which exactly 1: ${one})`)
  console.log(`missing/empty: ${missing}  (have a definition to infer from: ${withDef})`)
  console.log(`\nmissing samples: ${missingSamples.join(', ')}`)
  process.exit(0)
}
main().catch((e: any) => { console.error(e); process.exit(1) })
