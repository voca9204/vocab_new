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
  console.log(`Total words_v3: ${snap.size}\n`)

  const rawForms: Record<string, number> = {}
  let missing = 0
  let asString = 0, asArray = 0
  const missingSamples: string[] = []
  const hasEnglishDef = { withMissingPos: 0 }

  snap.docs.forEach((d: any) => {
    const data = d.data()
    const p = data.partOfSpeech
    const empty = p === undefined || p === null || (Array.isArray(p) && p.length === 0) || (typeof p === 'string' && p.trim() === '')
    if (empty) {
      missing++
      if (missingSamples.length < 30) missingSamples.push(data.word)
      if (data.englishDefinition || data.definition) hasEnglishDef.withMissingPos++
      return
    }
    if (Array.isArray(p)) { asArray++; p.forEach((x: any) => { const k = String(x); rawForms[k] = (rawForms[k] || 0) + 1 }) }
    else { asString++; const k = String(p); rawForms[k] = (rawForms[k] || 0) + 1 }
  })

  console.log(`partOfSpeech present: ${snap.size - missing}/${snap.size} | missing: ${missing}`)
  console.log(`  stored as array: ${asArray} docs | as string: ${asString} docs`)
  console.log(`  of missing, have a definition to infer from: ${hasEnglishDef.withMissingPos}/${missing}\n`)

  console.log('===== DISTINCT RAW POS FORMS (value: count) =====')
  Object.entries(rawForms).sort((a, b) => b[1] - a[1]).forEach(([k, c]) => {
    console.log(`  ${JSON.stringify(k).padEnd(28)} ${c}`)
  })

  console.log('\n===== MISSING SAMPLES =====')
  console.log('  ' + missingSamples.join(', '))
  process.exit(0)
}
main().catch((e: any) => { console.error(e); process.exit(1) })
