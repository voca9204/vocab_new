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

// fields that might encode difficulty / frequency
const CANDIDATE_FIELDS = [
  'difficulty', 'level', 'frequency', 'freq', 'frequencyRank', 'rank',
  'cefr', 'cefrLevel', 'grade', 'tier', 'zipf', 'commonness',
  'satLevel', 'importance', 'score', 'priority',
]

async function main() {
  const SAMPLE = 400
  const snap = await db.collection('words_v3').limit(SAMPLE).get()
  console.log(`Sampled ${snap.size} docs from words_v3\n`)

  // 1) union of all top-level keys + presence counts
  const keyCounts: Record<string, number> = {}
  const fieldTypes: Record<string, Set<string>> = {}
  const fieldSampleVals: Record<string, any[]> = {}

  snap.docs.forEach((d: any) => {
    const data = d.data()
    for (const [k, v] of Object.entries(data)) {
      keyCounts[k] = (keyCounts[k] || 0) + 1
      if (!fieldTypes[k]) fieldTypes[k] = new Set()
      fieldTypes[k].add(Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v)
      if (!fieldSampleVals[k]) fieldSampleVals[k] = []
      if (fieldSampleVals[k].length < 5 && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) {
        const repr = Array.isArray(v) ? `[${v.slice(0, 3).join(',')}]` : (typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : v)
        fieldSampleVals[k].push(repr)
      }
    }
  })

  console.log('===== ALL TOP-LEVEL FIELDS (presence / total) =====')
  Object.keys(keyCounts).sort().forEach(k => {
    console.log(`  ${k.padEnd(24)} ${keyCounts[k]}/${snap.size}  types=${[...fieldTypes[k]].join('|')}  e.g. ${(fieldSampleVals[k] || []).slice(0, 3).join(' | ')}`)
  })

  console.log('\n===== DIFFICULTY/FREQUENCY CANDIDATE FIELDS =====')
  let found = false
  for (const f of CANDIDATE_FIELDS) {
    if (keyCounts[f]) {
      found = true
      // distribution of values
      const vals: Record<string, number> = {}
      snap.docs.forEach((d: any) => {
        const v = d.data()[f]
        if (v !== undefined && v !== null) {
          const key = typeof v === 'object' ? JSON.stringify(v) : String(v)
          vals[key] = (vals[key] || 0) + 1
        }
      })
      const dist = Object.entries(vals).sort((a, b) => b[1] - a[1]).slice(0, 15)
      console.log(`  ⭐ ${f}: present in ${keyCounts[f]}/${snap.size}`)
      console.log(`     value distribution (top 15): ${dist.map(([k, c]) => `${k}=${c}`).join(', ')}`)
    }
  }
  if (!found) console.log('  (none of the candidate difficulty/frequency fields are present)')

  // 2) dump 2 full docs for eyeballing
  console.log('\n===== 2 FULL SAMPLE DOCS =====')
  snap.docs.slice(0, 2).forEach((d: any) => {
    console.log(`--- ${d.id} (${d.data().word}) ---`)
    console.log(JSON.stringify(d.data(), null, 2).slice(0, 1500))
    console.log('')
  })

  process.exit(0)
}

main().catch((e: any) => { console.error(e); process.exit(1) })
