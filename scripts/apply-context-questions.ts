/**
 * scripts/data/ctx-fills/*.json (id -> {format,passage,options,answer}) 검증 후
 * words_v3.contextQuestion 에 적용. dry-run(기본) / --write.
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

const CHUNKS = path.join(process.cwd(), 'scripts/data/ctx-chunks')
const FILLS = path.join(process.cwd(), 'scripts/data/ctx-fills')

function validate(q: any, word: string): { ok: boolean; reason?: string; norm?: any } {
  if (!q || typeof q !== 'object') return { ok: false, reason: 'not object' }
  const passage = typeof q.passage === 'string' ? q.passage.trim() : ''
  if (passage.length < 15) return { ok: false, reason: 'short passage' }
  const options = Array.isArray(q.options) ? q.options.map((o: any) => String(o).trim()).filter(Boolean) : []
  if (options.length !== 4) return { ok: false, reason: `options=${options.length}` }
  const answer = Number(q.answer)
  if (!Number.isInteger(answer) || answer < 0 || answer > 3) return { ok: false, reason: 'bad answer' }
  // 형식은 라벨이 아니라 내용으로 확정: 빈칸이 있으면 cloze, 없으면 meaning
  const format = passage.includes('___') ? 'cloze' : 'meaning'
  // meaning은 본문에 단어(또는 활용형)가 있어야 함 — 어간 기준으로 검사
  const lw = word.toLowerCase()
  const stem = lw.slice(0, Math.max(4, lw.length - 3))
  if (format === 'meaning' && !passage.toLowerCase().includes(stem)) {
    return { ok: false, reason: 'meaning passage missing word' }
  }
  return { ok: true, norm: { word, format, passage, options, answer } }
}

async function main() {
  const expected = new Map<string, string>()
  for (const f of fs.readdirSync(CHUNKS)) {
    JSON.parse(fs.readFileSync(path.join(CHUNKS, f), 'utf8')).forEach((e: any) => expected.set(e.id, e.word))
  }
  const fills = new Map<string, any>()
  let bad = 0
  const badSamples: string[] = []
  for (const f of fs.existsSync(FILLS) ? fs.readdirSync(FILLS) : []) {
    if (!f.endsWith('.json')) continue
    let obj: any
    try {
      obj = JSON.parse(fs.readFileSync(path.join(FILLS, f), 'utf8'))
    } catch (e: any) {
      console.error(`!! skipped ${f}: invalid JSON (${e.message})`)
      continue
    }
    for (const [id, q] of Object.entries(obj)) {
      const v = validate(q, expected.get(id) || '')
      if (!v.ok) { bad++; if (badSamples.length < 10) badSamples.push(`${expected.get(id) || id}:${v.reason}`); continue }
      fills.set(id, v.norm)
    }
  }

  const missing: string[] = []
  expected.forEach((word, id) => { if (!fills.has(id)) missing.push(word) })
  const fmt: Record<string, number> = {}
  fills.forEach((q) => { fmt[q.format] = (fmt[q.format] || 0) + 1 })

  console.log(`Expected ids: ${expected.size}`)
  console.log(`Valid questions: ${fills.size}  (cloze=${fmt.cloze || 0}, meaning=${fmt.meaning || 0})`)
  console.log(`Invalid dropped: ${bad}${badSamples.length ? '  e.g. ' + badSamples.join(', ') : ''}`)
  console.log(`Unfilled ids: ${missing.length}${missing.length ? '  e.g. ' + missing.slice(0, 15).join(', ') : ''}`)

  console.log('\nSamples:')
  let shown = 0
  for (const [id, q] of fills) {
    console.log(`  [${q.format}] ${expected.get(id)}`)
    console.log(`    ${q.passage}`)
    console.log(`    ${q.options.map((o: string, i: number) => `${i === q.answer ? '*' : ' '}${o}`).join(' | ')}`)
    if (++shown >= 5) break
  }

  if (!WRITE) { console.log('\n(DRY RUN — re-run with --write to apply.)'); process.exit(0) }

  console.log('\nWriting to words_v3...')
  let batch = db.batch(), n = 0, done = 0
  for (const [id, q] of fills) {
    if (!expected.has(id)) continue
    batch.update(db.collection('words_v3').doc(id), { contextQuestion: q })
    n++; done++
    if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0 }
  }
  if (n > 0) await batch.commit()
  console.log(`  wrote ${done}/${fills.size}\nDONE.`)
  process.exit(0)
}
main().catch((e: any) => { console.error(e); process.exit(1) })
