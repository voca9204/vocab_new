'use client'

import { useState } from 'react'
import { doc, setDoc, writeBatch, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { useAuth } from '@/components/providers/auth-provider'

export default function CreateTestDataPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; url?: string } | null>(null)

  const createTestCollection = async () => {
    if (!user) {
      setResult({
        success: false,
        message: 'Please log in first to create test data'
      })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      console.log('Creating test photo vocabulary collection...')
      console.log('Current user ID:', user.uid)
      
      const testUserId = user.uid // Use current authenticated user
      const today = new Date()
      const dateStr = today.toISOString().split('T')[0] // YYYY-MM-DD
      
      // Test collection data
      const collectionId = 'Y0QXkvMribs5JshqzHFy' // Use the ID from the error log
      const collectionData = {
        id: collectionId,
        userId: testUserId,
        title: '테스트 사진 단어장',
        description: '5개 단어 추출',
        date: dateStr,
        photoUrl: 'https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=Test+Photo',
        thumbnailUrl: null,
        category: '테스트',
        source: null,
        tags: ['테스트', '예제'],
        totalWords: 5,
        studiedWords: 2,
        masteredWords: 1,
        accuracyRate: 80,
        firstStudiedAt: null,
        lastStudiedAt: Timestamp.fromDate(today),
        studyCount: 3,
        averageScore: 85,
        createdAt: Timestamp.fromDate(today),
        updatedAt: Timestamp.fromDate(today),
        isArchived: false
      }
      
      // Test words data
      const testWords = [
        {
          word: 'vocabulary',
          definition: '어휘, 단어집',
          context: 'Building vocabulary is essential for language learning.',
          studied: true,
          masteryLevel: 85
        },
        {
          word: 'collection',
          definition: '수집, 모음',
          context: 'This is a collection of important words.',
          studied: true,
          masteryLevel: 70
        },
        {
          word: 'definition',
          definition: '정의, 의미',
          context: 'Each word needs a clear definition.',
          studied: false,
          masteryLevel: 0
        },
        {
          word: 'context',
          definition: '맥락, 문맥',
          context: 'Understanding context helps with comprehension.',
          studied: false,
          masteryLevel: 0
        },
        {
          word: 'mastery',
          definition: '숙달, 정통',
          context: 'Achieving mastery requires consistent practice.',
          studied: false,
          masteryLevel: 0
        }
      ]
      
      // Create collection document
      await setDoc(doc(db, 'photo_vocabulary_collections', collectionId), collectionData)
      console.log('✅ Created collection:', collectionId)
      
      // Create word documents
      const batch = writeBatch(db)
      
      testWords.forEach((wordData, index) => {
        const wordId = `${collectionId}_word_${index + 1}`
        const wordDoc = {
          id: wordId,
          userId: testUserId,
          collectionId: collectionId,
          word: wordData.word,
          normalizedWord: wordData.word.toLowerCase(),
          definition: wordData.definition,
          context: wordData.context,
          position: null,
          pronunciation: null,
          difficulty: null,
          frequency: null,
          relatedWords: [],
          studyStatus: {
            studied: wordData.studied,
            masteryLevel: wordData.masteryLevel,
            reviewCount: wordData.studied ? 2 : 0,
            correctCount: wordData.studied ? 1 : 0,
            incorrectCount: wordData.studied ? 1 : 0,
            firstStudiedAt: wordData.studied ? Timestamp.fromDate(today) : null,
            lastStudiedAt: wordData.studied ? Timestamp.fromDate(today) : null,
            nextReviewAt: null
          },
          createdAt: Timestamp.fromDate(today),
          updatedAt: Timestamp.fromDate(today),
          isActive: true
        }
        
        const wordRef = doc(db, 'photo_vocabulary_words', wordId)
        batch.set(wordRef, wordDoc)
        console.log(`Creating word ${index + 1}:`, wordData.word)
      })
      
      await batch.commit()
      console.log('✅ Created', testWords.length, 'test words')
      
      setResult({
        success: true,
        message: `Test collection created successfully with ${testWords.length} words!`,
        url: `/study/photo-vocab/collections/${collectionId}`
      })
      
    } catch (error) {
      console.error('❌ Error creating test data:', error)
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Debug: Create Test Collection Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <div className="bg-green-50 border border-green-200 p-3 rounded-md">
              <p className="text-sm">
                <strong>✅ Authenticated as:</strong> {user.email}
                <br />
                <strong>User ID:</strong> <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{user.uid}</code>
              </p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 p-3 rounded-md">
              <p className="text-sm text-red-700">
                <strong>❌ Not authenticated.</strong> Please log in first.
              </p>
            </div>
          )}
          
          <p className="text-gray-600">
            This will create a test photo vocabulary collection with ID 'Y0QXkvMribs5JshqzHFy' 
            and 5 test words for debugging the permissions issue.
          </p>
          
          <Button 
            onClick={createTestCollection} 
            disabled={loading || !user}
            className="w-full"
          >
            {loading ? 'Creating...' : 'Create Test Collection'}
          </Button>
          
          {result && (
            <Alert className={result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
              <div className="text-sm">
                <strong>{result.success ? '✅ Success:' : '❌ Error:'}</strong>
                <div className="mt-1">{result.message}</div>
                {result.url && (
                  <div className="mt-2">
                    <a 
                      href={result.url} 
                      className="text-blue-600 underline hover:text-blue-800"
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Test Collection Detail Page →
                    </a>
                  </div>
                )}
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}