// Dictionary Service for word definitions
import { freeDictionaryAPI } from './free-dictionary'

export interface WordData {
  word: string
  phonetic?: string
  meanings: Array<{
    partOfSpeech: string
    definitions: Array<{
      definition: string
      example?: string
    }>
    synonyms?: string[]
    antonyms?: string[]
  }>
}

export class DictionaryService {
  async getWordData(word: string): Promise<WordData | null> {
    try {
      // Free Dictionary API 사용
      const response = await freeDictionaryAPI.fetchWord(word)
      
      if (response && response.length > 0) {
        const data = response[0]
        
        return {
          word: data.word,
          phonetic: data.phonetic,
          meanings: data.meanings.map(meaning => ({
            partOfSpeech: meaning.partOfSpeech,
            definitions: meaning.definitions.map(def => ({
              definition: def.definition,
              example: def.example
            })),
            synonyms: meaning.synonyms || [],
            antonyms: meaning.antonyms || []
          }))
        }
      }
      
      return null
    } catch (error) {
      console.error('Dictionary API error:', error)
      return null
    }
  }
}

export default DictionaryService