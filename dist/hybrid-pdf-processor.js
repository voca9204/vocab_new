/**
 * Hybrid PDF Processor
 * Achieves Claude-like extraction quality through layout preservation and intelligent parsing
 */
import OpenAI from 'openai';
// 일반적인 영어 단어 필터링
const COMMON_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'down', 'out', 'over', 'under',
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
    'might', 'must', 'can', 'shall', 'i', 'you', 'he', 'she', 'it', 'we',
    'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her',
    'its', 'our', 'their', 'this', 'that', 'these', 'those', 'what', 'which',
    'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'some',
    'any', 'many', 'much', 'more', 'most', 'less', 'least', 'very', 'too',
    'quite', 'just', 'only', 'not', 'no', 'yes', 'so', 'if', 'then', 'because',
    'as', 'until', 'while', 'although', 'though', 'since', 'before', 'after',
    'above', 'below', 'between', 'through', 'during', 'about', 'against',
    'page', 'chapter', 'section', 'part', 'unit', 'day', 'week', 'basic'
]);
export class HybridPDFProcessor {
    constructor(apiKey) {
        this.openai = null;
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
        }
    }
    /**
     * 메인 추출 함수
     */
    async extractFromPDF(buffer, fileName) {
        console.log('🚀 Starting hybrid PDF extraction...');
        // 1단계: PDF 파싱 및 레이아웃 보존
        const pdfLines = await this.parsePDFWithLayout(buffer);
        // 2단계: 섹션 타입 감지 및 그룹화
        const sections = this.identifySections(pdfLines);
        // 3단계: 섹션별 최적화된 추출
        const extractedWords = await this.extractWordsFromSections(sections, fileName);
        // 4단계: AI 기반 개선 및 정의 생성
        const enhancedWords = await this.enhanceWithAI(extractedWords, fileName);
        // 5단계: 중복 제거 및 품질 검증
        const finalWords = this.validateAndDeduplicate(enhancedWords);
        console.log(`✅ Extraction complete: ${finalWords.length} high-quality words`);
        return finalWords;
    }
    /**
     * PDF 파싱 with 레이아웃 보존
     */
    async parsePDFWithLayout(buffer) {
        try {
            // Next.js 환경에서 pdf-parse 모듈 로딩 처리
            let pdfParse;
            try {
                // 먼저 기본 import 시도
                pdfParse = require('pdf-parse');
            }
            catch (e) {
                // require 실패시 dynamic import 시도
                pdfParse = (await import('pdf-parse')).default;
            }
            // pdf-parse 실행
            const data = await pdfParse(buffer, {
                // 디버그 모드 비활성화를 위한 옵션
                pagerender: undefined,
                max: 0 // 모든 페이지 파싱
            });
            if (!data.text || data.text.length === 0) {
                console.error('No text extracted from PDF');
                return [];
            }
            const lines = data.text.split('\n');
            const pdfLines = [];
            lines.forEach((line, idx) => {
                const trimmedLine = line.trim();
                if (trimmedLine) {
                    pdfLines.push({
                        text: trimmedLine,
                        pageNum: Math.floor(idx / 50), // 대략적인 페이지 추정
                        lineNum: idx
                    });
                }
            });
            console.log(`Parsed ${pdfLines.length} lines from PDF`);
            return pdfLines;
        }
        catch (error) {
            console.error('PDF parsing error:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }
    /**
     * 섹션 타입 감지 및 그룹화
     */
    identifySections(pdfLines) {
        const sections = [];
        let currentSection = null;
        pdfLines.forEach((line, idx) => {
            const sectionType = this.detectSectionType(line, idx > 0 ? pdfLines[idx - 1] : undefined, idx < pdfLines.length - 1 ? pdfLines[idx + 1] : undefined);
            line.sectionType = sectionType;
            // 새로운 섹션 시작
            if (!currentSection || currentSection.type !== sectionType) {
                if (currentSection) {
                    currentSection.endLine = idx - 1;
                    sections.push(currentSection);
                }
                currentSection = {
                    type: sectionType,
                    lines: [line],
                    startLine: idx,
                    endLine: idx
                };
            }
            else {
                currentSection.lines.push(line);
            }
        });
        // 마지막 섹션 추가
        if (currentSection) {
            currentSection.endLine = pdfLines.length - 1;
            sections.push(currentSection);
        }
        return sections;
    }
    /**
     * 섹션 타입 감지 (개선된 로직)
     */
    detectSectionType(line, prevLine, nextLine) {
        const text = line.text;
        // 헤더 패턴: 짧고 대문자로 시작하거나 숫자로 시작
        if (/^(CHAPTER|SECTION|PART|DAY|WEEK|UNIT|LESSON|\d+\.)\s+/i.test(text) ||
            (text.length < 50 && /^[A-Z]/.test(text) && (!nextLine || nextLine.text === ''))) {
            line.confidence = 0.9;
            return 'header';
        }
        // 리스트 패턴: 번호나 불릿으로 시작
        if (/^[\d]+[.)\s]|^[•·▪▫◦‣⁃]\s|^[a-z][.)\s]/i.test(text)) {
            line.confidence = 0.85;
            return 'list';
        }
        // 정의 패턴: word - definition 또는 word: definition
        if (/^[a-zA-Z]+\s*[-–—:：=]\s*.+/.test(text)) {
            line.confidence = 0.95;
            return 'definition';
        }
        // 테이블 패턴: 탭이나 많은 공백으로 구분된 데이터
        if (/\t|\s{4,}/.test(text) && text.split(/\t|\s{4,}/).length >= 2) {
            line.confidence = 0.8;
            return 'table';
        }
        // 빈 줄이나 구분선
        if (text === '' || /^[-_=*]{3,}$/.test(text)) {
            return 'unknown';
        }
        line.confidence = 0.7;
        return 'paragraph';
    }
    /**
     * 섹션별 최적화된 단어 추출
     */
    async extractWordsFromSections(sections, fileName) {
        const extractedWords = [];
        for (const section of sections) {
            switch (section.type) {
                case 'definition':
                    extractedWords.push(...this.extractFromDefinitionSection(section));
                    break;
                case 'list':
                    extractedWords.push(...this.extractFromListSection(section));
                    break;
                case 'table':
                    extractedWords.push(...this.extractFromTableSection(section));
                    break;
                case 'paragraph':
                    extractedWords.push(...this.extractFromParagraphSection(section));
                    break;
                case 'header':
                case 'unknown':
                    // 헤더나 알 수 없는 섹션은 스킵
                    break;
            }
        }
        return extractedWords;
    }
    /**
     * 정의 섹션에서 추출
     */
    extractFromDefinitionSection(section) {
        const words = [];
        const patterns = [
            /^([a-zA-Z]+)\s*[-–—]\s*(.+)$/, // word - definition
            /^([a-zA-Z]+)\s*[:：]\s*(.+)$/, // word: definition
            /^([a-zA-Z]+)\s*[=]\s*(.+)$/, // word = definition
            /^([a-zA-Z]+)\s*\(([^)]+)\)\s*(.+)$/, // word (part) definition
        ];
        for (const line of section.lines) {
            for (const pattern of patterns) {
                const match = line.text.match(pattern);
                if (match) {
                    const word = match[1].toLowerCase();
                    const definition = match[match.length - 1];
                    if (this.isValidVocabularyWord(word)) {
                        words.push({
                            word,
                            definition: definition.trim(),
                            context: line.text,
                            pageNum: line.pageNum,
                            confidence: 0.9
                        });
                        break;
                    }
                }
            }
        }
        return words;
    }
    /**
     * 리스트 섹션에서 추출
     */
    extractFromListSection(section) {
        const words = [];
        const patterns = [
            /^\d+[.)\s]+([a-zA-Z]+)\s+(.+)$/, // 1. word definition
            /^[•·▪▫◦‣⁃]\s*([a-zA-Z]+)\s+(.+)$/, // • word definition
            /^[a-z][.)\s]+([a-zA-Z]+)\s+(.+)$/, // a) word definition
        ];
        for (const line of section.lines) {
            for (const pattern of patterns) {
                const match = line.text.match(pattern);
                if (match) {
                    const word = match[1].toLowerCase();
                    const definition = match[2];
                    if (this.isValidVocabularyWord(word)) {
                        words.push({
                            word,
                            definition: definition.trim(),
                            context: line.text,
                            pageNum: line.pageNum,
                            confidence: 0.85
                        });
                        break;
                    }
                }
            }
        }
        return words;
    }
    /**
     * 테이블 섹션에서 추출 (TOEFL 형식 등)
     */
    extractFromTableSection(section) {
        const words = [];
        for (const line of section.lines) {
            // TOEFL 형식: word synonyms Korean meaning
            // 첫 번째 단어를 추출
            const firstWordMatch = line.text.match(/^([a-zA-Z]+)\s/);
            if (firstWordMatch) {
                const word = firstWordMatch[1].toLowerCase();
                if (this.isValidVocabularyWord(word)) {
                    // 한글 정의 찾기
                    const koreanMatch = line.text.match(/[\u3131-\uD79D].+/);
                    // 한글 이전의 영어 부분 (동의어들)
                    let synonymText = '';
                    if (koreanMatch) {
                        const koreanIndex = line.text.indexOf(koreanMatch[0]);
                        synonymText = line.text.substring(word.length, koreanIndex).trim();
                    }
                    else {
                        synonymText = line.text.substring(word.length).trim();
                    }
                    // 동의어 추출 (콤마로 구분된 단어들)
                    const synonyms = synonymText
                        .split(/[,\s]+/)
                        .filter(w => /^[a-zA-Z]+$/.test(w) && w.length > 2 && !COMMON_WORDS.has(w.toLowerCase()))
                        .slice(0, 10);
                    words.push({
                        word,
                        definition: koreanMatch ? koreanMatch[0] : undefined,
                        synonyms: synonyms.length > 0 ? synonyms : undefined,
                        context: line.text,
                        pageNum: line.pageNum,
                        confidence: 0.8
                    });
                }
            }
        }
        return words;
    }
    /**
     * 일반 단락에서 추출
     */
    extractFromParagraphSection(section) {
        const words = [];
        for (const line of section.lines) {
            // TOEFL 형식도 여기서 처리 (첫 단어가 vocabulary word)
            const firstWordMatch = line.text.match(/^([a-zA-Z]+)\s/);
            if (firstWordMatch) {
                const word = firstWordMatch[1].toLowerCase();
                if (this.isValidVocabularyWord(word)) {
                    // 한글 정의 찾기
                    const koreanMatch = line.text.match(/[\u3131-\uD79D].+/);
                    // 동의어 부분 추출
                    let synonymText = '';
                    if (koreanMatch) {
                        const koreanIndex = line.text.indexOf(koreanMatch[0]);
                        synonymText = line.text.substring(word.length, koreanIndex).trim();
                    }
                    else {
                        synonymText = line.text.substring(word.length).trim();
                    }
                    // 동의어 파싱
                    const synonyms = synonymText
                        .split(/[,\s]+/)
                        .filter(w => /^[a-zA-Z]+$/.test(w) && w.length > 2 && !COMMON_WORDS.has(w.toLowerCase()))
                        .slice(0, 10);
                    words.push({
                        word,
                        definition: koreanMatch ? koreanMatch[0] : synonymText.substring(0, 100),
                        synonyms: synonyms.length > 0 ? synonyms : undefined,
                        context: line.text,
                        pageNum: line.pageNum,
                        confidence: 0.75
                    });
                }
            }
        }
        return words;
    }
    /**
     * AI 기반 개선 및 정의 생성
     */
    async enhanceWithAI(words, fileName) {
        if (!this.openai || words.length === 0) {
            return words;
        }
        // 컨텍스트 추출
        const testType = this.detectTestType(fileName);
        // 정의가 필요한 단어들 그룹화
        const wordsNeedingDef = words.filter(w => !w.definition || w.confidence < 0.7);
        const wordsWithDef = words.filter(w => w.definition && w.confidence >= 0.7);
        if (wordsNeedingDef.length > 0) {
            const enhanced = await this.generateStructuredDefinitions(wordsNeedingDef.slice(0, 50), testType);
            // 기존 단어와 병합
            const enhancedMap = new Map(enhanced.map(w => [w.word, w]));
            wordsNeedingDef.forEach(w => {
                const enhancedWord = enhancedMap.get(w.word);
                if (enhancedWord) {
                    Object.assign(w, enhancedWord);
                }
            });
        }
        return [...wordsWithDef, ...wordsNeedingDef];
    }
    /**
     * 구조화된 정의 생성
     */
    async generateStructuredDefinitions(words, testType) {
        if (!this.openai)
            return words;
        const prompt = `You are a professional vocabulary extraction specialist for ${testType} test preparation.

Analyze these vocabulary words and provide high-quality definitions:

${words.map(w => `- ${w.word}${w.context ? ` (context: "${w.context.substring(0, 100)}...")` : ''}`).join('\n')}

For each word, provide:
1. Clear, concise definition suitable for ${testType} level
2. Korean translation when applicable
3. Part of speech (noun, verb, adjective, adverb, etc.)
4. Etymology when it helps understanding
5. Common synonyms
6. One example sentence

Return as JSON with this exact structure:
{
  "words": [
    {
      "word": "string",
      "definition": "Clear English definition (Korean translation)",
      "partOfSpeech": ["noun"],
      "etymology": "Origin and root meaning",
      "synonyms": ["synonym1", "synonym2"],
      "examples": ["Example sentence."],
      "pronunciation": "pronunciation guide"
    }
  ]
}

Focus on accuracy and test-relevance. Include Korean translations in parentheses.`;
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert vocabulary teacher specializing in standardized test preparation.'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.2,
                max_tokens: 4000,
                response_format: { type: 'json_object' }
            });
            const content = response.choices[0]?.message?.content || '{}';
            const parsed = JSON.parse(content);
            const enhancedWords = parsed.words || [];
            return enhancedWords.map((w) => ({
                ...w,
                confidence: 1.0
            }));
        }
        catch (error) {
            console.error('AI enhancement failed:', error);
            return words;
        }
    }
    /**
     * 시험 타입 감지
     */
    detectTestType(fileName) {
        if (!fileName)
            return 'vocabulary';
        const lowerName = fileName.toLowerCase();
        if (/toefl/i.test(lowerName))
            return 'TOEFL';
        if (/sat/i.test(lowerName))
            return 'SAT';
        if (/gre/i.test(lowerName))
            return 'GRE';
        if (/ielts/i.test(lowerName))
            return 'IELTS';
        if (/toeic/i.test(lowerName))
            return 'TOEIC';
        if (/수능/i.test(lowerName))
            return '수능';
        return 'vocabulary';
    }
    /**
     * 중복 제거 및 품질 검증
     */
    validateAndDeduplicate(words) {
        const uniqueWords = new Map();
        // 신뢰도 순으로 정렬
        words.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
        for (const word of words) {
            const key = word.word.toLowerCase();
            // 이미 있는 단어는 더 나은 정의로 업데이트
            if (uniqueWords.has(key)) {
                const existing = uniqueWords.get(key);
                if ((word.confidence || 0) > (existing.confidence || 0) ||
                    (word.definition && !existing.definition)) {
                    uniqueWords.set(key, word);
                }
            }
            else {
                uniqueWords.set(key, word);
            }
        }
        // 최종 검증
        return Array.from(uniqueWords.values())
            .filter(w => w.definition && w.definition.length > 5)
            .slice(0, 500); // 최대 500개
    }
    /**
     * 유효한 어휘 단어인지 확인
     */
    isValidVocabularyWord(word) {
        return (/^[a-zA-Z]{3,25}$/.test(word) &&
            !COMMON_WORDS.has(word) &&
            // 고급 어휘 패턴 (라틴어 접두사/접미사)
            (/^(un|re|pre|post|anti|de|dis|over|under|sub|super|inter|trans|non)/.test(word) ||
                /(tion|sion|ment|ness|ity|ous|ive|able|ible|ful|less|ly|ward|wise)$/.test(word) ||
                word.length >= 6) // 6글자 이상은 대체로 고급 어휘
        );
    }
}
// Default export for compatibility
export default HybridPDFProcessor;
