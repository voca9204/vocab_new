// Free Dictionary API Client
// API Documentation: https://dictionaryapi.dev/

export interface FreeDictionaryResponse {
  word: string
  phonetic?: string
  phonetics: Array<{
    text?: string
    audio?: string
    sourceUrl?: string
  }>
  meanings: Array<{
    partOfSpeech: string
    definitions: Array<{
      definition: string
      synonyms?: string[]
      antonyms?: string[]
      example?: string
    }>
    synonyms?: string[]
    antonyms?: string[]
  }>
  license?: {
    name: string
    url: string
  }
  sourceUrls?: string[]
}

export interface FreeDictionaryError {
  title: string
  message: string
  resolution: string
}
class FreeDictionaryAPI {
  private readonly baseUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en'
  private readonly timeout = 10000 // 10 seconds

  async fetchWord(word: string): Promise<FreeDictionaryResponse[]> {
    try {
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(word)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Word "${word}" not found`)
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data as FreeDictionaryResponse[]
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Free Dictionary API error: ${error.message}`)
      }
      throw new Error('Unknown error occurred while fetching from Free Dictionary API')
    }
  }

  // Parse response into our standard format
  parseResponse(responses: FreeDictionaryResponse[]): any {
    if (!responses || responses.length === 0) {
      throw new Error('No definitions found')
    }

    const primary = responses[0]
    const allMeanings = responses.flatMap(r => r.meanings)
    
    return {
      word: primary.word,
      pronunciation: primary.phonetic || primary.phonetics?.[0]?.text || '',
      definitions: allMeanings.map(meaning => ({
        partOfSpeech: meaning.partOfSpeech,
        definition: meaning.definitions[0]?.definition || '',
        example: meaning.definitions[0]?.example || '',
        synonyms: meaning.synonyms || meaning.definitions[0]?.synonyms || [],
        antonyms: meaning.antonyms || meaning.definitions[0]?.antonyms || []
      })),
      audioUrl: primary.phonetics?.find(p => p.audio)?.audio || '',
      sourceUrls: primary.sourceUrls || [],
      apiSource: 'FreeDictionary' as const,
      timestamp: Date.now()
    }
  }
}

export const freeDictionaryAPI = new FreeDictionaryAPI()
