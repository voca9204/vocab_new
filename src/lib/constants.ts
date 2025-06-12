// Application constants and configuration

export const APP_CONFIG = {
  name: 'SAT Vocabulary Learning Platform',
  version: '2.0.0',
  description: 'Contextual SAT vocabulary learning with news integration',
} as const

export const API_ENDPOINTS = {
  FREE_DICTIONARY: 'https://api.dictionaryapi.dev/api/v2/entries/en',
  MERRIAM_WEBSTER: 'https://www.dictionaryapi.com/api/v3/references/collegiate/json',
  WORDS_API: 'https://wordsapiv1.p.rapidapi.com/words',
} as const

export const FIREBASE_COLLECTIONS = {
  USERS: 'users',
  VOCABULARY: 'vocabulary',
  PROGRESS: 'progress',
  NEWS: 'news',
  ANALYTICS: 'analytics',
} as const

export const QUIZ_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  FILL_BLANK: 'fill_blank',
  CONTEXTUAL: 'contextual',
} as const

export const DIFFICULTY_LEVELS = {
  BEGINNER: 1,
  ELEMENTARY: 2,
  INTERMEDIATE: 3,
  UPPER_INTERMEDIATE: 4,
  ADVANCED: 5,
  EXPERT: 6,
  SAT_LEVEL: 7,
  GRE_LEVEL: 8,
  ACADEMIC: 9,
  PROFESSIONAL: 10,
} as const

export const MASTERY_LEVELS = {
  NOT_STUDIED: 0,
  INTRODUCED: 0.2,
  LEARNING: 0.4,
  PRACTICING: 0.6,
  PROFICIENT: 0.8,
  MASTERED: 1.0,
} as const

export const DEFAULT_SETTINGS = {
  DAILY_GOAL: 20,
  QUIZ_LENGTH: 10,
  SPACED_REPETITION: true,
  ADAPTIVE_DIFFICULTY: true,
  NEWS_INTEGRATION: true,
  PRONUNCIATION_AUDIO: true,
} as const

// News Processing Constants
export const NEWS_CONFIG = {
  // Crawling settings
  MAX_ARTICLES_PER_SOURCE: 20,
  CRAWLING_INTERVAL_HOURS: 6,
  MAX_CONTENT_LENGTH: 10000,
  MIN_CONTENT_LENGTH: 500,
  REQUIRED_SAT_WORDS: 3,
  MAX_RETRIES: 3,
  TIMEOUT_SECONDS: 30,
  
  // Quality thresholds
  MIN_QUALITY_SCORE: 6,
  MIN_SAT_WORD_DENSITY: 0.5, // 0.5%
  
  // Content filtering
  BLOCKED_KEYWORDS: [
    'violence', 'graphic', 'explicit', 'disturbing',
    'inappropriate', 'mature content', 'adult'
  ],
  
  // Reliable news sources
  NEWS_SOURCES: [
    {
      id: 'bbc-news',
      name: 'BBC News',
      url: 'https://feeds.bbci.co.uk/news/rss.xml',
      type: 'rss' as const,
      category: 'general' as const,
      reliability: 9,
      language: 'en',
      region: 'global'
    },
    {
      id: 'reuters',
      name: 'Reuters',
      url: 'https://www.reutersagency.com/feed/',
      type: 'rss' as const,
      category: 'general' as const,
      reliability: 9,
      language: 'en',
      region: 'global'
    },
    {
      id: 'npr-news',
      name: 'NPR News',
      url: 'https://feeds.npr.org/1001/rss.xml',
      type: 'rss' as const,
      category: 'general' as const,
      reliability: 8,
      language: 'en',
      region: 'us'
    },
    {
      id: 'science-daily',
      name: 'Science Daily',
      url: 'https://www.sciencedaily.com/rss/all.xml',
      type: 'rss' as const,
      category: 'science' as const,
      reliability: 8,
      language: 'en',
      region: 'global'
    }
  ]
} as const

// SAT Word Detection Patterns
export const SAT_WORD_PATTERNS = {
  // Common SAT word prefixes
  PREFIXES: [
    'un-', 'in-', 're-', 'pre-', 'mis-', 'over-', 'out-', 'up-',
    'under-', 'counter-', 'anti-', 'auto-', 'co-', 'de-', 'dis-',
    'inter-', 'multi-', 'non-', 'post-', 'sub-', 'super-', 'trans-'
  ],
  
  // Common SAT word suffixes
  SUFFIXES: [
    '-tion', '-sion', '-ment', '-ness', '-ity', '-ous', '-ive',
    '-able', '-ible', '-ate', '-ize', '-ify', '-ism', '-ist',
    '-ful', '-less', '-ward', '-wise', '-like', '-ship'
  ],
  
  // Academic vocabulary indicators
  ACADEMIC_INDICATORS: [
    'analysis', 'synthesis', 'evaluate', 'hypothesis', 'methodology',
    'significant', 'substantial', 'comprehensive', 'fundamental',
    'conceptual', 'theoretical', 'empirical', 'systematic'
  ]
}

// Content Quality Metrics
export const CONTENT_QUALITY = {
  SENTENCE_LENGTH: {
    MIN: 10,
    MAX: 40,
    OPTIMAL: 20
  },
  
  PARAGRAPH_LENGTH: {
    MIN: 3,
    MAX: 8,
    OPTIMAL: 5
  },
  
  READABILITY: {
    GRADE_LEVEL_MIN: 9,  // 9th grade
    GRADE_LEVEL_MAX: 12, // 12th grade
    OPTIMAL: 10.5
  }
}
