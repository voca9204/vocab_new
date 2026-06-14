/**
 * Speak text via the browser SpeechSynthesis API, hardened against the common
 * causes of bad-sounding pronunciation audio:
 *
 *  1. Chrome's `cancel()` is asynchronous. Calling `speak()` synchronously right
 *     after `cancel()` clips or garbles the first syllable, so we defer `speak()`.
 *  2. Right after page load the voice list may be empty; the first utterance then
 *     comes out garbled. We wait for `voiceschanged` before speaking.
 *  3. Repeated `speak()` without cancelling overlaps voices — we always cancel.
 *  4. Browsers often pick a poor / novelty default voice (e.g. macOS joke voices
 *     like "Albert", "Zarvox"). We explicitly select a high-quality English voice.
 */
export interface SpeakOptions {
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
}

// localStorage key for a user-chosen voice (set via a settings selector, if added)
const PREFERRED_VOICE_KEY = 'tts_preferred_voice'

// High-quality voices to prefer, in priority order (substring match on name).
const PREFERRED_VOICE_NAMES = [
  'Google US English',
  'Google UK English Female',
  'Google UK English Male',
  'Microsoft', // Microsoft Online (Natural) voices
  'Samantha',  // macOS US English (natural)
  'Alex',      // macOS US English (high quality)
  'Karen',     // en-AU
  'Daniel',    // en-GB
  'Moira',     // en-IE
  'Tessa',
  'Rishi',
]

// macOS novelty / robotic voices that sound wrong for vocabulary practice.
const NOVELTY_VOICE_NAMES = [
  'Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Fred',
  'Good News', 'Jester', 'Junior', 'Organ', 'Trinoids', 'Whisper', 'Wobble',
  'Zarvox', 'Superstar', 'Grandma', 'Grandpa', 'Eddy', 'Flo', 'Reed', 'Rocko',
  'Sandy', 'Shelley', 'Kathy', 'Ralph',
]

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  return window.speechSynthesis.getVoices().filter(v => v.lang?.startsWith('en'))
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined

  // 0) 사용자가 직접 고른 음성이 있으면 최우선
  try {
    const saved = localStorage.getItem(PREFERRED_VOICE_KEY)
    if (saved) {
      const chosen = voices.find(v => v.name === saved)
      if (chosen) return chosen
    }
  } catch {
    // localStorage 접근 불가(SSR 등) — 무시
  }

  const base = lang.split('-')[0]
  const enVoices = voices.filter(v => v.lang?.startsWith(base))
  const pool = enVoices.length > 0 ? enVoices : voices

  // 1) 선호 음성 목록 우선
  for (const name of PREFERRED_VOICE_NAMES) {
    const v = pool.find(voice => voice.name.includes(name))
    if (v) return v
  }
  // 2) 정확히 같은 lang & 농담 음성 제외
  const exact = pool.find(v => v.lang === lang && !isNovelty(v))
  if (exact) return exact
  // 3) 농담 음성 제외한 영어 음성
  const anyGood = pool.find(v => !isNovelty(v))
  return anyGood || pool[0]
}

function isNovelty(voice: SpeechSynthesisVoice): boolean {
  return NOVELTY_VOICE_NAMES.some(n => voice.name.includes(n))
}

export function speakText(text: string, opts: SpeakOptions = {}): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  const trimmed = text?.trim()
  if (!trimmed) return

  const synth = window.speechSynthesis
  synth.cancel() // 이전 발화 중단 (중복 재생/겹침 방지)

  let started = false
  const start = () => {
    if (started) return
    started = true

    const utterance = new SpeechSynthesisUtterance(trimmed)
    utterance.lang = opts.lang ?? 'en-US'
    utterance.rate = opts.rate ?? 0.95
    if (opts.pitch != null) utterance.pitch = opts.pitch
    if (opts.volume != null) utterance.volume = opts.volume

    const voice = pickVoice(synth.getVoices(), utterance.lang)
    if (voice) utterance.voice = voice

    synth.speak(utterance)
  }

  if (synth.getVoices().length === 0) {
    // 음성 목록 미로딩: 로드되면 발화 (+ voiceschanged 미발생 브라우저용 폴백)
    synth.addEventListener('voiceschanged', start, { once: true })
    setTimeout(start, 300)
  } else {
    // cancel()이 비동기라 한 틱 양보해야 Chrome에서 첫 음절이 깨지지 않음
    setTimeout(start, 60)
  }
}
