'use client'

import { useEffect, useState } from 'react'
import { vocabularyService } from '@/lib/api'

export default function TestWordsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const [sampleWords, setSampleWords] = useState<any[]>([])

  useEffect(() => {
    async function testWords() {
      try {
        console.log('🧪 Testing vocabularyService.getAll()...')
        
        const result = await vocabularyService.getAll(undefined, 10)
        
        console.log('✅ Result:', result)
        
        // 첫 번째 단어의 전체 구조를 콘솔에 출력
        if (result.words.length > 0) {
          console.log('📝 First word full structure:')
          console.log(JSON.stringify(result.words[0], null, 2))
        }
        
        setWordCount(result.words.length)
        setSampleWords(result.words.slice(0, 3))
        
      } catch (err) {
        console.error('❌ Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    testWords()
  }, [])

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Word Service Test</h1>
      
      {loading && <p>Loading...</p>}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}
      
      {!loading && !error && (
        <div>
          <p className="mb-4">Found <strong>{wordCount}</strong> words</p>
          
          <h2 className="text-xl font-semibold mb-2">Sample Words:</h2>
          <ul className="list-disc pl-6">
            {sampleWords.map((word, index) => (
              <li key={index} className="mb-2">
                <strong>{word.word}</strong> - {word.definitions?.[0]?.text || 'No definition'}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <p className="text-sm text-gray-600">Check browser console for detailed logs</p>
      </div>
    </div>
  )
}