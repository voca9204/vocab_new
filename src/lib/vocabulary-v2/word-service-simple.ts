// Simple word service for server-side operations using Firebase REST API
import type { Word } from '@/types/vocabulary-v2'

export class WordServiceSimple {
  private readonly baseUrl: string
  private readonly projectId: string
  private readonly apiKey: string

  constructor() {
    this.projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vocabulary-app-new'
    this.apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`
  }

  // Convert Firestore value format to JavaScript value
  private fromFirestoreValue(value: any): any {
    if (value.nullValue !== undefined) return null
    if (value.stringValue !== undefined) return value.stringValue
    if (value.integerValue !== undefined) return parseInt(value.integerValue)
    if (value.doubleValue !== undefined) return value.doubleValue
    if (value.booleanValue !== undefined) return value.booleanValue
    if (value.timestampValue !== undefined) return new Date(value.timestampValue)
    if (value.arrayValue !== undefined) {
      return value.arrayValue.values?.map((v: any) => this.fromFirestoreValue(v)) || []
    }
    if (value.mapValue !== undefined) {
      const obj: any = {}
      for (const [key, val] of Object.entries(value.mapValue.fields || {})) {
        obj[key] = this.fromFirestoreValue(val)
      }
      return obj
    }
    return null
  }

  // Convert JavaScript value to Firestore value format
  private toFirestoreValue(value: any): any {
    if (value === null || value === undefined) return { nullValue: null }
    if (typeof value === 'string') return { stringValue: value }
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return { integerValue: value.toString() }
      return { doubleValue: value }
    }
    if (typeof value === 'boolean') return { booleanValue: value }
    if (value instanceof Date) return { timestampValue: value.toISOString() }
    if (Array.isArray(value)) {
      return {
        arrayValue: {
          values: value.map(v => this.toFirestoreValue(v))
        }
      }
    }
    if (typeof value === 'object') {
      const fields: any = {}
      for (const [key, val] of Object.entries(value)) {
        fields[key] = this.toFirestoreValue(val)
      }
      return { mapValue: { fields } }
    }
    return { stringValue: String(value) }
  }

  // Convert Firestore document to Word object
  private documentToWord(doc: any): Word {
    const data: any = {}
    for (const [key, value] of Object.entries(doc.fields || {})) {
      data[key] = this.fromFirestoreValue(value)
    }
    
    return {
      id: doc.name.split('/').pop(),
      ...data,
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date()
    } as Word
  }

  async searchWords(
    searchQuery: string = '', 
    options: {
      limit?: number
      vocabularyId?: string
      partOfSpeech?: string
      difficulty?: { min: number, max: number }
      onlySAT?: boolean
      orderBy?: 'word' | 'difficulty' | 'frequency' | 'createdAt'
      orderDirection?: 'asc' | 'desc'
    } = {}
  ): Promise<Word[]> {
    try {
      // For simplicity, we'll just get all words without filtering
      // In a real implementation, we'd build proper queries
      const url = `${this.baseUrl}/words?pageSize=${options.limit || 100}&key=${this.apiKey}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        console.error('Firestore REST API error:', await response.text())
        return []
      }

      const data = await response.json()
      const documents = data.documents || []
      
      return documents.map((doc: any) => this.documentToWord(doc))
    } catch (error) {
      console.error('Error fetching words:', error)
      return []
    }
  }

  async getWordsByIds(wordIds: string[]): Promise<Word[]> {
    try {
      const words = await Promise.all(
        wordIds.map(async (wordId) => {
          const url = `${this.baseUrl}/words/${wordId}?key=${this.apiKey}`
          const response = await fetch(url)
          
          if (!response.ok) return null
          
          const doc = await response.json()
          return this.documentToWord(doc)
        })
      )
      
      return words.filter(w => w !== null) as Word[]
    } catch (error) {
      console.error('Error fetching words by IDs:', error)
      return []
    }
  }

  async updateWord(wordId: string, updates: Partial<Word>): Promise<void> {
    try {
      const fields: any = {}
      for (const [key, value] of Object.entries(updates)) {
        fields[key] = this.toFirestoreValue(value)
      }
      
      // Add updatedAt timestamp
      fields.updatedAt = this.toFirestoreValue(new Date())
      
      const updateMask = Object.keys(fields).join(',')
      const url = `${this.baseUrl}/words/${wordId}?updateMask.fieldPaths=${updateMask}&key=${this.apiKey}`
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields })
      })

      if (!response.ok) {
        throw new Error(`Failed to update word: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error updating word:', error)
      throw error
    }
  }

  async markAsAIGenerated(wordId: string, type: 'etymology' | 'examples'): Promise<void> {
    try {
      const field = type === 'etymology' ? 'aiGeneratedEtymology' : 'aiGeneratedExamples'
      await this.updateWord(wordId, {
        [field]: true,
        [`${field}At`]: new Date()
      } as any)
    } catch (error) {
      console.error(`Error marking ${type} as AI generated:`, error)
      throw error
    }
  }
}