/**
 * scripts/data/pos-fills/*.json (id -> [pos]) 를 검증 후 words_v3.partOfSpeech 에 적용.
 * dry-run(기본): 커버리지/미충족 보고. --write: 적용.
 */
const admin = require('firebase-admin')
const dotenv = require('dotenv')
const path = require('path')
const fs = require('fs')
const { normalizePartOfSpeech } = require('../src/lib/utils/part-of-speech')

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

const CHUNKS = path.join(process.cwd(), 'scripts/data/pos-chunks')
const FILLS = path.join(process.cwd(), 'scripts/data/pos-fills')

async function main() {
  // expected ids + words from chunks
  const expected = new Map<string, string>() // id -> word
  for (const f of fs.readdirSync(CHUNKS)) {
    const arr = JSON.parse(fs.readFileSync(path.join(CHUNKS, f), 'utf8'))
    arr.forEach((e: any) => expected.set(e.id, e.word))
  }
  // collected fills
  const fills = new Map<string, string[]>()
  let badPos = 0
  for (const f of fs.existsSync(FILLS) ? fs.readdirSync(FILLS) : []) {
    if (!f.endsWith('.json')) continue
    const obj = JSON.parse(fs.readFileSync(path.join(FILLS, f), 'utf8'))
    for (const [id, pos] of Object.entries(obj)) {
      const norm = normalizePartOfSpeech(pos as any)
      if (norm.length === 0) { badPos++; continue }
      fills.set(id, norm)
    }
  }

  const missing: string[] = []
  expected.forEach((word, id) => { if (!fills.has(id)) missing.push(word) })

  console.log(`Expected ids (chunks): ${expected.size}`)
  console.log(`Fill entries (valid):  ${fills.size}`)
  console.log(`Invalid/empty pos dropped: ${badPos}`)
  console.log(`Unfilled ids: ${missing.length}`)
  if (missing.length) console.log(`  e.g.: ${missing.slice(0, 30).join(', ')}`)

  // pos distribution
  const dist: Record<string, number> = {}
  fills.forEach(arr => { const k = arr.join(' '); dist[k] = (dist[k] || 0) + 1 })
  console.log(`\nPOS distribution (top 12):`)
  Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, c]) => console.log(`  ${k.padEnd(10)} ${c}`))

  if (!WRITE) { console.log('\n(DRY RUN — re-run with --write to apply.)'); process.exit(0) }

  console.log('\nWriting to words_v3...')
  let batch = db.batch(), n = 0, done = 0
  for (const [id, pos] of fills) {
    if (!expected.has(id)) continue
    batch.update(db.collection('words_v3').doc(id), { partOfSpeech: pos })
    n++; done++
    if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; process.stdout.write(`\r  wrote ${done}/${fills.size}`) }
  }
  if (n > 0) await batch.commit()
  console.log(`\r  wrote ${done}/${fills.size}\nDONE.`)
  process.exit(0)
}
main().catch((e: any) => { console.error(e); process.exit(1) })
