import type { UnifiedWord } from '@/types/unified-word'
import { getFieldString } from '@/lib/utils/word-field-normalizer'

export interface ExamQuestion {
  word: UnifiedWord
  options: string[] // 4개 정의(보기)
  optionWords: UnifiedWord[]
  correctAnswer: number // 정답 인덱스
}

const defOf = (w: UnifiedWord) => getFieldString(w.definition) || '정의 없음'

/**
 * 오늘 배치 단어로 4지선다 문제 생성.
 * - 문제 = batchWords (단어 보고 뜻 고르기)
 * - 오답 보기 = pool에서 정의가 겹치지 않게 선택 (quiz #7 로직 재사용)
 *   pool이 작으면 batchWords로 폴백.
 */
export function generateExamQuestions(batchWords: UnifiedWord[], pool?: UnifiedWord[]): ExamQuestion[] {
  const distractorPool = pool && pool.length >= 4 ? pool : batchWords

  const questions = batchWords.map((word) => {
    const correctDef = defOf(word)
    const others = distractorPool.filter((w) => w.id !== word.id).sort(() => Math.random() - 0.5)

    // 정의가 겹치지 않는 오답 3개
    const usedDefs = new Set<string>([correctDef])
    const distractors: UnifiedWord[] = []
    for (const w of others) {
      const def = defOf(w)
      if (!usedDefs.has(def)) {
        usedDefs.add(def)
        distractors.push(w)
        if (distractors.length === 3) break
      }
    }
    // 고유 정의가 부족하면 남은 단어로 채움
    if (distractors.length < 3) {
      for (const w of others) {
        if (!distractors.includes(w)) {
          distractors.push(w)
          if (distractors.length === 3) break
        }
      }
    }

    const optionWords = [word, ...distractors].sort(() => Math.random() - 0.5)
    const correctAnswer = optionWords.findIndex((w) => w.id === word.id)
    const options = optionWords.map(defOf)

    return { word, options, optionWords, correctAnswer }
  })

  // 외운 순서대로 내지 않도록 문제 순서를 섞는다 (Fisher-Yates)
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[questions[i], questions[j]] = [questions[j], questions[i]]
  }

  return questions
}
