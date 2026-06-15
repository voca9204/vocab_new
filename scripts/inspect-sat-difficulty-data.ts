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

async function getDocsByIds(ids: string[]) {
  const out: any[] = []
  for (let i = 0; i < ids.length; i += 30) {
    const batch = ids.slice(i, i + 30)
    const refs = batch.map((id: string) => db.collection('words_v3').doc(id))
    const snaps = await db.getAll(...refs)
    snaps.forEach((s: any) => { if (s.exists) out.push({ id: s.id, ...s.data() }) })
  }
  return out
}

function dist(arr: any[]) {
  const m: Record<string, number> = {}
  arr.forEach(v => { const k = String(v); m[k] = (m[k] || 0) + 1 })
  return Object.entries(m).sort((a, b) => {
    const na = Number(a[0]), nb = Number(b[0])
    if (!isNaN(na) && !isNaN(nb)) return na - nb
    return a[0] < b[0] ? -1 : 1
  })
}

async function main() {
  const satSnapshot = await db.collection('vocabulary_collections').where('category', '==', 'SAT').get()
  const order: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 }
  const docs = satSnapshot.docs.sort((a: any, b: any) =>
    (order[a.data().difficulty] ?? 9) - (order[b.data().difficulty] ?? 9))

  for (const d of docs) {
    const data = d.data()
    const ids: string[] = (data.wordIds || data.words || []) as string[]
    const words = await getDocsByIds(ids)
    console.log('=====================================')
    console.log(`${data.name} (${data.difficulty}) — ${words.length} words resolved`)

    // difficulty field
    const diffVals = words.map(w => w.difficulty).filter(v => v !== undefined && v !== null)
    const diffMissing = words.length - diffVals.length
    console.log(`  difficulty: present ${diffVals.length}/${words.length} (missing ${diffMissing})`)
    console.log(`    dist: ${dist(diffVals).map(([k, c]) => `${k}=${c}`).join(', ')}`)

    // frequency field
    const freqVals = words.map(w => w.frequency).filter(v => typeof v === 'number')
    const freqMissing = words.length - freqVals.length
    const avg = freqVals.length ? (freqVals.reduce((a, b) => a + b, 0) / freqVals.length).toFixed(2) : 'n/a'
    console.log(`  frequency: present ${freqVals.length}/${words.length} (missing ${freqMissing}), avg=${avg}`)
    console.log(`    dist: ${dist(freqVals).map(([k, c]) => `${k}=${c}`).join(', ')}`)
  }

  // Is difficulty just a copy of the SAT list's section name? check how many SAT words have STRING difficulty matching their collection's level
  console.log('\n===== INTERPRETATION HINTS =====')
  console.log('If a level\'s difficulty dist is dominated by ONE string value matching the level name,')
  console.log('the difficulty field was stamped from the import list section (not per-word assessed).')
  process.exit(0)
}

main().catch((e: any) => { console.error(e); process.exit(1) })
