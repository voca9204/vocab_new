/**
 * 단순화된 PDF 추출기
 * PDF에서 영어 단어만 추출하고, AI로 정의를 생성하는 방식
 */

// 일반적인 영어 단어 (필터링할 단어들)
const COMMON_WORDS = new Set([
  // Articles & Determiners
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  
  // Pronouns
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'us', 'them',
  
  // Common Verbs
  'be', 'is', 'am', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing', 'will', 'would', 'shall', 'should', 'may', 'might',
  'must', 'can', 'could', 'get', 'got', 'gotten', 'getting', 'go', 'goes', 'went', 'going', 'gone',
  'make', 'makes', 'made', 'making', 'come', 'comes', 'came', 'coming',
  'take', 'takes', 'took', 'taking', 'taken', 'know', 'knows', 'knew', 'knowing', 'known',
  'see', 'sees', 'saw', 'seeing', 'seen', 'want', 'wants', 'wanted', 'wanting',
  'say', 'says', 'said', 'saying', 'think', 'thinks', 'thought', 'thinking',
  
  // Common Prepositions
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'down', 'out', 'over',
  'under', 'about', 'into', 'through', 'during', 'before', 'after', 'between', 'among',
  
  // Common Conjunctions
  'and', 'or', 'but', 'if', 'because', 'as', 'until', 'while', 'when', 'where', 'so', 'than',
  
  // Common Adverbs
  'not', 'now', 'then', 'here', 'there', 'very', 'just', 'only', 'also', 'well', 'even',
  'back', 'still', 'too', 'quite', 'again', 'already', 'always', 'never', 'often', 'sometimes',
  
  // Common Adjectives
  'good', 'bad', 'new', 'old', 'great', 'big', 'small', 'large', 'long', 'little', 'own',
  'other', 'same', 'different', 'such', 'much', 'many', 'more', 'most', 'some', 'any', 'all',
  'each', 'every', 'no', 'first', 'last', 'next', 'few', 'several',
  
  // Common Nouns (basic)
  'time', 'year', 'day', 'way', 'man', 'woman', 'child', 'people', 'person', 'thing',
  'work', 'life', 'hand', 'part', 'place', 'case', 'point', 'number', 'group', 'problem',
  'fact', 'week', 'month', 'lot', 'right', 'left', 'today', 'tomorrow', 'yesterday',
  
  // Question Words
  'what', 'which', 'who', 'whom', 'whose', 'why', 'how',
  
  // Days & Months
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  
  // Numbers
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'hundred', 'thousand', 'million', 'billion',
  
  // File/Document related (often in PDFs)
  'page', 'chapter', 'section', 'unit', 'lesson', 'test', 'quiz', 'answer', 'question',
  'example', 'exercise', 'practice', 'vocabulary', 'word', 'list', 'study', 'review'
])

export interface SimplifiedExtractionResult {
  words: string[]
  stats: {
    totalWords: number
    uniqueWords: number
    filteredWords: number
    academicWords: number
  }
}

export class SimplifiedPDFExtractor {
  /**
   * PDF에서 영어 단어만 추출 (정의 없이)
   */
  async extractWordsOnly(file: File): Promise<SimplifiedExtractionResult> {
    try {
      console.log('📄 [SimplifiedExtractor] PDF 텍스트 추출 시작...')
      
      // 1. PDF에서 텍스트 추출 (기존 API 활용)
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/pdf-extract', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('PDF 추출 실패')
      }
      
      const { text, words: rawWords } = await response.json()
      
      console.log(`📊 [SimplifiedExtractor] 추출된 원시 단어: ${rawWords.length}개`)
      
      // 2. 학술 단어만 필터링
      const academicWords = this.filterAcademicWords(rawWords)
      
      console.log(`🎓 [SimplifiedExtractor] 학술 단어: ${academicWords.length}개`)
      
      // 3. 통계 생성
      const stats = {
        totalWords: rawWords.length,
        uniqueWords: new Set(rawWords.map(w => w.toLowerCase())).size,
        filteredWords: rawWords.length - academicWords.length,
        academicWords: academicWords.length
      }
      
      return {
        words: academicWords,
        stats
      }
      
    } catch (error) {
      console.error('❌ [SimplifiedExtractor] 추출 오류:', error)
      throw error
    }
  }
  
  /**
   * 학술 단어 필터링 (SAT/TOEFL 레벨)
   */
  private filterAcademicWords(words: string[]): string[] {
    const filtered = words
      .map(word => word.toLowerCase().trim())
      .filter(word => {
        // 기본 필터링 조건
        if (word.length < 4 || word.length > 20) return false
        if (!/^[a-z]+$/.test(word)) return false
        if (COMMON_WORDS.has(word)) return false
        
        // 학술 단어 특성 체크
        return this.isLikelyAcademicWord(word)
      })
    
    // 중복 제거 및 정렬
    return [...new Set(filtered)].sort()
  }
  
  /**
   * 학술 단어 가능성 판단
   */
  private isLikelyAcademicWord(word: string): boolean {
    // SAT/TOEFL에 자주 나오는 패턴
    const academicPrefixes = [
      'ab', 'ad', 'anti', 'auto', 'co', 'com', 'con', 'contra', 'de', 'dis',
      'ex', 'extra', 'hetero', 'homo', 'hyper', 'il', 'im', 'in', 'inter',
      'intra', 'macro', 'micro', 'mono', 'non', 'omni', 'para', 'poly',
      'post', 'pre', 'pro', 'pseudo', 're', 'semi', 'sub', 'super', 'syn',
      'trans', 'ultra', 'un', 'uni'
    ]
    
    const academicSuffixes = [
      'able', 'ible', 'acy', 'ance', 'ence', 'ate', 'fy', 'ify', 'ism',
      'ist', 'ity', 'ive', 'ize', 'ise', 'ment', 'ness', 'ous', 'ious',
      'tion', 'sion', 'ture', 'al', 'ial', 'ic', 'ical', 'ary', 'ory',
      'logy', 'nomy', 'graphy', 'metry', 'phobia', 'cracy', 'crat'
    ]
    
    const academicRoots = [
      'acu', 'anim', 'annu', 'aud', 'bell', 'bene', 'bio', 'ced', 'ceed',
      'cept', 'chron', 'cide', 'claim', 'clud', 'cogn', 'corp', 'cred',
      'dem', 'dict', 'doc', 'duc', 'fac', 'fer', 'flect', 'flux', 'form',
      'fort', 'frag', 'gen', 'geo', 'grad', 'graph', 'grat', 'gress',
      'ject', 'jud', 'jur', 'lect', 'leg', 'liber', 'loc', 'log', 'luc',
      'magn', 'mal', 'man', 'medi', 'mem', 'ment', 'migr', 'min', 'mort',
      'mov', 'mut', 'nat', 'neg', 'nom', 'nov', 'pac', 'pan', 'path',
      'ped', 'pel', 'pend', 'phil', 'phon', 'plic', 'pon', 'port', 'pot',
      'prim', 'prob', 'pug', 'quer', 'ques', 'reg', 'rupt', 'sci', 'scrib',
      'sect', 'sent', 'sequ', 'simil', 'sol', 'son', 'spec', 'sta', 'tact',
      'tain', 'temp', 'ten', 'term', 'terr', 'test', 'the', 'tort', 'tract',
      'trib', 'turb', 'vac', 'val', 'ven', 'ver', 'vers', 'vert', 'vid',
      'vis', 'vit', 'voc', 'vol', 'vor'
    ]
    
    // 학술적 특성 점수 계산
    let score = 0
    
    // 길이 점수 (5-15자가 학술 단어에 일반적)
    if (word.length >= 5 && word.length <= 15) score += 1
    
    // 접두사 체크
    if (academicPrefixes.some(prefix => word.startsWith(prefix))) score += 2
    
    // 접미사 체크
    if (academicSuffixes.some(suffix => word.endsWith(suffix))) score += 2
    
    // 어근 체크
    if (academicRoots.some(root => word.includes(root))) score += 1
    
    // 음절 수 (3음절 이상이면 학술 단어 가능성 높음)
    const syllableCount = this.countSyllables(word)
    if (syllableCount >= 3) score += 1
    
    // 점수가 2 이상이면 학술 단어로 판단
    return score >= 2
  }
  
  /**
   * 음절 수 계산 (간단한 휴리스틱)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase()
    let count = 0
    let previousWasVowel = false
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = 'aeiou'.includes(word[i])
      if (isVowel && !previousWasVowel) {
        count++
      }
      previousWasVowel = isVowel
    }
    
    // 끝에 'e'가 있으면 보통 묵음
    if (word.endsWith('e')) count--
    
    // 최소 1음절
    return Math.max(1, count)
  }
  
  /**
   * Discovery API를 사용하여 단어 정의 생성
   * @param words 정의를 생성할 단어 목록
   * @param userId 사용자 ID (필수)
   */
  async generateDefinitionsForWords(words: string[], userId: string): Promise<any[]> {
    const definitions = []
    
    // 배치 처리를 위한 딜레이 함수
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      
      try {
        const response = await fetch('/api/vocabulary/discover', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            word,
            userId,
            context: 'PDF extraction'
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          definitions.push(data.word)
          console.log(`✅ [${i + 1}/${words.length}] ${word} 정의 생성 완료`)
        } else {
          const errorText = await response.text()
          console.warn(`[SimplifiedExtractor] ${word} 정의 생성 실패: ${response.status} - ${errorText}`)
          definitions.push({
            word,
            definition: '정의를 생성할 수 없습니다',
            partOfSpeech: ['n.'],
            difficulty: 5,
            frequency: 5
          })
        }
        
        // API 부하 방지를 위한 딜레이 (300ms)
        if (i < words.length - 1) {
          await delay(300)
        }
      } catch (error) {
        console.error(`[SimplifiedExtractor] ${word} 처리 오류:`, error)
        definitions.push({
          word,
          definition: '정의 생성 중 오류 발생',
          partOfSpeech: ['n.'],
          difficulty: 5,
          frequency: 5
        })
      }
    }
    
    return definitions
  }
}

export default SimplifiedPDFExtractor