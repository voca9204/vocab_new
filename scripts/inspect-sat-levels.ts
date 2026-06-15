const admin = require('firebase-admin')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})

const db = admin.firestore()

async function fetchWords(ids: string[]): Promise<string[]> {
  const out: string[] = []
  for (let i = 0; i < ids.length; i += 30) {
    const batch = ids.slice(i, i + 30)
    const refs = batch.map((id: string) => db.collection('words_v3').doc(id))
    const snaps = await db.getAll(...refs)
    const map = new Map<string, string>()
    snaps.forEach((s: any) => { if (s.exists) map.set(s.id, s.data().word) })
    batch.forEach((id: string) => { if (map.has(id)) out.push(map.get(id)!) })
  }
  return out
}

function firstLetterSpread(words: string[]) {
  const counts: Record<string, number> = {}
  for (const w of words) {
    const c = (w?.[0] || '?').toUpperCase()
    counts[c] = (counts[c] || 0) + 1
  }
  return counts
}

async function main() {
  const satSnapshot = await db.collection('vocabulary_collections').where('category', '==', 'SAT').get()
  console.log(`Found ${satSnapshot.size} SAT collections\n`)

  // order: beginner, intermediate, advanced
  const order: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 }
  const docs = satSnapshot.docs.sort((a: any, b: any) =>
    (order[a.data().difficulty] ?? 9) - (order[b.data().difficulty] ?? 9))

  const allSets: { difficulty: string; words: string[] }[] = []

  for (const d of docs) {
    const data = d.data()
    const ids: string[] = (data.wordIds || data.words || []) as string[]
    console.log('=====================================')
    console.log('id:', d.id)
    console.log('difficulty:', data.difficulty, '| name:', JSON.stringify(data.name), '| wordCount:', data.wordCount, '| wordIds:', ids.length)
    if (!ids.length) { console.log('  (no wordIds)\n'); continue }

    const words = await fetchWords(ids)
    allSets.push({ difficulty: data.difficulty, words })
    console.log('  resolved words:', words.length)
    console.log('  first 12 (collection order):', words.slice(0, 12).join(', '))
    console.log('  last 12  (collection order):', words.slice(-12).join(', '))

    let ascending = 0
    for (let i = 1; i < words.length; i++) {
      if ((words[i - 1] || '').toLowerCase() <= (words[i] || '').toLowerCase()) ascending++
    }
    const pct = words.length > 1 ? Math.round((ascending / (words.length - 1)) * 100) : 0
    console.log(`  adjacent-ascending pairs: ${ascending}/${words.length - 1} (${pct}%) ${pct >= 95 ? '⚠️ effectively alphabetical' : ''}`)

    const spread = firstLetterSpread(words)
    const letters = Object.keys(spread).sort()
    console.log('  first-letter range:', letters[0], '→', letters[letters.length - 1], '| distinct:', letters.length)
    console.log('  letter spread:', letters.map(l => `${l}:${spread[l]}`).join(' '))
    console.log('')
  }

  // overlap analysis between levels
  console.log('===== OVERLAP BETWEEN LEVELS =====')
  for (let i = 0; i < allSets.length; i++) {
    for (let j = i + 1; j < allSets.length; j++) {
      const a = new Set(allSets[i].words.map(w => w.toLowerCase()))
      const b = allSets[j].words.map(w => w.toLowerCase())
      const inter = b.filter(w => a.has(w)).length
      console.log(`  ${allSets[i].difficulty} ∩ ${allSets[j].difficulty}: ${inter} shared words`)
    }
  }
  process.exit(0)
}

main().catch((e: any) => { console.error(e); process.exit(1) })
