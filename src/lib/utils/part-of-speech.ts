/**
 * 품사(part of speech) 표기 정규화.
 * DB에 "noun" / "n." / "adjective" / "Adjective" / "verb" 등 제각각으로 들어있는 값을
 * 표준 약어(n. / v. / a. / adv. / prep. / conj. / pron. / int. / det. / art. / num.)로 통일한다.
 * 표시 시점 안전망 + 백필 스크립트에서 공유.
 */

// 표준 약어 (사용자 지정: 명사 n., 동사 v., 형용사 a., 부사 adv. …)
export const POS_ABBR = {
  noun: 'n.',
  verb: 'v.',
  adjective: 'a.',
  adverb: 'adv.',
  pronoun: 'pron.',
  preposition: 'prep.',
  conjunction: 'conj.',
  interjection: 'int.',
  determiner: 'det.',
  article: 'art.',
  numeral: 'num.',
} as const

// 다양한 입력 → 표준 약어
const LOOKUP: Record<string, string> = {
  // noun
  'noun': 'n.', 'n': 'n.', 'n.': 'n.', 'nouns': 'n.',
  // verb
  'verb': 'v.', 'v': 'v.', 'v.': 'v.', 'verbs': 'v.',
  // adjective
  'adjective': 'a.', 'adj': 'a.', 'adj.': 'a.', 'a': 'a.', 'a.': 'a.', 'adjectives': 'a.',
  // adverb
  'adverb': 'adv.', 'adv': 'adv.', 'adv.': 'adv.', 'adverbs': 'adv.',
  // pronoun
  'pronoun': 'pron.', 'pron': 'pron.', 'pron.': 'pron.',
  // preposition
  'preposition': 'prep.', 'prep': 'prep.', 'prep.': 'prep.',
  // conjunction
  'conjunction': 'conj.', 'conj': 'conj.', 'conj.': 'conj.',
  // interjection
  'interjection': 'int.', 'interj': 'int.', 'int': 'int.', 'int.': 'int.', 'exclamation': 'int.',
  // determiner
  'determiner': 'det.', 'det': 'det.', 'det.': 'det.',
  // article
  'article': 'art.', 'art': 'art.', 'art.': 'art.',
  // numeral
  'numeral': 'num.', 'number': 'num.', 'num': 'num.', 'num.': 'num.',
}

// 표준 약어 자체(이미 변환된 값)
const VALID = new Set(Object.values(LOOKUP))

/** 단일 토큰을 표준 약어로. 알 수 없으면 null. */
function normalizeToken(token: string): string | null {
  const t = token.trim().toLowerCase()
  if (!t) return null
  if (LOOKUP[t]) return LOOKUP[t]
  // 끝의 마침표 제거 후 재시도
  const noDot = t.replace(/\.+$/, '')
  if (LOOKUP[noDot]) return LOOKUP[noDot]
  return null
}

/**
 * 품사 입력(문자열 또는 배열)을 표준 약어 배열로 정규화.
 * - "verb/adj", "verb, noun" 등 복합 표기는 분해
 * - 알 수 없는/깨진 값은 제거
 * - 중복 제거, 입력 순서 유지
 */
export function normalizePartOfSpeech(input: string | string[] | null | undefined): string[] {
  if (!input) return []
  const raw = Array.isArray(input) ? input : [input]
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    // 구분자로 분해: / , & 공백+슬래시 등
    const tokens = item.split(/[\/,&]|\s+and\s+/i)
    for (const tok of tokens) {
      const norm = normalizeToken(tok)
      if (norm && !seen.has(norm)) {
        seen.add(norm)
        out.push(norm)
      }
    }
  }
  return out
}

/** 표시용: 정규화된 약어들을 공백으로 결합 (예: "v. a."). 빈 값이면 빈 문자열. */
export function formatPartOfSpeech(input: string | string[] | null | undefined): string {
  return normalizePartOfSpeech(input).join(' ')
}

export { VALID as VALID_POS_ABBR }
