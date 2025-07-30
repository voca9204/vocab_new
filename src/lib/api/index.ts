// API Client Exports
export { freeDictionaryAPI } from './free-dictionary'
export { dictionaryClient } from './dictionary-client'

// Use the new compatibility layer
export { vocabularyService } from '../firebase/firestore-v2'
export { progressService } from '../firebase/firestore-v2'
export { newsService } from '../firebase/firestore-v2'

export type { StandardDictionaryResponse, APIError } from './dictionary-client'
export type { FreeDictionaryResponse, FreeDictionaryError } from './free-dictionary'

// Re-export for compatibility  
export type { VocabularyFetchOptions as LegacyVocabularyFetchOptions, VocabularyProcessResult as LegacyVocabularyProcessResult } from './vocabulary-service'
