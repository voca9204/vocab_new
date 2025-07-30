// Mock Dictionary Service for development/testing
export interface MockWordData {
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

export class MockDictionaryService {
  private getRandomDefinition(word: string): string {
    const templates = [
      `The act or state of ${word}ing`,
      `A person or thing that ${word}s`,
      `Relating to or characterized by ${word}`,
      `To perform the action of ${word}`,
      `The quality of being ${word}`,
      `Something that is ${word}`,
    ]
    return templates[Math.floor(Math.random() * templates.length)]
  }

  private getRandomExample(word: string): string {
    const templates = [
      `The ${word} was evident in the situation.`,
      `She decided to ${word} despite the challenges.`,
      `His ${word} nature made him popular.`,
      `They needed to ${word} the problem quickly.`,
      `The ${word} of the matter was clear.`,
    ]
    return templates[Math.floor(Math.random() * templates.length)]
  }

  private getRandomPartOfSpeech(): string {
    const parts = ['noun', 'verb', 'adjective', 'adverb']
    return parts[Math.floor(Math.random() * parts.length)]
  }

  async getWordData(word: string): Promise<MockWordData | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))

    // Return mock data
    return {
      word: word,
      phonetic: `/${word}/`,
      meanings: [
        {
          partOfSpeech: this.getRandomPartOfSpeech(),
          definitions: [
            {
              definition: this.getRandomDefinition(word),
              example: this.getRandomExample(word)
            }
          ],
          synonyms: ['similar', 'related', 'comparable'],
          antonyms: ['opposite', 'different', 'contrary']
        }
      ]
    }
  }
}

export default MockDictionaryService