/**
 * scripts/data/syn-fills/*.json (id -> [syn]) 를 검증 후 words_v3.synonyms 에 적용.
 * dry-run(기본): 커버리지/미충족 보고. --write: 적용.
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

const CHUNKS = path.join(process.cwd(), 'scripts/data/syn-chunks')
const FILLS = path.join(process.cwd(), 'scripts/data/syn-fills')

function clean(arr: any): string[] {
  if (!Array.isArray(arr)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of arr) {
    if (typeof x !== 'string') continue
    const t = x.trim()
    if (!t) continue
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
    if (out.length >= 5) break
  }
  return out
}

async function main() {
  const expected = new Map<string, string>()
  for (const f of fs.readdirSync(CHUNKS)) {
    JSON.parse(fs.readFileSync(path.join(CHUNKS, f), 'utf8')).forEach((e: any) => expected.set(e.id, e.word))
  }
  const fills = new Map<string, string[]>()
  for (const f of fs.existsSync(FILLS) ? fs.readdirSync(FILLS) : []) {
    if (!f.endsWith('.json')) continue
    const obj = JSON.parse(fs.readFileSync(path.join(FILLS, f), 'utf8'))
    for (const [id, syn] of Object.entries(obj)) {
      const c = clean(syn)
      if (c.length >= 1) fills.set(id, c)
    }
  }

  const missing: string[] = []
  expected.forEach((word, id) => { if (!fills.has(id)) missing.push(word) })
  console.log(`Expected ids (chunks): ${expected.size}`)
  console.log(`Fill entries (>=1 syn): ${fills.size}`)
  console.log(`Unfilled ids: ${missing.length}`)
  if (missing.length) console.log(`  e.g.: ${missing.slice(0, 30).join(', ')}`)

  // sample
  console.log('\nSamples:')
  let shown = 0
  for (const [id, syn] of fills) {
    console.log(`  ${expected.get(id)}: ${syn.join(', ')}`)
    if (++shown >= 10) break
  }

  if (!WRITE) { console.log('\n(DRY RUN — re-run with --write to apply.)'); process.exit(0) }

  console.log('\nWriting to words_v3...')
  let batch = db.batch(), n = 0, done = 0
  for (const [id, syn] of fills) {
    if (!expected.has(id)) continue
    batch.update(db.collection('words_v3').doc(id), { synonyms: syn })
    n++; done++
    if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; process.stdout.write(`\r  wrote ${done}/${fills.size}`) }
  }
  if (n > 0) await batch.commit()
  console.log(`\r  wrote ${done}/${fills.size}\nDONE.`)
  process.exit(0)
}
main().catch((e: any) => { console.error(e); process.exit(1) })
